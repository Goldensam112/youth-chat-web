import jwt from "jsonwebtoken";
import type { Server } from "socket.io";
import { env } from "../config/env.js";
import { Message } from "../models/Message.js";
import { Room } from "../models/Room.js";
import { User } from "../models/User.js";
import { setSocketServer } from "./notifier.js";
import { getRoomTimeLeft, isRoomExpired } from "../utils/timer.js";

type SocketUser = {
  id: string;
  name: string;
};

declare module "socket.io" {
  interface Socket {
    user?: SocketUser;
  }
}

async function lockExpiredRoom(io: Server, roomId: string) {
  const room = await Room.findById(roomId);
  if (!room || room.status !== "active" || !isRoomExpired(room)) return room;

  room.status = "locked";
  await room.save();
  io.to(roomId).emit("room_lock", { roomId, lockedAt: new Date().toISOString(), reason: "free_window_expired" });
  return room;
}

export function registerSocketHandlers(io: Server) {
  setSocketServer(io);

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token as string | undefined;
      if (!token) return next(new Error("Missing token"));
      const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
      const user = await User.findById(payload.sub);
      if (!user) return next(new Error("User not found"));
      socket.user = { id: user._id.toString(), name: user.name };
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.user!.id;
    socket.join(`user:${userId}`);
    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeenAt: new Date() });
    socket.broadcast.emit("presence_update", { userId, isOnline: true });

    socket.on("join_room", async ({ roomId }, callback) => {
      const room = await Room.findById(roomId);
      if (!room) return callback?.({ ok: false, message: "Room not found" });
      if (!room.participants.some((participantId) => participantId.toString() === userId)) {
        return callback?.({ ok: false, message: "Forbidden" });
      }

      await lockExpiredRoom(io, roomId);
      const freshRoom = await Room.findById(roomId);
      socket.join(roomId);
      callback?.({
        ok: true,
        timeLeft: freshRoom ? getRoomTimeLeft(freshRoom) : 0,
        status: freshRoom?.status,
        serverTime: new Date().toISOString()
      });
    });

    socket.on("send_message", async ({ roomId, body }, callback) => {
      const room = await lockExpiredRoom(io, roomId);
      if (!room) return callback?.({ ok: false, message: "Room not found" });
      if (room.status !== "active") return callback?.({ ok: false, message: "Room locked" });
      if (!room.participants.some((participantId) => participantId.toString() === userId)) {
        return callback?.({ ok: false, message: "Forbidden" });
      }

      const message = await Message.create({ room: room._id, sender: userId, body: String(body).trim() });
      room.lastMessageAt = new Date();
      await room.save();
      io.to(roomId).emit("message:new", { message });
      callback?.({ ok: true, message });
    });

    socket.on("typing", ({ roomId, isTyping }) => {
      socket.to(roomId).emit("typing", { roomId, userId, isTyping: Boolean(isTyping) });
    });

    socket.on("disconnect", async () => {
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeenAt: new Date() });
      socket.broadcast.emit("presence_update", { userId, isOnline: false });
    });
  });

  setInterval(async () => {
    const rooms = await Room.find({ status: "active" }).limit(500);
    await Promise.all(
      rooms.map(async (room) => {
        const roomId = room._id.toString();
        const timeLeft = getRoomTimeLeft(room);
        io.to(roomId).emit("timer_update", { roomId, timeLeft, serverTime: new Date().toISOString() });
        if (timeLeft <= 0) await lockExpiredRoom(io, roomId);
      })
    );
  }, 1000);
}
