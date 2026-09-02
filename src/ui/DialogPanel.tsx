import { useGameStore } from "../state/gameStore";
import { traderKefir } from "../data/npcs";
import { nextQuestId, questById } from "../data/quests";

export function DialogPanel() {
  const open = useGameStore((s) => s.dialogOpen);
  const quest = useGameStore((s) => s.quest);
  const setDialogOpen = useGameStore((s) => s.setDialogOpen);
  const acceptQuest = useGameStore((s) => s.acceptQuest);
  const turnInQuest = useGameStore((s) => s.turnInQuest);

  if (!open) return null;

  const def = questById(quest.id);
  const offer = quest.status === "completed" ? questById(nextQuestId(quest.id)) : def;
  const canAccept = quest.status === "available" || quest.status === "completed";
  const canTurnIn = quest.status === "active" && quest.progress >= def.required;
  const done = quest.status === "completed";

  return (
    <div className="dialog-backdrop">
      <section className="pda-panel dialog-panel">
        <h2>{traderKefir.name}</h2>
        {traderKefir.dialog.map((line) => (
          <p key={line}>{line}</p>
        ))}
        {done ? <p>Дело сделано. Не путайся под ногами.</p> : null}
        {canAccept ? (
          <p>
            Заказ: {offer.name}. {offer.description}
          </p>
        ) : null}
        {quest.status === "active" ? (
          <p>
            Сейчас: {def.name} ({quest.progress}/{def.required})
          </p>
        ) : null}
        <div className="dialog-actions">
          {canAccept ? (
            <button type="button" onClick={() => acceptQuest()}>
              Принять заказ
            </button>
          ) : null}
          {canTurnIn ? (
            <button type="button" onClick={() => turnInQuest()}>
              Получить награду
            </button>
          ) : null}
          <button type="button" onClick={() => setDialogOpen(false)}>
            Закрыть
          </button>
        </div>
      </section>
    </div>
  );
}
