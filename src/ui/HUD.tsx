import { useEffect } from "react";
import { useGameStore } from "../state/gameStore";
import { ChatBox } from "./ChatBox";
import { LoginPanel } from "./LoginPanel";
import { ActionBar } from "./ActionBar";
import { getGameApi } from "../debug/gmCommands";

export function HUD() {
  const name = useGameStore((s) => s.name);
  const level = useGameStore((s) => s.level);
  const hp = useGameStore((s) => s.hp);
  const maxHp = useGameStore((s) => s.maxHp);
  const mp = useGameStore((s) => s.mp);
  const maxMp = useGameStore((s) => s.maxMp);
  const exp = useGameStore((s) => s.exp);
  const expToNext = useGameStore((s) => s.expToNext);
  const radiation = useGameStore((s) => s.radiation);
  const toast = useGameStore((s) => s.toast);
  const setToast = useGameStore((s) => s.setToast);
  const autoEnabled = useGameStore((s) => s.autoEnabled);
  const setAutoEnabled = useGameStore((s) => s.setAutoEnabled);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2000);
    return () => window.clearTimeout(t);
  }, [toast, setToast]);

  const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const mpPct = Math.max(0, Math.min(100, (mp / maxMp) * 100));
  const expPct = Math.max(0, Math.min(100, (exp / expToNext) * 100));
  const radPct = Math.max(0, Math.min(100, radiation));
  const downed = hp <= 0;

  return (
    <>
      <section className="pda-panel player-frame">
        <h1>Ш.А.Т.А.Л.К.Е.Р.</h1>
        <div className="player-meta">
          <span>{name}</span>
          <span>Ранг {level}</span>
        </div>
        <div className="bar-label">
          <span>Здоровье</span>
          <span>
            {hp}/{maxHp}
          </span>
        </div>
        <div className="bar hp">
          <span style={{ width: `${hpPct}%` }} />
        </div>
        <div className="bar-label">
          <span>Выносливость</span>
          <span>
            {mp}/{maxMp}
          </span>
        </div>
        <div className="bar mp">
          <span style={{ width: `${mpPct}%` }} />
        </div>
        <div className="bar-label">
          <span>Опыт</span>
          <span>
            {exp}/{expToNext}
          </span>
        </div>
        <div className="bar exp">
          <span style={{ width: `${expPct}%` }} />
        </div>
        <div className="bar-label">
          <span>Радиация</span>
          <span>{radiation}</span>
        </div>
        <div className="bar rad">
          <span style={{ width: `${radPct}%` }} />
        </div>
        <button
          type="button"
          className={autoEnabled ? "auto-btn on" : "auto-btn"}
          onClick={() => setAutoEnabled(!autoEnabled)}
        >
          {autoEnabled ? "Авто: вкл" : "Авто"}
        </button>
        <LoginPanel />
      </section>

      <ChatBox />
      <ActionBar />

      {downed ? (
        <section className="pda-panel downed-banner">
          <p>Без сознания</p>
          <button type="button" onClick={() => getGameApi()?.respawnAtCamp()}>
            Подняться
          </button>
        </section>
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </>
  );
}
