import { useEffect, useRef } from "react";
import { GameEngine } from "./GameEngine";
import { setGameApi } from "../debug/gmCommands";

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = new GameEngine(canvas);
    setGameApi(game);
    game.start();

    return () => {
      setGameApi(null);
      game.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      tabIndex={0}
      className="game-canvas"
      aria-label="Периметр"
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
