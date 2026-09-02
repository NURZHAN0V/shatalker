import { create } from "zustand";
import { playerDefaults } from "../data/player";
import { killHryaksQuest } from "../data/quests";
import { items, type ItemId } from "../data/items";
import { loadSave, scheduleSave, flushSave, setSavePosition, getSavePosition, type SavePayload } from "./save";
import { onQuestTurnedIn } from "../debug/autoTest";
import { getGameApi } from "../debug/gmCommands";
import {
  apiAcceptQuest,
  apiCompleteQuest,
  apiPostChat,
  apiPutSave,
  apiUseItem,
  isLoggedIn,
  setToken,
  type ServerSnapshot,
} from "../api/client";
import { sendPerimeterWs } from "../api/ws";

export type QuestStatus = "available" | "active" | "completed";

export type QuestState = {
  id: string;
  status: QuestStatus;
  progress: number;
};

export type RadioChannel = "system" | "perimeter" | "combat";

export type RadioLine = {
  id: number;
  channel: RadioChannel;
  from: string | null;
  text: string;
};

export type DamageFloater = {
  id: number;
  value: number;
  left: number;
  top: number;
};

export type TargetInfo = {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
};

type GameStore = {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  exp: number;
  expToNext: number;
  attack: number;
  position: { x: number; y: number; z: number };
  fps: number;
  showFps: boolean;
  radio: RadioLine[];
  toast: string | null;
  target: TargetInfo | null;
  damageNumbers: DamageFloater[];
  dialogOpen: boolean;
  inventoryOpen: boolean;
  autoEnabled: boolean;
  quest: QuestState;
  inventory: Record<ItemId, number>;
  setFps: (fps: number) => void;
  setShowFps: (show: boolean) => void;
  setPosition: (x: number, y: number, z: number) => void;
  setTarget: (target: TargetInfo | null) => void;
  addLog: (text: string) => void;
  addCombat: (text: string) => void;
  addRadio: (channel: RadioChannel, text: string, from?: string | null) => void;
  sendPerimeter: (text: string) => void;
  setAutoEnabled: (on: boolean) => void;
  addDamageNumber: (floater: Omit<DamageFloater, "id">) => void;
  removeDamageNumber: (id: number) => void;
  setToast: (text: string | null) => void;
  setPlayerVitals: (hp: number, mp: number) => void;
  applyHeal: () => void;
  applyPlayerDamage: (amount: number) => boolean;
  grantExp: (amount: number) => void;
  applyLevelUp: () => void;
  syncAttack: (attack: number) => void;
  setDialogOpen: (open: boolean) => void;
  setInventoryOpen: (open: boolean) => void;
  toggleInventory: () => void;
  acceptQuest: () => void;
  addKillProgress: () => void;
  turnInQuest: () => boolean;
  completeCurrentQuest: () => void;
  addItem: (id: ItemId, amount?: number) => void;
  useItem: (id: ItemId) => void;
  resetQuestForTest: () => void;
  flushPersist: () => Promise<void>;
  apiAuthed: boolean;
  wsConnected: boolean;
  setWsConnected: (on: boolean) => void;
  onlineNames: string[];
  applyPresence: (name: string, online: boolean) => void;
  clearOnline: () => void;
  hydrateFromServer: (snap: import("../api/client").ServerSnapshot) => void;
  loginSession: (token: string, snap: import("../api/client").ServerSnapshot) => void;
  logoutSession: () => void;
  setPositionSilent: (x: number, y: number, z: number) => void;
};

let radioSeq = 1;
let floaterSeq = 1;

const MAX_RADIO = 40;
const MAX_FLOATERS = 12;

const saved = loadSave();

function savePayload(s: {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  exp: number;
  expToNext: number;
  attack: number;
  quest: QuestState;
  inventory: Record<ItemId, number>;
}): SavePayload {
  return {
    name: s.name,
    level: s.level,
    hp: s.hp,
    maxHp: s.maxHp,
    mp: s.mp,
    maxMp: s.maxMp,
    exp: s.exp,
    expToNext: s.expToNext,
    attack: s.attack,
    quest: s.quest,
    inventory: s.inventory,
  };
}

