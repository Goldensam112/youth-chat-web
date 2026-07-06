import type { Server } from "socket.io";
import type { RoomDocument } from "../models/Room.js";
import { getRoomTimeLeft } from "../utils/timer.js";

let ioRef: Server | null = null;

export function setSocketServer(io: Server) {
  ioRef = io;
}

export function emitMatchFound(room: RoomDocument) {
  if (!ioRef) return;

  const payload = {
    status: "matched",
    room,
    timeLeft: getRoomTimeLeft(room),
    serverTime: new Date().toISOString()
  };

  room.participants.forEach((participantId) => {
    ioRef?.to(`user:${participantId.toString()}`).emit("match_found", payload);
  });
}
