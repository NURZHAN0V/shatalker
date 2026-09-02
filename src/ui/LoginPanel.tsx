import { useEffect, useState, type FormEvent } from "react";
import {
  apiEnabled,
  apiGetChat,
  apiGetSave,
  apiLogin,
  apiRegister,
  getToken,
} from "../api/client";
import { useGameStore } from "../state/gameStore";

export function LoginPanel() {
  const apiAuthed = useGameStore((s) => s.apiAuthed);
  const loginSession = useGameStore((s) => s.loginSession);
  const addLog = useGameStore((s) => s.addLog);
  const addRadio = useGameStore((s) => s.addRadio);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!apiEnabled()) return;
    const token = getToken();
    if (!token) return;
    let cancelled = false;
    void (async () => {
      try {
        const snap = await apiGetSave();
        if (cancelled) return;
        useGameStore.getState().hydrateFromServer(snap);
        useGameStore.getState().addLog(`[API] Сейв: ${snap.name}.`);
        const lines = await apiGetChat("perimeter", 20);
        if (cancelled) return;
        for (const line of [...lines].reverse()) {
          addRadio("perimeter", line.text, line.from || null);
        }
      } catch {
        useGameStore.getState().logoutSession();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [addRadio]);

  if (!apiEnabled()) return null;
  if (apiAuthed) {
    return (
      <>
        <div className="login-status">В сети</div>
        <NasypList />
      </>
    );
  }

  const run = async (mode: "login" | "register") => {
    const n = name.trim();
    if (n.length < 2 || password.length < 4) {
      addLog("[API] Позывной от 2 знаков, пароль от 4.");
      return;
    }
    setBusy(true);
    try {
      const res = mode === "login" ? await apiLogin(n, password) : await apiRegister(n, password);
      loginSession(res.token, res.player);
    } catch (err) {
      addLog(`[API] ${err instanceof Error ? err.message : "ошибка входа"}`);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run("login");
  };

  return (
    <form className="login-form" onSubmit={onSubmit}>
      <input
        type="text"
        value={name}
        maxLength={24}
        placeholder="Позывной"
        autoComplete="username"
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="password"
        value={password}
        maxLength={72}
        placeholder="Пароль"
        autoComplete="current-password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <div className="login-actions">
        <button type="submit" disabled={busy}>
          Войти
        </button>
        <button type="button" disabled={busy} onClick={() => void run("register")}>
          Регистрация
        </button>
      </div>
    </form>
  );
}

function NasypList() {
  const names = useGameStore((s) => s.onlineNames);
  return (
    <div className="nasyp-list">
      <div className="nasyp-list-title">На насыпи</div>
      {names.length === 0 ? (
        <div>никого</div>
      ) : (
        names.map((n) => <div key={n}>{n}</div>)
      )}
    </div>
  );
}
