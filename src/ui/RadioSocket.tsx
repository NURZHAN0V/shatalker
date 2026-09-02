import { useEffect } from "react";
import { connectRadioWs, disconnectRadioWs } from "../api/ws";
import { getGameApi } from "../debug/gmCommands";
import { useGameStore } from "../state/gameStore";

export function RadioSocket() {
  const apiAuthed = useGameStore((s) => s.apiAuthed);

  useEffect(() => {
    if (!apiAuthed) {
      disconnectRadioWs();
      useGameStore.getState().setWsConnected(false);
      useGameStore.getState().clearOnline();
      getGameApi()?.clearRemotes();
      return;
    }
    connectRadioWs({
      onOpen: () => {
        useGameStore.getState().setWsConnected(true);
        useGameStore.getState().addLog("[API] рация WS");
      },
      onClose: () => {
        useGameStore.getState().setWsConnected(false);
        useGameStore.getState().clearOnline();
        getGameApi()?.clearRemotes();
      },
      onChat: (from, text) => {
        useGameStore.getState().addRadio("perimeter", text, from || null);
      },
      onPresence: (name, online, x, z) => {
        useGameStore.getState().applyPresence(name, online);
        getGameApi()?.applyRemotePresence(name, online, x, z);
      },
      onPos: (from, x, z) => {
        getGameApi()?.applyRemotePos(from, x, z);
      },
    });
    return () => {
      disconnectRadioWs();
      useGameStore.getState().setWsConnected(false);
      useGameStore.getState().clearOnline();
      getGameApi()?.clearRemotes();
    };
  }, [apiAuthed]);

  return null;
}
