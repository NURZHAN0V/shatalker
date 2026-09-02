import { useGameStore } from "../state/gameStore";

export function DamageNumbers() {
  const numbers = useGameStore((s) => s.damageNumbers);

  return (
    <div className="damage-layer">
      {numbers.map((n) => (
        <div
          key={n.id}
          className="damage-floater"
          style={{ left: n.left, top: n.top }}
        >
          {n.value}
        </div>
      ))}
    </div>
  );
}
