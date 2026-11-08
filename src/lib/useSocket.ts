"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const customUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
    const instance = customUrl
      ? io(customUrl, { path: "/api/socketio", transports: ["websocket", "polling"], timeout: 10000 })
      : io({ path: "/api/socketio", transports: ["websocket", "polling"], timeout: 10000 });

    setSocket(instance);
    if (instance.connected) setConnected(true);

    const onConnect = () => {
      setConnected(true);
      setConnectionError(null);
    };
    const onDisconnect = () => setConnected(false);
    const onConnectError = (err: Error) => {
      console.warn("[Socket.io] Connection error:", err.message);
      setConnectionError(err.message);
    };

    instance.on("connect", onConnect);
    instance.on("disconnect", onDisconnect);
    instance.on("connect_error", onConnectError);

    // Phones freeze background tabs; reconnect right away when the user comes back
    // instead of waiting for the next backoff retry.
    const onVisible = () => {
      if (document.visibilityState === "visible" && !instance.connected) instance.connect();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
      instance.off("connect", onConnect);
      instance.off("disconnect", onDisconnect);
      instance.off("connect_error", onConnectError);
      instance.disconnect();
    };
  }, []);

  return { socket, connected, connectionError };
}

