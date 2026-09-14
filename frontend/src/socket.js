import { io } from "socket.io-client";

// Same idea as api.js: empty string in dev (Vite proxies /socket.io locally),
// or your deployed backend URL in production via VITE_API_URL.
const API_ROOT = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export const socket = io(API_ROOT, {
  autoConnect: true,
  transports: ["websocket", "polling"]
});
