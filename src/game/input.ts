export function isTextInput(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
}

export class InputState {
  readonly keys = new Set<string>();
  private onDown: ((e: KeyboardEvent) => void) | null = null;
  private onUp: ((e: KeyboardEvent) => void) | null = null;

  attach(): void {
    this.onDown = (e: KeyboardEvent) => {
      if (isTextInput(e.target)) return;
      this.keys.add(e.code);
      if (
        e.code === "KeyW" ||
        e.code === "KeyA" ||
        e.code === "KeyS" ||
        e.code === "KeyD" ||
        e.code === "Digit1" ||
        e.code === "Tab" ||
        e.code === "KeyF" ||
        e.code === "KeyI" ||
        e.code === "Space"
      ) {
        e.preventDefault();
      }
    };
    this.onUp = (e: KeyboardEvent) => {
      this.keys.delete(e.code);
    };
    window.addEventListener("keydown", this.onDown);
    window.addEventListener("keyup", this.onUp);
  }

  detach(): void {
    if (this.onDown) window.removeEventListener("keydown", this.onDown);
    if (this.onUp) window.removeEventListener("keyup", this.onUp);
    this.onDown = null;
    this.onUp = null;
    this.keys.clear();
  }

  get moving(): boolean {
    return (
      this.keys.has("KeyW") ||
      this.keys.has("KeyA") ||
      this.keys.has("KeyS") ||
      this.keys.has("KeyD")
    );
  }
}
