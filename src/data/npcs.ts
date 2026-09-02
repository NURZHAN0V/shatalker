export const traderKefir = {
  id: "trader_kefir",
  name: "Барыга Кефир",
  role: "quest_giver" as const,
  dialog: [
    "Насыпь обложили хряки. Мои люди не высовываются.",
    "Убери трёх хряков у ржавого депо — будет аптечка и уважение.",
  ],
  quests: ["kill_hryaks_3"] as const,
  x: -6,
  z: -4,
};

export const NPC_HEIGHT = 1.8;
export const NPC_DIAMETER = 0.7;
