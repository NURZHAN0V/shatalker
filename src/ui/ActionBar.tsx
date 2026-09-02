import { getGameApi } from "../debug/gmCommands";

export function ActionBar() {
  return (
    <div className="action-bar">
      <button type="button" onClick={() => getGameApi()?.attackTarget()}>
        1 Удар
      </button>
      <button type="button" onClick={() => getGameApi()?.useSkill()}>
        2 Тяжёлый
      </button>
    </div>
  );
}
