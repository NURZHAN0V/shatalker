let running = false;
let timeoutId = 0;
let onFinish: ((ok: boolean) => void) | null = null;

export function isAutoTestRunning(): boolean {
  return running;
}

export function bindAutoTestFinish(fn: ((ok: boolean) => void) | null): void {
  onFinish = fn;
}

export function finishAutoTest(ok: boolean): void {
  if (!running) return;
  running = false;
  window.clearTimeout(timeoutId);
  timeoutId = 0;
  onFinish?.(ok);
}

export function startAutoTest(begin: () => void): boolean {
  if (running) return false;
  running = true;
  begin();
  timeoutId = window.setTimeout(() => {
    finishAutoTest(false);
  }, 90000);
  return true;
}

export function onQuestTurnedIn(): void {
  if (running) finishAutoTest(true);
}
