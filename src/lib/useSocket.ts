"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const instance = io({ path: "/api/socketio", transports: ["websocket", "polling"] });
    setSocket(instance);
    if (instance.connected) setConnected(true);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    instance.on("connect", onConnect);
    instance.on("disconnect", onDisconnect);

    return () => {
      instance.off("connect", onConnect);
      instance.off("disconnect", onDisconnect);
      instance.disconnect();
    };
  }, []);

  return { socket, connected };
}

