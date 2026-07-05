import type { RoomDocument } from "../models/Room.js";

export function getRoomTimeLeft(room: RoomDocument, now = new Date()) {
  if (room.status !== "active") return 0;
  const startedAt = new Date(room.freeWindowStartedAt).getTime();
  const elapsedSeconds = Math.floor((now.getTime() - startedAt) / 1000);
  return Math.max(0, room.freeWindowSeconds - elapsedSeconds);
}

export function isRoomExpired(room: RoomDocument, now = new Date()) {
  return getRoomTimeLeft(room, now) <= 0;
}
