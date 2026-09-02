import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { PointerEventTypes } from "@babylonjs/core/Events/pointerEvents";
import "@babylonjs/core/Culling/ray";
import type { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { playerDefaults, ATTACK_COOLDOWN, SKILL_ATTACK_MULT, SKILL_COOLDOWN, SKILL_MP_COST, PLAYER_HEIGHT, PLAYER_RADIUS, INTERACT_RANGE, GROUND_Y } from "../data/player";
import {
  HRYAK_RADIUS,
  HRYAK_SPAWNS,
  MAX_HRYAKS,
  MAX_RYSKARS,
  RYSKAR_RADIUS,
  RYSKAR_SPAWNS,
} from "../data/monsters";
import { collidersFor, type Aabb2 } from "../data/colliders";
import { ANOMALIES } from "../data/decor";
import {
  ANOMALY_DAMAGE,
  RAD_CAMP,
  RAD_DOWN,
  RAD_EDGE,
  RAD_HP_DAMAGE,
  RAD_HP_TICK,
  RAD_MAX,
  RAD_UP,
} from "../data/atmosphere";
import { questById } from "../data/quests";
import {
  BOT_ATTACK_COOLDOWN,
  BOT_ATTACK_RANGE,
  BOT_HUNT_CHANCE,
  BOT_SPEED,
  BOT_THINK_DT,
} from "../data/fakePlayers";
import { randomPerimeterLine } from "../data/chat";
import { useGameStore } from "../state/gameStore";
import { setSavePosition } from "../state/save";
import {
  bindAutoTestFinish,
  finishAutoTest,
  isAutoTestRunning,
  startAutoTest as requestAutoTest,
} from "../debug/autoTest";
import { DEPOT_LOOKAT } from "../data/props";
import { MAX_REMOTE_STALKERS, POS_SEND_EPS, POS_SEND_INTERVAL, REMOTE_CATCHUP } from "../data/room";
import { createWorld, WORLD_SIZE } from "./createWorld";
import { applyKenneyDecor } from "./loadKenneyProps";
import { createPlayer } from "./createPlayer";
import { createRemoteStalker, disposeRemote, type RemoteActor } from "./createRemotes";
import {
  createHryak,
  createRyskar,
  disposeMonster,
  setMonsterSelected,
  type MonsterActor,
} from "./createMonsters";
import { createKefir, type NpcActor } from "./createNpcs";
import { createBots, type BotActor } from "./createBots";
import { cameraFlatBasis, createFollowCamera } from "./camera";
import { InputState, isTextInput } from "./input";
import { tickMovement, type JumpState } from "./systems/movement";
import { walkablePoint } from "./systems/collision";
import { sendPosWs } from "../api/ws";
import { moveToward, randomPatrolPoint } from "./systems/bots";
import { createColliderDebug, disposeColliderDebug } from "./createColliderDebug";
import {
  applyHit,
  inAttackRange,
  inMonsterMeleeRange,
  projectToScreen,
  rollDamage,
} from "./systems/combat";

const CLICK_DRAG_PX = 6;
const MAP_HZ = 0.125;
const MAP_PX = 140;
const WORLD_HALF = WORLD_SIZE / 2;
const HRYAK_RESPAWN = 6;

export class GameEngine {
  readonly engine: Engine;
  readonly scene: Scene;
  private readonly player: Mesh;
  private readonly ground: Mesh;
  private readonly sky: Mesh;
  private readonly anomalies: TransformNode;
  private readonly camera: ArcRotateCamera;
  private readonly input = new InputState();
  private readonly marker: Mesh;
  private readonly kefir: NpcActor;
  private readonly bots: BotActor[];
  private readonly remotes = new Map<string, RemoteActor>();
  private readonly monsters: MonsterActor[] = [];
  private colliders: readonly Aabb2[] = collidersFor("primitives");
  private colliderDebug: TransformNode | null = null;
  private collidersVisible = false;
  private readonly jump: JumpState = { vy: 0 };
  private selected: MonsterActor | null = null;
  private destination: Vector3 | null = null;
  private attackCooldown = 0;
  private skillCooldown = 0;
  private radHpAccum = 0;
  private readonly lootedAnomalies = new Set<string>();
  private fpsAccum = 0;
  private mapAccum = 0;
  private botThinkAccum = 0;
  private botThinkIndex = 0;
  private respawnLeft = HRYAK_RESPAWN;
  private autoStep = "";
  private chatterTimer = 0;
  private replyTimer = 0;
  private saveAccum = 0;
  private posAccum = 0;
  private lastSentX = Number.NaN;
  private lastSentZ = Number.NaN;
  private minimap: HTMLCanvasElement | null = null;
  private disposed = false;
  private leftDown: { x: number; y: number } | null = null;
  private readonly onResize: () => void;
  private readonly onKey: (e: KeyboardEvent) => void;
  private readonly onUnload: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: false,
      stencil: false,
      antialias: true,
      adaptToDeviceRatio: true,
    });
    this.scene = new Scene(this.engine);
    this.scene.skipPointerMovePicking = true;

    const world = createWorld(this.scene);
    this.ground = world.ground;
    this.sky = world.sky;
    this.anomalies = world.anomalies;
    void applyKenneyDecor(this.scene, world.primitiveDecor).then((kind) => {
      if (this.disposed) return;
      this.colliders = collidersFor(kind);
      if (this.colliderDebug || this.collidersVisible) this.rebuildColliderDebug();
      this.setPlayerXz(this.player.position.x, this.player.position.z);
      this.snapActors();
      const store = useGameStore.getState();
      if (kind === "packs") {
        store.addLog("[Система] Насыпь: паки Kenney.");
      } else {
        store.addLog("[Система] Насыпь: кубы (паки не встали).");
      }
    });
    const spawn = this.placeXz(
      useGameStore.getState().position.x,
      useGameStore.getState().position.z,
      PLAYER_RADIUS,
    );
    this.player = createPlayer(this.scene, spawn.x, spawn.z);
    this.camera = createFollowCamera(this.scene, canvas, this.player);

    this.marker = MeshBuilder.CreateDisc("dest", { radius: 0.45, tessellation: 16 }, this.scene);
    this.marker.rotation.x = Math.PI / 2;
    this.marker.position.y = 0.04;
    const markerMat = new StandardMaterial("destMat", this.scene);
    markerMat.diffuseColor = new Color3(0.85, 0.72, 0.22);
    markerMat.emissiveColor = new Color3(0.25, 0.2, 0.04);
    markerMat.disableLighting = true;
    this.marker.material = markerMat;
    this.marker.setEnabled(false);

    this.kefir = createKefir(this.scene);
    this.bots = createBots(this.scene);

    for (const spot of HRYAK_SPAWNS) {
      const at = this.placeXz(spot.x, spot.z, HRYAK_RADIUS);
      this.monsters.push(createHryak(this.scene, at.x, at.z));
    }
    for (const spot of RYSKAR_SPAWNS) {
      const at = this.placeXz(spot.x, spot.z, RYSKAR_RADIUS);
      this.monsters.push(createRyskar(this.scene, at.x, at.z));
    }

    this.input.attach();
    this.onKey = (e: KeyboardEvent) => {
      if (isTextInput(e.target)) return;
      if (e.repeat) return;
      const store = useGameStore.getState();
      if (e.code === "Escape") {
        if (store.dialogOpen) {
          store.setDialogOpen(false);
          return;
        }
        if (store.inventoryOpen) {
          store.setInventoryOpen(false);
        }
        return;
      }
      if (store.dialogOpen) return;
      if (e.code === "KeyM") {
        store.toggleMinimap();
        return;
      }
      if (e.code === "KeyI") {
        store.toggleInventory();
        return;
      }
      if (e.code === "Digit1" || e.code === "Numpad1") {
        this.attack();
      }
      if (e.code === "Digit2" || e.code === "Numpad2") {
        this.useSkill();
      }
      if (e.code === "Tab") {
        e.preventDefault();
        this.selectNearest();
      }
      if (e.code === "KeyF") {
        this.tryInteract();
      }
    };
    window.addEventListener("keydown", this.onKey);

    this.scene.onPointerObservable.add((info) => {
      if (this.disposed) return;
      const evt = info.event as PointerEvent;
      if (info.type === PointerEventTypes.POINTERDOWN && evt.button === 0) {
        this.leftDown = { x: evt.clientX, y: evt.clientY };
        return;
      }
      if (info.type !== PointerEventTypes.POINTERUP || evt.button !== 0) return;
      const start = this.leftDown;
      this.leftDown = null;
      if (!start) return;
      if (Math.hypot(evt.clientX - start.x, evt.clientY - start.y) > CLICK_DRAG_PX) {
        return;
      }
      if (useGameStore.getState().hp <= 0) return;
      const pick = this.scene.pick(
        this.scene.pointerX,
        this.scene.pointerY,
        (m) => m === this.ground,
      );
      if (pick?.hit && pick.pickedPoint) {
        const store = useGameStore.getState();
        if (store.autoEnabled) store.setAutoEnabled(false);
        const at = this.placeXz(pick.pickedPoint.x, pick.pickedPoint.z, PLAYER_RADIUS);
        this.destination = new Vector3(at.x, 0, at.z);
      }
    });

    this.scene.onBeforeRenderObservable.add(() => {
      if (this.disposed) return;
      const dt = Math.min(this.engine.getDeltaTime() / 1000, 0.05);
      this.attackCooldown = Math.max(0, this.attackCooldown - dt);
      this.skillCooldown = Math.max(0, this.skillCooldown - dt);
      const store = useGameStore.getState();
      if (store.autoEnabled && this.input.moving) {
        store.setAutoEnabled(false);
      }
      this.tickAuto();
      if (store.hp > 0) {
        this.destination = tickMovement(
          dt,
          this.player,
          this.camera,
          this.input,
          this.destination,
          this.marker,
          playerDefaults.moveSpeed,
          PLAYER_RADIUS,
          this.colliders,
          this.jump,
        );
      } else {
        this.destination = null;
        this.marker.setEnabled(false);
      }
      if (useGameStore.getState().autoEnabled) {
        this.marker.setEnabled(false);
      }
      this.camera.target.copyFrom(this.player.position);
      this.tickMonsterAttacks(dt);
      this.tickBots(dt);
      this.tickRemotes(dt);
      this.tickPosSend(dt);
      this.tickRespawn(dt);

      this.fpsAccum += dt;
      if (this.fpsAccum >= 0.25) {
        this.fpsAccum = 0;
        useGameStore.getState().setFps(this.engine.getFps());
      }
      this.mapAccum += dt;
      if (this.mapAccum >= MAP_HZ) {
        this.mapAccum = 0;
        this.drawMinimap();
        this.tickHazards();
      }
      this.saveAccum += dt;
      if (this.saveAccum >= 8) {
        this.saveAccum = 0;
        setSavePosition(this.player.position.x, this.player.position.z);
        useGameStore.getState().flushPersist();
      }
    });

    this.onResize = () => {
      this.engine.resize();
    };
    window.addEventListener("resize", this.onResize);
    this.onUnload = () => {
      setSavePosition(this.player.position.x, this.player.position.z);
      useGameStore.getState().flushPersist();
    };
    window.addEventListener("beforeunload", this.onUnload);
    bindAutoTestFinish((ok) => {
      if (this.disposed) return;
      const store = useGameStore.getState();
      store.setAutoEnabled(false);
      store.addLog(ok ? "[AUTO TEST] OK" : "[AUTO TEST] FAIL");
    });
    this.scheduleChatter();
  }

  start(): void {
    this.engine.runRenderLoop(() => {
      if (this.disposed) return;
      this.scene.render();
    });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.minimap = null;
    bindAutoTestFinish(null);
    window.clearTimeout(this.chatterTimer);
    window.clearTimeout(this.replyTimer);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("keydown", this.onKey);
    window.removeEventListener("beforeunload", this.onUnload);
    this.input.detach();
    disposeColliderDebug(this.colliderDebug);
    this.colliderDebug = null;
    this.clearRemotes();
    this.engine.stopRenderLoop();
    this.scene.dispose();
    this.engine.dispose();
  }

  healPlayer(): void {
    const store = useGameStore.getState();
    store.applyHeal();
    store.addLog("[Система] Здоровье и выносливость восстановлены.");
  }

  respawnAtCamp(): void {
    const store = useGameStore.getState();
    if (store.hp > 0) return;
    store.reviveAtCamp();
    this.setPlayerXz(this.kefir.mesh.position.x + 1.6, this.kefir.mesh.position.z);
    this.destination = null;
    const p = this.player.position;
    setSavePosition(p.x, p.z);
    store.setPosition(p.x, p.y, p.z);
    store.setToast(null);
    store.addLog("[Система] Очнулся у Кефира.");
  }

  attackTarget(): void {
    this.attack();
  }

  useSkill(): void {
    this.heavyStrike();
  }

  zeroRadiation(): void {
    useGameStore.getState().setRadiation(0);
    useGameStore.getState().addLog("[Система] Радиация сброшена.");
  }

  toggleSky(): void {
    const on = !this.sky.isEnabled();
    this.sky.setEnabled(on);
    useGameStore.getState().addLog(on ? "[Система] Купол вкл." : "[Система] Купол выкл.");
  }

  toggleAnomalies(): void {
    const on = !this.anomalies.isEnabled();
    this.anomalies.setEnabled(on);
    useGameStore.getState().addLog(on ? "[Система] Аномалии вкл." : "[Система] Аномалии выкл.");
  }

  toggleColliders(): void {
    this.collidersVisible = !this.collidersVisible;
    if (!this.colliderDebug) this.rebuildColliderDebug();
    this.colliderDebug?.setEnabled(this.collidersVisible);
    useGameStore.getState().addLog(
      this.collidersVisible ? "[Система] Коллайдеры вкл." : "[Система] Коллайдеры выкл.",
    );
  }

  private rebuildColliderDebug(): void {
    disposeColliderDebug(this.colliderDebug);
    this.colliderDebug = createColliderDebug(this.scene, this.colliders);
    this.colliderDebug.setEnabled(this.collidersVisible);
  }

  private placeXz(x: number, z: number, radius: number): { x: number; z: number } {
    return walkablePoint(x, z, radius, this.colliders);
  }

  private setPlayerXz(x: number, z: number): void {
    const at = this.placeXz(x, z, PLAYER_RADIUS);
    this.player.position.x = at.x;
    this.player.position.z = at.z;
    this.player.position.y = GROUND_Y;
    this.jump.vy = 0;
  }

  private snapActors(): void {
    for (const bot of this.bots) {
      const at = this.placeXz(bot.mesh.position.x, bot.mesh.position.z, PLAYER_RADIUS);
      bot.mesh.position.x = at.x;
      bot.mesh.position.z = at.z;
    }
    for (const monster of this.monsters) {
      const at = this.placeXz(monster.mesh.position.x, monster.mesh.position.z, HRYAK_RADIUS);
      monster.mesh.position.x = at.x;
      monster.mesh.position.z = at.z;
    }
  }

  applyRemotePresence(name: string, online: boolean, x?: number, z?: number): void {
    if (this.disposed) return;
    const n = name.trim();
    if (!n || n === useGameStore.getState().name) return;
    if (!online) {
      const cur = this.remotes.get(n);
      if (cur) {
        disposeRemote(cur);
        this.remotes.delete(n);
      }
      return;
    }
    const spawnX = Number.isFinite(x) ? (x as number) : 0;
    const spawnZ = Number.isFinite(z) ? (z as number) : 0;
    const existing = this.remotes.get(n);
    if (existing) {
      existing.destX = spawnX;
      existing.destZ = spawnZ;
      return;
    }
    if (this.remotes.size >= MAX_REMOTE_STALKERS) return;
    this.remotes.set(n, createRemoteStalker(this.scene, n, spawnX, spawnZ));
  }

  applyRemotePos(name: string, x: number, z: number): void {
    if (this.disposed) return;
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    const n = name.trim();
    if (!n || n === useGameStore.getState().name) return;
    let actor = this.remotes.get(n);
    if (!actor) {
      if (this.remotes.size >= MAX_REMOTE_STALKERS) return;
      actor = createRemoteStalker(this.scene, n, x, z);
      this.remotes.set(n, actor);
      return;
    }
    actor.destX = x;
    actor.destZ = z;
  }

  clearRemotes(): void {
    for (const actor of this.remotes.values()) {
      disposeRemote(actor);
    }
    this.remotes.clear();
  }

  private tickRemotes(dt: number): void {
    const step = REMOTE_CATCHUP * dt;
    for (const actor of this.remotes.values()) {
      const dx = actor.destX - actor.mesh.position.x;
      const dz = actor.destZ - actor.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.05) continue;
      const t = Math.min(1, step / dist);
      actor.mesh.position.x += dx * t;
      actor.mesh.position.z += dz * t;
      actor.mesh.rotation.y = Math.atan2(dx, dz);
    }
  }

  private tickPosSend(dt: number): void {
    this.posAccum += dt;
    if (this.posAccum < POS_SEND_INTERVAL) return;
    this.posAccum = 0;
    const x = this.player.position.x;
    const z = this.player.position.z;
    if (
      Number.isFinite(this.lastSentX) &&
      Math.hypot(x - this.lastSentX, z - this.lastSentZ) < POS_SEND_EPS
    ) {
      return;
    }
    if (!sendPosWs(x, z)) return;
    this.lastSentX = x;
    this.lastSentZ = z;
  }

  levelUp(): void {
    useGameStore.getState().applyLevelUp();
  }

  teleportForward(): void {
    const { forward } = cameraFlatBasis(this.camera);
    this.setPlayerXz(this.player.position.x + forward.x * 8, this.player.position.z + forward.z * 8);
    this.destination = null;
    const p = this.player.position;
    setSavePosition(p.x, p.z);
    useGameStore.getState().setPosition(p.x, p.y, p.z);
    useGameStore.getState().addLog("[Система] Смещение вперёд.");
  }

  teleportToQuestTarget(): void {
    const t = this.questTarget();
    if (!t) {
      useGameStore.getState().addLog("[Система] Нет цели заказа.");
      return;
    }
    this.setPlayerXz(t.x + 1.6, t.z);
    this.destination = null;
    const p = this.player.position;
    setSavePosition(p.x, p.z);
    useGameStore.getState().setPosition(p.x, p.y, p.z);
    useGameStore.getState().addLog("[Система] Смещение к цели заказа.");
  }

  teleportToDepot(): void {
    this.setPlayerXz(DEPOT_LOOKAT.x, DEPOT_LOOKAT.z);
    this.destination = null;
    const p = this.player.position;
    setSavePosition(p.x, p.z);
    useGameStore.getState().setPosition(p.x, p.y, p.z);
    useGameStore.getState().addLog("[Система] Смещение к депо.");
  }

  syncSavePosition(): void {
    const p = this.player.position;
    setSavePosition(p.x, p.z);
    useGameStore.getState().setPositionSilent(p.x, p.y, p.z);
  }

  applySavedPosition(): void {
    const p = useGameStore.getState().position;
    this.setPlayerXz(p.x, p.z);
    this.destination = null;
    setSavePosition(this.player.position.x, this.player.position.z);
  }

  startAutoTest(): void {
    requestAutoTest(() => {
      const store = useGameStore.getState();
      store.applyHeal();
      store.resetQuestForTest();
      store.addLog("[AUTO TEST] Старт.");
      store.setAutoEnabled(true);
    });
  }

  spawnMonster(): void {
    const n = this.monsters.filter((m) => m.kind === "hryak").length;
    if (n >= MAX_HRYAKS) {
      useGameStore.getState().addLog("[Система] Хватит хряков.");
      return;
    }
    const p = this.player.position;
    const { forward } = cameraFlatBasis(this.camera);
    const at = this.placeXz(p.x + forward.x * 6, p.z + forward.z * 6, HRYAK_RADIUS);
    this.monsters.push(createHryak(this.scene, at.x, at.z));
    useGameStore.getState().addLog("[Система] Хряк появился.");
  }

  spawnRyskar(): void {
    const n = this.monsters.filter((m) => m.kind === "ryskar").length;
    if (n >= MAX_RYSKARS) {
      useGameStore.getState().addLog("[Система] Хватит рыскарей.");
      return;
    }
    const p = this.player.position;
    const { forward } = cameraFlatBasis(this.camera);
    const at = this.placeXz(p.x + forward.x * 6, p.z + forward.z * 6, RYSKAR_RADIUS);
    this.monsters.push(createRyskar(this.scene, at.x, at.z));
    useGameStore.getState().addLog("[Система] Рыскарь появился.");
  }

  notePlayerChat(): void {
    if (this.disposed) return;
    window.clearTimeout(this.replyTimer);
    this.replyTimer = window.setTimeout(() => {
      if (this.disposed) return;
      this.botChatter();
    }, 1000 + Math.random() * 1000);
  }

  setMinimapCanvas(canvas: HTMLCanvasElement | null): void {
    this.minimap = canvas;
    if (canvas) {
      canvas.width = MAP_PX;
      canvas.height = MAP_PX;
      this.drawMinimap();
    }
  }

  private scheduleChatter(): void {
    if (this.disposed) return;
    this.chatterTimer = window.setTimeout(() => {
      if (this.disposed) return;
      this.botChatter();
      this.scheduleChatter();
    }, 8000 + Math.random() * 6000);
  }

  private botChatter(): void {
    const bot = this.bots[Math.floor(Math.random() * this.bots.length)];
    if (!bot) return;
    useGameStore.getState().addRadio("perimeter", randomPerimeterLine(), bot.name);
  }

  private autoLog(step: string, text: string): void {
    if (this.autoStep === step) return;
    this.autoStep = step;
    useGameStore.getState().addLog(text);
  }

  private walkTo(x: number, z: number): number {
    const at = this.placeXz(x, z, PLAYER_RADIUS);
    this.destination = new Vector3(at.x, 0, at.z);
    const dx = this.player.position.x - x;
    const dz = this.player.position.z - z;
    return Math.hypot(dx, dz);
  }

  private tickAuto(): void {
    const store = useGameStore.getState();
    if (!store.autoEnabled) {
      this.autoStep = "";
      if (isAutoTestRunning()) finishAutoTest(false);
      return;
    }
    if (store.hp <= 0) {
      store.setAutoEnabled(false);
      if (isAutoTestRunning()) finishAutoTest(false);
      return;
    }
    const quest = store.quest;
    if (quest.status !== "active") {
      const d = this.walkTo(this.kefir.mesh.position.x, this.kefir.mesh.position.z);
      this.autoLog("toKefirAccept", "[Авто] Иду к Кефиру.");
      if (d <= INTERACT_RANGE) {
        store.acceptQuest();
      }
      return;
    }
    if (quest.progress >= questById(quest.id).required) {
      const d = this.walkTo(this.kefir.mesh.position.x, this.kefir.mesh.position.z);
      this.autoLog("toKefirTurnin", "[Авто] Сдаю заказ.");
      if (d <= INTERACT_RANGE) {
        store.turnInQuest();
      }
      return;
    }
    const def = questById(quest.id);
    if (def.type === "fetch") {
      const a = this.nearestLootableAnomaly();
      if (!a) {
        this.autoLog("noShard", "[Авто] Нет осколка.");
        return;
      }
      const d = this.walkTo(a.x, a.z);
      this.autoLog("toAnomaly", "[Авто] Иду к сфере.");
      if (d <= INTERACT_RANGE + a.r) {
        this.tryLootAnomaly();
      }
      return;
    }
    const prey = this.nearestMonsterForQuest();
    if (!prey) {
      this.destination = null;
      this.autoLog("noPrey", "[Авто] Нет цели.");
      return;
    }
    if (this.selected !== prey) {
      this.setSelected(prey);
    }
    const d = this.walkTo(prey.mesh.position.x, prey.mesh.position.z);
    if (d <= 2.5) {
      this.autoLog("attack", "[Авто] Бью.");
      this.attack();
    } else {
      this.autoLog("hunt", `[Авто] Цель: ${prey.name}.`);
    }
  }

  private tickBots(dt: number): void {
    this.botThinkAccum += dt;
    if (this.botThinkAccum >= BOT_THINK_DT) {
      this.botThinkAccum = 0;
      const bot = this.bots[this.botThinkIndex % this.bots.length];
      this.botThinkIndex += 1;
      if (bot) this.thinkBot(bot);
    }
    for (const bot of this.bots) {
      bot.attackCooldownLeft = Math.max(0, bot.attackCooldownLeft - dt);
      bot.pauseLeft = Math.max(0, bot.pauseLeft - dt);
      if (bot.hunting) {
        const prey = this.nearestMonsterTo(bot.mesh.position.x, bot.mesh.position.z);
        if (!prey) {
          bot.hunting = false;
          bot.pauseLeft = 1 + Math.random() * 1.5;
          continue;
        }
        bot.destX = prey.mesh.position.x;
        bot.destZ = prey.mesh.position.z;
        const dx = bot.mesh.position.x - prey.mesh.position.x;
        const dz = bot.mesh.position.z - prey.mesh.position.z;
        if (Math.hypot(dx, dz) <= BOT_ATTACK_RANGE) {
          if (bot.attackCooldownLeft <= 0) {
            bot.attackCooldownLeft = BOT_ATTACK_COOLDOWN;
            applyHit(prey, rollDamage(6));
            if (prey.hp <= 0) {
              this.removeMonster(prey, false);
              bot.hunting = false;
              bot.pauseLeft = 1 + Math.random() * 2;
            }
          }
        } else {
          moveToward(bot.mesh, bot.destX, bot.destZ, BOT_SPEED, dt, PLAYER_RADIUS, this.colliders);
        }
        continue;
      }
      if (bot.pauseLeft > 0) continue;
      const arrived = moveToward(
        bot.mesh,
        bot.destX,
        bot.destZ,
        BOT_SPEED,
        dt,
        PLAYER_RADIUS,
        this.colliders,
      );
      if (arrived) {
        bot.pauseLeft = 1 + Math.random() * 2;
      }
    }
  }

  private thinkBot(bot: BotActor): void {
    if (bot.pauseLeft > 0) return;
    if (bot.hunting) return;
    if (this.monsters.length > 0 && Math.random() < BOT_HUNT_CHANCE) {
      bot.hunting = true;
      return;
    }
    const p = randomPatrolPoint(PLAYER_RADIUS, this.colliders);
    bot.destX = p.x;
    bot.destZ = p.z;
  }

  private tickRespawn(dt: number): void {
    this.respawnLeft -= dt;
    if (this.respawnLeft > 0) return;
    this.respawnLeft = HRYAK_RESPAWN;
    const hryaks = this.monsters.filter((m) => m.kind === "hryak").length;
    if (hryaks < MAX_HRYAKS) {
      const spot = HRYAK_SPAWNS.find((s) =>
        this.monsters.every(
          (m) => Math.hypot(m.mesh.position.x - s.x, m.mesh.position.z - s.z) > 2.5,
        ),
      );
      const at = spot ?? HRYAK_SPAWNS[0];
      if (at) {
        const pos = this.placeXz(at.x, at.z, HRYAK_RADIUS);
        this.monsters.push(createHryak(this.scene, pos.x, pos.z));
      }
      return;
    }
    const ryskars = this.monsters.filter((m) => m.kind === "ryskar").length;
    if (ryskars < MAX_RYSKARS) {
      const spot = RYSKAR_SPAWNS.find((s) =>
        this.monsters.every(
          (m) => Math.hypot(m.mesh.position.x - s.x, m.mesh.position.z - s.z) > 2.5,
        ),
      );
      const at = spot ?? RYSKAR_SPAWNS[0];
      if (!at) return;
      const pos = this.placeXz(at.x, at.z, RYSKAR_RADIUS);
      this.monsters.push(createRyskar(this.scene, pos.x, pos.z));
    }
  }

  private worldToMap(x: number, z: number): { u: number; v: number } {
    return {
      u: ((x + WORLD_HALF) / WORLD_SIZE) * MAP_PX,
      v: ((WORLD_HALF - z) / WORLD_SIZE) * MAP_PX,
    };
  }

  private drawDot(
    ctx: CanvasRenderingContext2D,
    x: number,
    z: number,
    color: string,
    radius: number,
  ): void {
    const { u, v } = this.worldToMap(x, z);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(u, v, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  questTarget(): { x: number; z: number } | null {
    const kefir = this.kefir.mesh.position;
    const quest = useGameStore.getState().quest;
    const def = questById(quest.id);
    if (quest.status === "active" && quest.progress < def.required) {
      if (def.type === "fetch") {
        const a = ANOMALIES[0];
        if (!a) return { x: kefir.x, z: kefir.z };
        return { x: a.x, z: a.z };
      }
      const nearest = this.nearestMonsterForQuest();
      if (!nearest) return null;
      return { x: nearest.mesh.position.x, z: nearest.mesh.position.z };
    }
    return { x: kefir.x, z: kefir.z };
  }

  private drawMinimap(): void {
    const canvas = this.minimap;
    if (!canvas || this.disposed) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#1c2016";
    ctx.fillRect(0, 0, MAP_PX, MAP_PX);
    ctx.strokeStyle = "#6b5a32";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, MAP_PX - 2, MAP_PX - 2);

    for (const bot of this.bots) {
      this.drawDot(ctx, bot.mesh.position.x, bot.mesh.position.z, "#6a6e52", 2.5);
    }
    for (const m of this.monsters) {
      const color = m.kind === "ryskar" ? "#8a7a32" : "#b33a2e";
      this.drawDot(ctx, m.mesh.position.x, m.mesh.position.z, color, 3);
    }

    const kefir = this.kefir.mesh.position;
    this.drawDot(ctx, kefir.x, kefir.z, "#d4c04a", 3.5);

    const t = this.questTarget();
    if (t) {
      const { u, v } = this.worldToMap(t.x, t.z);
      ctx.strokeStyle = "#4cce5a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(u, v, 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    const p = this.player.position;
    this.drawDot(ctx, p.x, p.z, "#f4f0e4", 4);
  }

  private tickMonsterAttacks(dt: number): void {
    for (const monster of this.monsters) {
      monster.attackCooldownLeft = Math.max(0, monster.attackCooldownLeft - dt);
      if (monster.attackCooldownLeft > 0) continue;
      if (!inMonsterMeleeRange(this.player, monster)) continue;
      monster.attackCooldownLeft = monster.attackCooldown;
      const store = useGameStore.getState();
      if (store.hp <= 0) continue;
      const dmg = rollDamage(monster.attack);
      const downed = store.applyPlayerDamage(dmg);
      store.addCombat(`[Бой] ${monster.name} нанёс ${dmg} урона.`);
      const head = this.player.position.add(new Vector3(0, PLAYER_HEIGHT, 0));
      const screen = projectToScreen(this.scene, this.engine, head);
      if (screen) {
        store.addDamageNumber({ value: dmg, left: screen.left, top: screen.top });
      }
      if (downed) {
        store.addLog("[Система] Новичок без сознания.");
        store.setToast("Без сознания");
        if (store.autoEnabled) store.setAutoEnabled(false);
      }
    }
  }

  private tryInteract(): void {
    const store = useGameStore.getState();
    if (store.hp <= 0) return;
    if (this.tryLootAnomaly()) return;
    const dx = this.player.position.x - this.kefir.mesh.position.x;
    const dz = this.player.position.z - this.kefir.mesh.position.z;
    if (Math.hypot(dx, dz) > INTERACT_RANGE) {
      store.addLog("[Система] Подойдите ближе.");
      return;
    }
    store.setInventoryOpen(false);
    store.setDialogOpen(true);
  }

  private selectNearest(): void {
    const nearest = this.nearestMonster();
    if (!nearest) {
      this.setSelected(null);
      useGameStore.getState().addCombat("[Бой] Нет живых мутантов.");
      return;
    }
    this.setSelected(nearest);
    useGameStore.getState().addCombat(`[Бой] Цель: ${nearest.name}.`);
  }

  private nearestMonster(): MonsterActor | null {
    return this.nearestMonsterTo(this.player.position.x, this.player.position.z);
  }

  private nearestMonsterForQuest(): MonsterActor | null {
    const def = questById(useGameStore.getState().quest.id);
    const px = this.player.position.x;
    const pz = this.player.position.z;
    let best: MonsterActor | null = null;
    let bestD = Infinity;
    for (const m of this.monsters) {
      if (def.type === "kill" && m.kind !== def.target) continue;
      const d = Math.hypot(m.mesh.position.x - px, m.mesh.position.z - pz);
      if (d < bestD) {
        bestD = d;
        best = m;
      }
    }
    return best;
  }

  private nearestLootableAnomaly(): (typeof ANOMALIES)[number] | null {
    let best: (typeof ANOMALIES)[number] | null = null;
    let bestD = Infinity;
    const px = this.player.position.x;
    const pz = this.player.position.z;
    for (const a of ANOMALIES) {
      if (this.lootedAnomalies.has(a.id)) continue;
      const d = Math.hypot(px - a.x, pz - a.z);
      if (d < bestD) {
        bestD = d;
        best = a;
      }
    }
    return best;
  }

  private nearestMonsterTo(px: number, pz: number): MonsterActor | null {
    let best: MonsterActor | null = null;
    let bestD = Infinity;
    for (const m of this.monsters) {
      const d = Math.hypot(m.mesh.position.x - px, m.mesh.position.z - pz);
      if (d < bestD) {
        bestD = d;
        best = m;
      }
    }
    return best;
  }

  private setSelected(monster: MonsterActor | null): void {
    if (this.selected) {
      setMonsterSelected(this.selected, false);
    }
    this.selected = monster;
    if (monster) {
      setMonsterSelected(monster, true);
    }
    this.syncTarget();
  }

  private attack(): void {
    const store = useGameStore.getState();
    if (store.hp <= 0) return;
    if (this.attackCooldown > 0) return;
    const monster = this.selected;
    if (!monster) {
      store.addCombat("[Бой] Нет цели. Нажмите Tab.");
      return;
    }
    if (!inAttackRange(this.player, monster)) {
      store.addCombat(`[Бой] ${monster.name} слишком далеко.`);
      return;
    }
    this.attackCooldown = ATTACK_COOLDOWN;
    const dmg = rollDamage(store.attack);
    applyHit(monster, dmg);
    store.addCombat(`[Бой] ${monster.name} получил ${dmg} урона.`);
    this.syncTarget();

    const head = monster.mesh.position.add(new Vector3(0, 1.4, 0));
    const screen = projectToScreen(this.scene, this.engine, head);
    if (screen) {
      store.addDamageNumber({ value: dmg, left: screen.left, top: screen.top });
    }

    if (monster.hp <= 0) {
      store.addCombat(`[Бой] ${monster.name} пал.`);
      this.removeMonster(monster, true);
    }
  }

  private heavyStrike(): void {
    const store = useGameStore.getState();
    if (store.hp <= 0) return;
    if (this.skillCooldown > 0) {
      store.addCombat("[Бой] Приём ещё не готов.");
      return;
    }
    const monster = this.selected;
    if (!monster) {
      store.addCombat("[Бой] Нет цели. Нажмите Tab.");
      return;
    }
    if (!inAttackRange(this.player, monster)) {
      store.addCombat(`[Бой] ${monster.name} слишком далеко.`);
      return;
    }
    if (!store.spendMp(SKILL_MP_COST)) {
      store.addCombat("[Бой] Мало выносливости.");
      return;
    }
    this.skillCooldown = SKILL_COOLDOWN;
    const dmg = rollDamage(Math.round(store.attack * SKILL_ATTACK_MULT));
    applyHit(monster, dmg);
    store.addCombat(`[Бой] Тяжёлый удар: ${monster.name} ${dmg}.`);
    this.syncTarget();
    const head = monster.mesh.position.add(new Vector3(0, 1.4, 0));
    const screen = projectToScreen(this.scene, this.engine, head);
    if (screen) {
      store.addDamageNumber({ value: dmg, left: screen.left, top: screen.top });
    }
    if (monster.hp <= 0) {
      store.addCombat(`[Бой] ${monster.name} пал.`);
      this.removeMonster(monster, true);
    }
  }

  private removeMonster(monster: MonsterActor, loot: boolean): void {
    const store = useGameStore.getState();
    if (loot) {
      store.grantExp(monster.expReward);
      if (monster.kind === "hryak") {
        store.addItem("hryak_meat");
      }
      store.addKillProgress(monster.kind);
    }
    const idx = this.monsters.indexOf(monster);
    if (idx >= 0) this.monsters.splice(idx, 1);
    if (this.selected === monster) {
      this.setSelected(null);
    }
    disposeMonster(monster);
  }

  private tryLootAnomaly(): boolean {
    if (!this.anomalies.isEnabled()) {
      return false;
    }
    const px = this.player.position.x;
    const pz = this.player.position.z;
    for (const a of ANOMALIES) {
      if (this.lootedAnomalies.has(a.id)) continue;
      if (Math.hypot(px - a.x, pz - a.z) > INTERACT_RANGE + a.r) continue;
      this.lootedAnomalies.add(a.id);
      useGameStore.getState().addItem("oskolok");
      return true;
    }
    return false;
  }

  private tickHazards(): void {
    const store = useGameStore.getState();
    if (store.hp <= 0) return;
    const px = this.player.position.x;
    const pz = this.player.position.z;
    if (this.anomalies.isEnabled()) {
      for (const a of ANOMALIES) {
        if (Math.hypot(px - a.x, pz - a.z) <= a.r + PLAYER_RADIUS) {
          const downed = store.applyPlayerDamage(ANOMALY_DAMAGE);
          if (downed) {
            store.addLog("[Система] Новичок без сознания.");
            store.setToast("Без сознания");
            if (store.autoEnabled) store.setAutoEnabled(false);
          }
          break;
        }
      }
    }
    const edge = Math.max(Math.abs(px), Math.abs(pz));
    const camp = Math.hypot(px, pz);
    let rad = store.radiation;
    if (edge >= RAD_EDGE) rad += RAD_UP;
    else if (camp <= RAD_CAMP) rad -= RAD_DOWN;
    else rad -= 1;
    rad = Math.max(0, Math.min(RAD_MAX, rad));
    store.setRadiation(rad);
    if (rad >= RAD_MAX) {
      this.radHpAccum += MAP_HZ;
      if (this.radHpAccum >= RAD_HP_TICK) {
        this.radHpAccum = 0;
        const downed = store.applyPlayerDamage(RAD_HP_DAMAGE);
        if (downed) {
          store.addLog("[Система] Новичок без сознания.");
          store.setToast("Без сознания");
          if (store.autoEnabled) store.setAutoEnabled(false);
        }
      }
    } else {
      this.radHpAccum = 0;
    }
  }

  private syncTarget(): void {
    const m = this.selected;
    if (!m) {
      useGameStore.getState().setTarget(null);
      return;
    }
    useGameStore.getState().setTarget({
      name: m.name,
      level: m.level,
      hp: m.hp,
      maxHp: m.maxHp,
    });
  }
}
