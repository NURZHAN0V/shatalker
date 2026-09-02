import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { useGameStore, type RadioChannel } from "../state/gameStore";
import { getGameApi } from "../debug/gmCommands";

const TABS: { id: RadioChannel; label: string }[] = [
  { id: "system", label: "Система" },
  { id: "perimeter", label: "Периметр" },
  { id: "combat", label: "Бой" },
];

function lineText(channel: RadioChannel, from: string | null, text: string): string {
  if (channel === "perimeter" && from) {
    return `[Периметр] ${from}: ${text}`;
  }
  return text;
}

export function ChatBox() {
  const radio = useGameStore((s) => s.radio);
  const sendPerimeter = useGameStore((s) => s.sendPerimeter);
  const [tab, setTab] = useState<RadioChannel>("perimeter");
  const [draft, setDraft] = useState("");

  const lines = radio.filter((m) => m.channel === tab);
  const lastLineId = lines.length > 0 ? lines[lines.length - 1].id : -1;
  const linesRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = linesRef.current;
    if (!el) return;
    const stickToLatest = () => {
      el.scrollTop = el.scrollHeight;
    };
    stickToLatest();
    const frame = requestAnimationFrame(stickToLatest);
    return () => cancelAnimationFrame(frame);
  }, [tab, lastLineId, lines.length]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    sendPerimeter(text);
    setDraft("");
    getGameApi()?.notePlayerChat();
    setTab("perimeter");
  };

  return (
    <section className="pda-panel chat-box">
      <div className="chat-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? "active" : ""}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="chat-lines" ref={linesRef}>
        {lines.map((m) => (
          <div key={m.id}>{lineText(m.channel, m.from, m.text)}</div>
        ))}
      </div>
      {tab === "perimeter" ? (
        <form className="chat-form" onSubmit={onSubmit}>
          <input
            type="text"
            value={draft}
            maxLength={120}
            placeholder="В эфир…"
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit">В эфир</button>
        </form>
      ) : null}
    </section>
  );
}
