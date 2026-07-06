import { io, type Socket } from "socket.io-client";
import { API_URL, getToken } from "@/lib/api";

let socket: Socket | null = null;

export function getSocket() {
  const token = getToken();
  if (!token) return null;

  if (!socket) {
    socket = io(API_URL, {
      autoConnect: false,
      auth: { token }
    });
  }

  socket.auth = { token };
  if (!socket.connected) socket.connect();
  return socket;
}
