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
} as const;

export type ItemId = keyof typeof items;

export const ITEM_ORDER: readonly ItemId[] = ["medkit_small", "hryak_meat"];
