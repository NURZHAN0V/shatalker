import { apiBase, apiEnabled, getToken } from "./client";

export type RadioWsHandlers = {
  onOpen: () => void;
  onClose: () => void;
  onChat: (from: string, text: string) => void;
  onPresence: (name: string, online: boolean, x?: number, z?: number) => void;
  onPos: (from: string, x: number, z: number) => void;
};

type WsPayload = {
  type?: string;
  channel?: string;
  text?: string;
  from?: string;
  name?: string;
  online?: boolean;
  x?: number;
  z?: number;
};

let socket: WebSocket | null = null;
let handlers: RadioWsHandlers | null = null;

function wsUrl(httpBase: string, token: string): string {
  const origin = httpBase || window.location.origin;
  const u = new URL(origin);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  const root = u.pathname.replace(/\/$/, "");
  u.pathname = `${root}/api/v1/ws`;
  u.search = "";
  u.searchParams.set("token", token);
  return u.toString();
}

export function sendPerimeterWs(text: string): boolean {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify({ type: "chat", channel: "perimeter", text }));
  return true;
}

export function sendPosWs(x: number, z: number): boolean {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify({ type: "pos", x, z }));
  return true;
}

export function disconnectRadioWs(): void {
  const ws = socket;
  socket = null;
  handlers = null;
  if (!ws) return;
  ws.onopen = null;
  ws.onmessage = null;
  ws.onerror = null;
  ws.onclose = null;
  if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
    ws.close();
  }
}

export function connectRadioWs(next: RadioWsHandlers): void {
  disconnectRadioWs();
  const token = getToken();
  if (!token || !apiEnabled()) return;
  handlers = next;
  const ws = new WebSocket(wsUrl(apiBase(), token));
  socket = ws;
  ws.onopen = () => {
    if (socket !== ws) return;
    handlers?.onOpen();
  };
  ws.onclose = () => {
    if (socket !== ws) return;
    socket = null;
    handlers?.onClose();
  };
  ws.onmessage = (ev) => {
    if (socket !== ws) return;
    let msg: WsPayload;
    try {
      msg = JSON.parse(String(ev.data)) as WsPayload;
    } catch {
      return;
    }
    if (msg.type === "chat") {
      if (msg.channel !== "perimeter" || typeof msg.text !== "string") return;
      handlers?.onChat(typeof msg.from === "string" ? msg.from : "", msg.text);
      return;
    }
    if (msg.type === "presence") {
      if (typeof msg.name !== "string" || msg.name === "") return;
      const x = typeof msg.x === "number" ? msg.x : undefined;
      const z = typeof msg.z === "number" ? msg.z : undefined;
      handlers?.onPresence(msg.name, msg.online === true, x, z);
      return;
    }
    if (msg.type === "pos") {
      if (typeof msg.from !== "string" || msg.from === "") return;
      if (typeof msg.x !== "number" || typeof msg.z !== "number") return;
      handlers?.onPos(msg.from, msg.x, msg.z);
    }
  };
}
