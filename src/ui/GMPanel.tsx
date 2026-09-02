import { useGameStore } from "../state/gameStore";
import { getGameApi } from "../debug/gmCommands";
import { resetSave } from "../state/save";
import { apiEnabled, apiGetChat, apiGetSave, apiHealth } from "../api/client";

export function GMPanel() {
  const fps = useGameStore((s) => s.fps);
  const showFps = useGameStore((s) => s.showFps);
  const setShowFps = useGameStore((s) => s.setShowFps);
  const apiAuthed = useGameStore((s) => s.apiAuthed);
  const wsConnected = useGameStore((s) => s.wsConnected);

  return (
    <section className="pda-panel gm-panel">
      <h2>Консоль Периметра</h2>
      <button type="button" onClick={() => getGameApi()?.healPlayer()}>
        Heal
      </button>
      <button type="button" onClick={() => getGameApi()?.toggleSky()}>
        Toggle sky
      </button>
      <button type="button" onClick={() => getGameApi()?.toggleAnomalies()}>
        Toggle anomalies
      </button>
      <button type="button" onClick={() => getGameApi()?.toggleColliders()}>
        Show colliders
      </button>
      <button type="button" onClick={() => getGameApi()?.levelUp()}>
        Level Up
      </button>
      <button type="button" onClick={() => useGameStore.getState().grantExp(1000)}>
        +1000 Exp
      </button>
      <button type="button" onClick={() => getGameApi()?.teleportForward()}>
        Teleport Forward
      </button>
      <button type="button" onClick={() => getGameApi()?.spawnMonster()}>
        Spawn Monster
      </button>
      <button type="button" onClick={() => getGameApi()?.spawnRyskar()}>
        Spawn Ryskar
      </button>
      <button type="button" onClick={() => useGameStore.getState().addItem("oskolok")}>
        Give shard
      </button>
      <button type="button" onClick={() => getGameApi()?.zeroRadiation()}>
        Rad 0
      </button>
      <button
        type="button"
        onClick={() => useGameStore.getState().completeCurrentQuest()}
      >
        Complete current quest
      </button>
      <button type="button" onClick={() => useGameStore.getState().addItem("medkit_small")}>
        Give medkit
      </button>
      <button type="button" onClick={() => useGameStore.getState().addItem("hryak_meat")}>
        Give meat
      </button>
      <button type="button" onClick={() => getGameApi()?.teleportToQuestTarget()}>
        Teleport to quest target
      </button>
      <button type="button" onClick={() => getGameApi()?.teleportToDepot()}>
        Teleport to depot
      </button>
      <button type="button" onClick={() => getGameApi()?.startAutoTest()}>
        AUTO TEST
      </button>
      {apiEnabled() ? (
        <>
          <button
            type="button"
            onClick={() => {
              void (async () => {
                const ok = await apiHealth();
                useGameStore.getState().addLog(ok ? "[API] health ok" : "[API] health fail");
              })();
            }}
          >
            API Health
          </button>
          <button
            type="button"
            onClick={() => {
              void (async () => {
                getGameApi()?.syncSavePosition();
                await useGameStore.getState().flushPersist();
                useGameStore.getState().addLog("[API] Push save.");
              })();
            }}
          >
            Push save
          </button>
          <button
            type="button"
            onClick={() => {
              void (async () => {
                try {
                  const snap = await apiGetSave();
                  useGameStore.getState().hydrateFromServer(snap);
                  const lines = await apiGetChat("perimeter", 20);
                  for (const line of [...lines].reverse()) {
                    useGameStore.getState().addRadio("perimeter", line.text, line.from || null);
                  }
                  useGameStore.getState().addLog("[API] Pull save.");
                } catch (err) {
                  useGameStore.getState().addLog(
                    `[API] ${err instanceof Error ? err.message : "pull"}`,
                  );
                }
              })();
            }}
          >
            Pull save
          </button>
          <button type="button" onClick={() => useGameStore.getState().logoutSession()}>
            Logout
          </button>
          <div className="gm-fps">{apiAuthed ? "API: в сети" : "API: гость"}</div>
          <div className="gm-fps">{wsConnected ? "WS: вкл" : "WS: выкл"}</div>
        </>
      ) : null}
      <button type="button" onClick={() => resetSave()}>
        Reset Save
      </button>
      <button type="button" onClick={() => setShowFps(!showFps)}>
        {showFps ? "FPS: вкл" : "FPS: выкл"}
      </button>
      {showFps ? <div className="gm-fps">{fps.toFixed(0)} FPS</div> : null}
    </section>
  );
}
