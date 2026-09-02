import { useGameStore } from "../state/gameStore";

export function TargetFrame() {
  const target = useGameStore((s) => s.target);
  if (!target) return null;

  const hpPct = Math.max(0, Math.min(100, (target.hp / target.maxHp) * 100));

  return (
    <section className="pda-panel target-frame">
      <h2>Цель</h2>
      <div className="player-meta">
        <span>{target.name}</span>
        <span>Ур. {target.level}</span>
      </div>
      <div className="bar-label">
        <span>Здоровье</span>
        <span>
          {target.hp}/{target.maxHp}
        </span>
      </div>
      <div className="bar hp">
        <span style={{ width: `${hpPct}%` }} />
      </div>
    </section>
  );
}
