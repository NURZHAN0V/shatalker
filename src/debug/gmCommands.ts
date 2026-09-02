import type { GameEngine } from "../game/GameEngine";

let api: GameEngine | null = null;
let minimapCanvas: HTMLCanvasElement | null = null;

export function setGameApi(engine: GameEngine | null): void {
  api = engine;
  if (engine && minimapCanvas) {
    engine.setMinimapCanvas(minimapCanvas);
  }
}

export function getGameApi(): GameEngine | null {
  return api;
}

export function setMinimapCanvas(canvas: HTMLCanvasElement | null): void {
  minimapCanvas = canvas;
  api?.setMinimapCanvas(canvas);
}

