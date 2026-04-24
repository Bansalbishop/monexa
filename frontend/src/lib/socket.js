import { io } from "socket.io-client";

export const socket = io(import.meta.env.VITE_SOCKET_URL, {
  withCredentials: true,
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});
