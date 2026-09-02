export type ServerSnapshot = {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  exp: number;
  expToNext: number;
  attack: number;
  moveSpeed?: number;
  position: { x: number; y: number; z: number };
  quest: { id: string; status: "available" | "active" | "completed"; progress: number };
  inventory: Record<string, number>;
};

export type AuthResponse = {
  token: string;
  player: ServerSnapshot;
};

const TOKEN_KEY = "shatalker-token";

function rawApiUrl(): string {
  const raw = import.meta.env.VITE_API_URL;
  return typeof raw === "string" ? raw.trim() : "";
}

/** Empty / unset = offline. `/` or `same` = this origin (nginx). Else absolute API origin. */
export function apiEnabled(): boolean {
  return rawApiUrl().length > 0;
}

export function apiBase(): string {
  const raw = rawApiUrl();
  if (raw === "" || raw === "/" || raw === "same") return "";
  return raw.replace(/\/$/, "");
}

export function getToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function isLoggedIn(): boolean {
  return Boolean(getToken());
}

type ErrorBody = { error?: string };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${apiBase()}/api/v1${path}`, { ...init, headers });
  if (!res.ok) {
    let message = `http ${res.status}`;
    try {
      const body = (await res.json()) as ErrorBody;
      if (body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function apiHealth(): Promise<boolean> {
  if (!apiEnabled()) return false;
  try {
    const data = await request<{ ok: boolean }>("/health");
    return data.ok === true;
  } catch {
    return false;
  }
}

export async function apiRegister(name: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, password }),
  });
}

export async function apiLogin(name: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ name, password }),
  });
}

export async function apiGetSave(): Promise<ServerSnapshot> {
  return request<ServerSnapshot>("/save");
}

export async function apiPutSave(snap: ServerSnapshot): Promise<ServerSnapshot> {
  return request<ServerSnapshot>("/save", {
    method: "PUT",
    body: JSON.stringify(snap),
  });
}

export async function apiAcceptQuest(id: string): Promise<ServerSnapshot> {
  return request<ServerSnapshot>(`/quests/${id}/accept`, { method: "POST" });
}

export async function apiCompleteQuest(id: string): Promise<ServerSnapshot> {
  return request<ServerSnapshot>(`/quests/${id}/complete`, { method: "POST" });
}

export async function apiUseItem(itemId: string): Promise<ServerSnapshot> {
  return request<ServerSnapshot>("/inventory/use", {
    method: "POST",
    body: JSON.stringify({ itemId }),
  });
}

export async function apiPostChat(channel: string, text: string): Promise<void> {
  await request("/chat", {
    method: "POST",
    body: JSON.stringify({ channel, text }),
  });
}

export type ChatMessage = { id: number; channel: string; from: string; text: string };

export async function apiGetChat(channel = "perimeter", limit = 50): Promise<ChatMessage[]> {
  const data = await request<{ messages: ChatMessage[] }>(
    `/chat?channel=${encodeURIComponent(channel)}&limit=${limit}`,
  );
  return data.messages ?? [];
}
