import { useGameStore } from "../state/gameStore";
import { killHryaksQuest } from "../data/quests";

export function QuestTracker() {
  const quest = useGameStore((s) => s.quest);
  if (quest.status !== "active") return null;

  const ready = quest.progress >= killHryaksQuest.required;

  return (
    <section className="pda-panel quest-tracker">
      <h2>Заказ</h2>
      <div className="quest-title">{killHryaksQuest.name}</div>
      <p>{killHryaksQuest.description}</p>
      <div>
        {quest.progress}/{killHryaksQuest.required}
      </div>
      {ready ? <div className="quest-ready">Заказ можно сдать</div> : null}
    </section>
  );
}
