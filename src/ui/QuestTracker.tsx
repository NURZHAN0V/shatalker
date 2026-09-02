import { useGameStore } from "../state/gameStore";
import { questById } from "../data/quests";

export function QuestTracker() {
  const quest = useGameStore((s) => s.quest);
  if (quest.status !== "active") return null;

  const def = questById(quest.id);
  const ready = quest.progress >= def.required;

  return (
    <section className="pda-panel quest-tracker">
      <h2>Заказ</h2>
      <div className="quest-title">{def.name}</div>
      <p>{def.description}</p>
      <div>
        {quest.progress}/{def.required}
      </div>
      {ready ? <div className="quest-ready">Заказ можно сдать</div> : null}
    </section>
  );
}
