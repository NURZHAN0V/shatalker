import type { ItemId } from "./items";

export type QuestDef = {
  id: string;
  name: string;
  description: string;
  type: "kill" | "fetch";
  target: string;
  required: number;
  rewardExp: number;
  rewardItems: readonly ItemId[];
};

export const killHryaksQuest: QuestDef = {
  id: "kill_hryaks_3",
  name: "Хряки у депо",
  description: "Убей 3 хряков у ржавого депо.",
  type: "kill",
  target: "hryak",
  required: 3,
  rewardExp: 120,
  rewardItems: ["medkit_small"],
};

export const fetchOskolokQuest: QuestDef = {
  id: "fetch_oskolok_1",
  name: "Осколок у сфер",
  description: "Принеси тусклый осколок с аномалии. F у сферы.",
  type: "fetch",
  target: "oskolok",
  required: 1,
  rewardExp: 80,
  rewardItems: ["medkit_small"],
};

const CATALOG: Record<string, QuestDef> = {
  [killHryaksQuest.id]: killHryaksQuest,
  [fetchOskolokQuest.id]: fetchOskolokQuest,
};

export function questById(id: string): QuestDef {
  return CATALOG[id] ?? killHryaksQuest;
}

/** After turn-in, the next order Kefir will offer. */
export function nextQuestId(completedId: string): string {
  if (completedId === killHryaksQuest.id) return fetchOskolokQuest.id;
  return killHryaksQuest.id;
}
