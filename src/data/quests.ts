export const killHryaksQuest = {
  id: "kill_hryaks_3",
  name: "Хряки у депо",
  description: "Убей 3 хряков у ржавого депо.",
  type: "kill" as const,
  target: "hryak",
  required: 3,
  rewardExp: 120,
  rewardItems: ["medkit_small"] as const,
  startNpc: "trader_kefir",
  endNpc: "trader_kefir",
};
