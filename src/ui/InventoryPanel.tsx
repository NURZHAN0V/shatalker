import { useGameStore } from "../state/gameStore";
import { ITEM_ORDER, items } from "../data/items";

export function InventoryPanel() {
  const open = useGameStore((s) => s.inventoryOpen);
  const inventory = useGameStore((s) => s.inventory);
  const setInventoryOpen = useGameStore((s) => s.setInventoryOpen);
  const useItem = useGameStore((s) => s.useItem);

  if (!open) return null;

  return (
    <section className="pda-panel inventory-panel">
      <h2>Инвентарь</h2>
      {ITEM_ORDER.map((id) => {
        const count = inventory[id] ?? 0;
        const usable = "heal" in items[id];
        return (
          <div key={id} className="inventory-row">
            <div>
              <div>{items[id].name}</div>
              <div className="inventory-count">{count}</div>
            </div>
            {usable ? (
              <button
                type="button"
                disabled={count <= 0}
                onClick={() => useItem(id)}
              >
                Использовать
              </button>
            ) : null}
          </div>
        );
      })}
      <button type="button" onClick={() => setInventoryOpen(false)}>
        Закрыть
      </button>
    </section>
  );
}