function toServerSnapshot(s: {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  exp: number;
  expToNext: number;
  attack: number;
  position: { x: number; y: number; z: number };
  quest: QuestState;
  inventory: Record<ItemId, number>;
}): ServerSnapshot {
  const pos = getSavePosition();
  return {
    name: s.name,
    level: s.level,
    hp: s.hp,
    maxHp: s.maxHp,
    mp: s.mp,
    maxMp: s.maxMp,
    exp: s.exp,
    expToNext: s.expToNext,
    attack: s.attack,
    position: { x: pos.x, y: s.position.y, z: pos.z },
    quest: s.quest,
    inventory: {
      medkit_small: s.inventory.medkit_small ?? 0,
      hryak_meat: s.inventory.hryak_meat ?? 0,
    },
  };
}

function bagFrom(snap: ServerSnapshot): Record<ItemId, number> {
  return {
    medkit_small: Math.max(0, Math.floor(snap.inventory.medkit_small ?? 0)),
    hryak_meat: Math.max(0, Math.floor(snap.inventory.hryak_meat ?? 0)),
  };
}

export const useGameStore = create<GameStore>((set, get) => {
  const persist = () => {
    scheduleSave(savePayload(get()));
  };

  return {
  name: saved?.name ?? playerDefaults.name,
  level: saved?.level ?? playerDefaults.level,
  hp: saved?.hp ?? playerDefaults.hp,
  maxHp: saved?.maxHp ?? playerDefaults.maxHp,
  mp: saved?.mp ?? playerDefaults.mp,
  maxMp: saved?.maxMp ?? playerDefaults.maxMp,
  exp: saved?.exp ?? playerDefaults.exp,
  expToNext: saved?.expToNext ?? playerDefaults.expToNext,
  attack: saved?.attack ?? playerDefaults.attack,
  position: { x: saved?.x ?? 0, y: 0, z: saved?.z ?? 0 },
  fps: 0,
  showFps: true,
  radio: [
    {
      id: 0,
      channel: "system",
      from: null,
      text: "[Система] Вылазка начата.",
    },
  ],
  toast: null,
  target: null,
  damageNumbers: [],
  dialogOpen: false,
  inventoryOpen: false,
  autoEnabled: false,
  quest: saved?.quest ?? {
    id: killHryaksQuest.id,
    status: "available",
    progress: 0,
  },
  inventory: saved?.inventory ?? { medkit_small: 0, hryak_meat: 0 },
  apiAuthed: isLoggedIn(),
  wsConnected: false,
  onlineNames: [],

  setFps: (fps) => {
    if (Math.abs(get().fps - fps) < 0.5) return;
    set({ fps });
  },
  setShowFps: (showFps) => set({ showFps }),
  setPosition: (x, y, z) => {
    set({ position: { x, y, z } });
    persist();
  },
  setPositionSilent: (x, y, z) => set({ position: { x, y, z } }),
  setTarget: (target) => set({ target }),
  addRadio: (channel, text, from = null) =>
    set((s) => ({
      radio: [...s.radio, { id: radioSeq++, channel, from, text }].slice(
        -MAX_RADIO,
      ),
    })),
  addLog: (text) => {
    get().addRadio("system", text);
  },
  addCombat: (text) => {
    get().addRadio("combat", text);
  },
  sendPerimeter: (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (sendPerimeterWs(trimmed)) return;
    get().addRadio("perimeter", trimmed, get().name);
    if (isLoggedIn()) {
      void apiPostChat("perimeter", trimmed).catch(() => {
        get().addLog("[API] Рация не ушла на сервер.");
      });
    }
  },
  setWsConnected: (on) => {
    if (get().wsConnected === on) return;
    set({ wsConnected: on });
  },
  applyPresence: (name, online) => {
    const n = name.trim();
    if (!n) return;
    const cur = get().onlineNames;
    const has = cur.includes(n);
    if (online && !has) set({ onlineNames: [...cur, n] });
    if (!online && has) set({ onlineNames: cur.filter((x) => x !== n) });
  },
  clearOnline: () => {
    if (get().onlineNames.length === 0) return;
    set({ onlineNames: [] });
  },
  setAutoEnabled: (on) => {
    const was = get().autoEnabled;
    if (was === on) return;
    set({ autoEnabled: on });
    get().addLog(on ? "[Авто] Включён." : "[Авто] Выключен.");
  },
  addDamageNumber: (floater) => {
    const id = floaterSeq++;
    set((s) => ({
      damageNumbers: [{ ...floater, id }, ...s.damageNumbers].slice(
        0,
        MAX_FLOATERS,
      ),
    }));
    window.setTimeout(() => {
      get().removeDamageNumber(id);
    }, 800);
  },
  removeDamageNumber: (id) =>
    set((s) => ({
      damageNumbers: s.damageNumbers.filter((n) => n.id !== id),
    })),
  setToast: (toast) => set({ toast }),
  setPlayerVitals: (hp, mp) => set({ hp, mp }),
  applyHeal: () => {
    set((s) => ({
      hp: s.maxHp,
      mp: s.maxMp,
    }));
    persist();
  },
  applyPlayerDamage: (amount) => {
    const s = get();
    if (s.hp <= 0) return false;
    const hp = Math.max(0, s.hp - amount);
    set({ hp });
    persist();
    return s.hp > 0 && hp === 0;
  },
  grantExp: (amount) => {
    const s = get();
    let exp = s.exp + amount;
    let level = s.level;
    let expToNext = s.expToNext;
    let maxHp = s.maxHp;
    let maxMp = s.maxMp;
    let attack = s.attack;
    let leveled = false;
    while (exp >= expToNext) {
      exp -= expToNext;
      level += 1;
      maxHp += 20;
      maxMp += 10;
      attack += 2;
      expToNext = 100 + (level - 1) * 40;
      leveled = true;
    }
    set({
      exp,
      level,
      expToNext,
      maxHp,
      maxMp,
      attack,
      hp: leveled ? maxHp : s.hp,
      mp: leveled ? maxMp : s.mp,
    });
    get().addLog(`[Опыт] Получено ${amount} опыта.`);
    if (leveled) {
      get().setToast("Ранг повышен");
      get().addLog(`[Система] Ранг шаталкера: ${get().level}.`);
    }
    persist();
  },
  applyLevelUp: () => {
    get().grantExp(get().expToNext - get().exp);
  },
  syncAttack: (attack) => set({ attack }),
  setDialogOpen: (dialogOpen) => set({ dialogOpen }),
  setInventoryOpen: (inventoryOpen) => set({ inventoryOpen }),
  toggleInventory: () => set((s) => ({ inventoryOpen: !s.inventoryOpen })),
  acceptQuest: () => {
    const s = get();
    if (s.quest.status === "active") return;
    if (isLoggedIn()) {
      void (async () => {
        try {
          getGameApi()?.syncSavePosition();
          await get().flushPersist();
          const snap = await apiAcceptQuest(killHryaksQuest.id);
          get().hydrateFromServer(snap);
          get().addLog(`[Заказ] Принят: ${killHryaksQuest.name}.`);
        } catch (err) {
          get().addLog(`[API] ${err instanceof Error ? err.message : "заказ"}`);
        }
      })();
      return;
    }
    set({
      quest: { ...s.quest, status: "active", progress: 0 },
    });
    get().addLog(`[Заказ] Принят: ${killHryaksQuest.name}.`);
    persist();
  },
  addKillProgress: () => {
    const s = get();
    if (s.quest.status !== "active") return;
    if (s.quest.progress >= killHryaksQuest.required) return;
    const progress = s.quest.progress + 1;
    set({ quest: { ...s.quest, progress } });
    get().addLog(
      `[Заказ] ${killHryaksQuest.name}: ${progress}/${killHryaksQuest.required}.`,
    );
    if (progress >= killHryaksQuest.required) {
      get().addLog("[Заказ] Заказ можно сдать.");
    }
    persist();
  },
  addItem: (id, amount = 1) => {
    set((s) => ({
      inventory: { ...s.inventory, [id]: (s.inventory[id] ?? 0) + amount },
    }));
    get().addLog(`[Система] Получено: ${items[id].name}.`);
    persist();
  },
  useItem: (id) => {
    const s = get();
    const count = s.inventory[id] ?? 0;
    if (count <= 0) {
      get().addLog("[КПК] Нет предмета.");
      return;
    }
    const def = items[id];
    if (!("heal" in def)) {
      get().addLog("[КПК] Предмет нельзя использовать.");
      return;
    }
    if (s.hp >= s.maxHp) {
      get().addLog("[КПК] Здоровье полное.");
      return;
    }
    if (isLoggedIn()) {
      void (async () => {
        try {
          getGameApi()?.syncSavePosition();
          await get().flushPersist();
          const snap = await apiUseItem(id);
          get().hydrateFromServer(snap);
          get().addLog(`[КПК] Использовано: ${def.name} (+${def.heal} HP).`);
        } catch (err) {
          get().addLog(`[API] ${err instanceof Error ? err.message : "предмет"}`);
        }
      })();
      return;
    }
    const heal = def.heal;
    const hp = Math.min(s.maxHp, s.hp + heal);
    set({
      hp,
      inventory: { ...s.inventory, [id]: count - 1 },
    });
    get().addLog(`[КПК] Использовано: ${def.name} (+${heal} HP).`);
    persist();
  },
  turnInQuest: () => {
    const s = get();
    if (s.quest.status !== "active") return false;
    if (s.quest.progress < killHryaksQuest.required) return false;
    if (isLoggedIn()) {
      void (async () => {
        try {
          getGameApi()?.syncSavePosition();
          await get().flushPersist();
          const snap = await apiCompleteQuest(killHryaksQuest.id);
          get().hydrateFromServer(snap);
          get().setDialogOpen(false);
          get().addLog("[Заказ] Награда получена. Заказ сдан.");
          onQuestTurnedIn();
        } catch (err) {
          get().addLog(`[API] ${err instanceof Error ? err.message : "сдача"}`);
        }
      })();
      return true;
    }
    get().grantExp(killHryaksQuest.rewardExp);
    for (const itemId of killHryaksQuest.rewardItems) {
      get().addItem(itemId);
    }
    set({
      quest: { ...get().quest, status: "completed" },
      dialogOpen: false,
    });
    get().addLog("[Заказ] Награда получена. Заказ сдан.");
    persist();
    onQuestTurnedIn();
    return true;
  },
  completeCurrentQuest: () => {
    const s = get();
    if (s.quest.status === "completed") {
      get().addLog("[Система] Заказ уже сдан.");
      return;
    }
    if (
      s.quest.status === "active" &&
      s.quest.progress >= killHryaksQuest.required
    ) {
      get().turnInQuest();
      return;
    }
    set({
      quest: {
        ...s.quest,
        status: "active",
        progress: killHryaksQuest.required,
      },
    });
    get().addLog("[Заказ] Заказ можно сдать.");
    persist();
  },
  resetQuestForTest: () => {
    set({
      quest: {
        id: killHryaksQuest.id,
        status: "available",
        progress: 0,
      },
    });
    persist();
  },
  flushPersist: async () => {
    flushSave(savePayload(get()));
    if (!isLoggedIn()) return;
    try {
      await apiPutSave(toServerSnapshot(get()));
    } catch {
      get().addLog("[API] Не удалось залить сейв.");
    }
  },
  hydrateFromServer: (snap) => {
    const questStatus =
      snap.quest.status === "active" || snap.quest.status === "completed"
        ? snap.quest.status
        : "available";
    set({
      name: snap.name || playerDefaults.name,
      level: Math.max(1, snap.level),
      hp: snap.hp,
      maxHp: snap.maxHp,
      mp: snap.mp,
      maxMp: snap.maxMp,
      exp: snap.exp,
      expToNext: snap.expToNext,
      attack: snap.attack,
      position: {
        x: snap.position.x,
        y: snap.position.y,
        z: snap.position.z,
      },
      quest: {
        id: killHryaksQuest.id,
        status: questStatus,
        progress: Math.max(0, Math.floor(snap.quest.progress)),
      },
      inventory: bagFrom(snap),
      apiAuthed: true,
    });
    setSavePosition(snap.position.x, snap.position.z);
    flushSave(savePayload(get()));
    getGameApi()?.applySavedPosition();
  },
  loginSession: (token, snap) => {
    setToken(token);
    get().hydrateFromServer(snap);
    get().addLog(`[API] Вход: ${snap.name}.`);
  },
  logoutSession: () => {
    setToken(null);
    set({ apiAuthed: false, wsConnected: false, onlineNames: [] });
    getGameApi()?.clearRemotes();
    get().addLog("[API] Выход. Сейв снова только в браузере.");
  },
  };
});
