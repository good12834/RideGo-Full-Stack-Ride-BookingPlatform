import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

// A single shared Socket.IO connection for the whole app. Keeping the socket at
// module scope (instead of creating it inside the component effect) avoids a
// React 18 <StrictMode> dev artifact: StrictMode runs effects mount → cleanup →
// mount, so a socket created inside the effect gets disconnect()ed while its
// WebSocket handshake is still in flight — which the browser reports as the
// noisy "WebSocket is closed before the connection is established" error.
let sharedSocket = null;
let sharedSocketToken = null;

function getOrCreateSocket() {
  const token = localStorage.getItem("ridego_token");
  if (sharedSocket && sharedSocketToken === token) return sharedSocket;
  if (!token) {
    sharedSocket = null;
    sharedSocketToken = null;
    return null;
  }
  // Token changed (e.g. after logout → re-login) → drop the old identity's socket.
  if (sharedSocket) sharedSocket.disconnect();
  sharedSocket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  sharedSocketToken = token;
  return sharedSocket;
}

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [ready, setReady] = useState(() => Boolean(localStorage.getItem("ridego_token")));

  useEffect(() => {
    const token = localStorage.getItem("ridego_token");
    if (!token) {
      setReady(true);
      return undefined;
    }

    const socket = getOrCreateSocket();
    socketRef.current = socket;
    setConnected(socket?.connected ?? false);
    setReady(true);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onError = (err) => {
      setConnected(false);
      // Auth failures (expired/invalid token) never succeed on retry — surface
      // the actual reason instead of hiding it behind a stackless websocket error.
      console.warn("[socket] connect_error:", err?.message || err);
    };

    socket?.on("connect", onConnect);
    socket?.on("disconnect", onDisconnect);
    socket?.on("connect_error", onError);

    return () => {
      // Detach listeners only — do NOT disconnect. See the module comment above.
      socket?.off("connect", onConnect);
      socket?.off("disconnect", onDisconnect);
      socket?.off("connect_error", onError);
    };
  }, []);

  const emit = (...args) => socketRef.current?.emit(...args);
  const on = (...args) => socketRef.current?.on(...args);
  const off = (...args) => socketRef.current?.off(...args);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, ready, emit, on, off }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used within SocketProvider");
  return ctx;
}
