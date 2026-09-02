import { GameCanvas } from "./game/GameCanvas";
import { HUD } from "./ui/HUD";
import { TargetFrame } from "./ui/TargetFrame";
import { GMPanel } from "./ui/GMPanel";
import { QuestTracker } from "./ui/QuestTracker";
import { DialogPanel } from "./ui/DialogPanel";
import { InventoryPanel } from "./ui/InventoryPanel";
import { Minimap } from "./ui/Minimap";
import { DamageNumbers } from "./ui/DamageNumbers";
import { RadioSocket } from "./ui/RadioSocket";

export default function App() {
  return (
    <div className="game-root">
      <GameCanvas />
      <RadioSocket />
      <div className="hud-layer">
        <HUD />
        <TargetFrame />
        <Minimap />
        <GMPanel />
        <QuestTracker />
        <InventoryPanel />
        <DialogPanel />
        <DamageNumbers />
      </div>
    </div>
  );
}
