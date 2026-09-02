export const items = {
  medkit_small: {
    id: "medkit_small",
    name: "малая аптечка",
    heal: 30,
  },
  hryak_meat: {
    id: "hryak_meat",
    name: "мясо хряка",
  },
  oskolok: {
    id: "oskolok",
    name: "тусклый осколок",
  },
} as const;

export type ItemId = keyof typeof items;

export const ITEM_ORDER: readonly ItemId[] = ["medkit_small", "hryak_meat", "oskolok"];

export const EMPTY_BAG: Record<ItemId, number> = {
  medkit_small: 0,
  hryak_meat: 0,
  oskolok: 0,
};
