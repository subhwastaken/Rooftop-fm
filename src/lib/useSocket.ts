"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const instance = io({ path: "/api/socketio", transports: ["websocket", "polling"] });
    setSocket(instance);
    instance.on("connect", () => setConnected(true));
    instance.on("disconnect", () => setConnected(false));
    return () => {
      instance.disconnect();
    };
  }, []);

  return { socket, connected };
}

