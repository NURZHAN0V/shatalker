import { playerDefaults } from "../data/player";
import { killHryaksQuest } from "../data/quests";
import { items, type ItemId } from "../data/items";
import type { QuestState, QuestStatus } from "./gameStore";

export const SAVE_KEY = "shatalker-save-v1";

export type SaveBlob = {
  v: 1;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  exp: number;
  expToNext: number;
  attack: number;
  x: number;
  z: number;
  quest: QuestState;
  inventory: Record<ItemId, number>;
};

export type SavePayload = Omit<SaveBlob, "v" | "x" | "z">;

let lastX = 0;
let lastZ = 0;
let debounce = 0;
let pending: SavePayload | null = null;

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function isQuestStatus(v: unknown): v is QuestStatus {
  return v === "available" || v === "active" || v === "completed";
}

export function loadSave(): SaveBlob | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<SaveBlob>;
    if (data.v !== 1) return null;
    const inventory: Record<ItemId, number> = { medkit_small: 0, hryak_meat: 0 };
    for (const id of Object.keys(items) as ItemId[]) {
      inventory[id] = Math.max(0, Math.floor(num(data.inventory?.[id], 0)));
    }
    const questIn = data.quest;
    const quest: QuestState = {
      id: killHryaksQuest.id,
      status: isQuestStatus(questIn?.status) ? questIn.status : "available",
      progress: Math.max(0, Math.floor(num(questIn?.progress, 0))),
    };
    const blob: SaveBlob = {
      v: 1,
      name: typeof data.name === "string" && data.name ? data.name : playerDefaults.name,
      level: Math.max(1, Math.floor(num(data.level, playerDefaults.level))),
      hp: num(data.hp, playerDefaults.hp),
      maxHp: num(data.maxHp, playerDefaults.maxHp),
      mp: num(data.mp, playerDefaults.mp),
      maxMp: num(data.maxMp, playerDefaults.maxMp),
      exp: num(data.exp, playerDefaults.exp),
      expToNext: num(data.expToNext, playerDefaults.expToNext),
      attack: num(data.attack, playerDefaults.attack),
      x: num(data.x, 0),
      z: num(data.z, 0),
      quest,
      inventory,
    };
    lastX = blob.x;
    lastZ = blob.z;
    return blob;
  } catch {
    return null;
  }
}

export function setSavePosition(x: number, z: number): void {
  lastX = x;
  lastZ = z;
}

export function getSavePosition(): { x: number; z: number } {
  return { x: lastX, z: lastZ };
}

function write(payload: SavePayload): void {
  const blob: SaveBlob = { v: 1, x: lastX, z: lastZ, ...payload };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(blob));
  } catch {
    /* quota / private mode */
  }
}

export function flushSave(payload?: SavePayload): void {
  if (debounce) {
    window.clearTimeout(debounce);
    debounce = 0;
  }
  const data = payload ?? pending;
  pending = null;
  if (!data) return;
  write(data);
}

export function scheduleSave(payload: SavePayload): void {
  pending = payload;
  if (debounce) window.clearTimeout(debounce);
  debounce = window.setTimeout(() => {
    debounce = 0;
    flushSave();
  }, 1000);
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

export function resetSave(): void {
  clearSave();
  window.location.reload();
}
