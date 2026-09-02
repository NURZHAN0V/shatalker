import { useEffect, useRef } from "react";
import { setMinimapCanvas } from "../debug/gmCommands";
import { useGameStore } from "../state/gameStore";

const MAP_PX = 140;

export function Minimap() {
  const show = useGameStore((s) => s.showMinimap);
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = MAP_PX;
    canvas.height = MAP_PX;
    setMinimapCanvas(canvas);
    return () => {
      setMinimapCanvas(null);
    };
  }, []);

  return (
    <div className="pda-panel minimap-wrap" hidden={!show}>
      <canvas ref={ref} width={MAP_PX} height={MAP_PX} aria-label="Миникарта" />
    </div>
  );
}
