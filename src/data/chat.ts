export const PERIMETER_LINES: readonly string[] = [
  "Кто на хряков? Пачка патронов в долю.",
  "Аптечки дёшево, без вопросов.",
  "Ищу проводника до депо.",
  "Сколько стоит малая аптечка?",
  "На севере аномальный шторм!",
];

export function randomPerimeterLine(): string {
  return PERIMETER_LINES[Math.floor(Math.random() * PERIMETER_LINES.length)]!;
}
