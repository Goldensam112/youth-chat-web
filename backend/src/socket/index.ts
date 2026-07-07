import jwt from "jsonwebtoken";
import type { Server } from "socket.io";
import { env } from "../config/env.js";
import { Message } from "../models/Message.js";
import { Room } from "../models/Room.js";
import { User } from "../models/User.js";
import { Follow } from "../models/Follow.js"; // Naya follow model yahan joda
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

// --- ROOM EXPIRY CHECKER WITH FOLLOW BYPASS ---
async function lockExpiredRoom(io: Server, roomId: string) {
  const room = await Room.findById(roomId);
  if (!room || room.status !== "active") return room;

  // Agar dono participants mein se kisi ne bhi ek dusre ko follow kiya hai, to chat LOCK NAHI HOGI!
  const [userA, userB] = room.participants;
  const hasFollowRelationship = await Follow.findOne({
    $or: [
      { followerId: userA, followingId: userB },
      { followerId: userB, followingId: userA }
    ]
  });

  // Agar follow kiya hua hai, to room lock karne ki koi zaroorat nahi hai (Bypass)
  if (hasFollowRelationship) {
    return room;
  }

  // Agar follow nahi kiya hai aur time khatam ho gaya, tabhi lock hoga
  if (isRoomExpired(room)) {
    room.status = "locked";
    await room.save();
    io.to(roomId).emit("room_lock", { roomId, lockedAt: new Date().toISOString(), reason: "free_window_expired" });
  }
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

    // --- NAYA OPTION: DIRECT CHAT ROOM (BINA MATCH QUEUE KE) ---
    socket.on("start_direct_chat", async ({ targetUserId }, callback) => {
      try {
        // Pehle check karo ki kya dono mein se kisi ne ek dusre ko follow kiya hai
        const isFollowed = await Follow.findOne({
          $or: [
            { followerId: userId, followingId: targetUserId },
            { followerId: targetUserId, followingId: userId }
          ]
        });

        if (!isFollowed) {
          return callback?.({ ok: false, message: "Bhai pehle follow (₹20 ya 3 ads) karna padega!" });
        }

        // Direct room dhoondo ya naya banao
        let room = await Room.findOne({
          participants: { $all: [userId, targetUserId] }
        });

        if (!room) {
          room = await Room.create({
            participants: [userId, targetUserId],
            status: "active",
            createdAt: new Date()
          });
        } else if (room.status === "locked") {
          // Agar room pehle se locked tha, to follow karne ki wajah se use wapas open active kar do!
          room.status = "active";
          await room.save();
        }

        socket.join(room._id.toString());
        callback?.({ ok: true, roomId: room._id.toString() });

      } catch (error) {
        callback?.({ ok: false, message: "Server mein kuch dikkat aayi!" });
      }
    });

    socket.on("join_room", async ({ roomId }, callback) => {
      const room = await Room.findById(roomId);
      if (!room) return callback?.({ ok: false, message: "Room not found" });
      if (!room.participants.some((participantId) => participantId.toString() === userId)) {
        return callback?.({ ok: false, message: "Forbidden" });
      }

      await lockExpiredRoom(io, roomId);
      const freshRoom = await Room.findById(roomId);
      socket.join(roomId);
      
      // Check follow for frontend timer hide
      const [userA, userB] = room.participants;
      const hasFollow = await Follow.findOne({
        $or: [{ followerId: userA, followingId: userB }, { followerId: userB, followingId: userA }]
      });

      callback?.({
        ok: true,
        timeLeft: hasFollow ? 999999 : (freshRoom ? getRoomTimeLeft(freshRoom) : 0), // Follow hone par unlimted time dikhayega
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

  // Timer loop for active rooms
  setInterval(async () => {
    const rooms = await Room.find({ status: "active" }).limit(500);
    await Promise.all(
      rooms.map(async (room) => {
        const roomId = room._id.toString();
        
        // Timer update bhejte waqt bhi follow check karenge
        const [userA, userB] = room.participants;
        const hasFollow = await Follow.findOne({
          $or: [{ followerId: userA, followingId: userB }, { followerId: userB, followingId: userA }]
        });

        if (hasFollow) {
          io.to(roomId).emit("timer_update", { roomId, timeLeft: 999999, serverTime: new Date().toISOString() });
        } else {
          const timeLeft = getRoomTimeLeft(room);
          io.to(roomId).emit("timer_update", { roomId, timeLeft, serverTime: new Date().toISOString() });
          if (timeLeft <= 0) await lockExpiredRoom(io, roomId);
        }
      })
    );
  }, 1000);
}
