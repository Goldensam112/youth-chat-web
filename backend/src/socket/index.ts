import jwt from "jsonwebtoken";
import type { Server } from "socket.io";
import { env } from "../config/env.js";
import { Message } from "../models/Message.js";
import { Room } from "../models/Room.js";
import { User } from "../models/User.js";
import { Follow } from "../models/Follow.js"; 
import { setSocketServer } from "./notifier.js";
import { getRoomTimeLeft, isRoomExpired } from "../utils/timer.js";

// 🔄 Har active room ke 60-second structural dynamic billing countdown tracker maps
const roomCountdownRegistry = new Map<string, number>();
const userBillingTimers = new Map();

type SocketUser = {
  id: string;
  name: string;
};

declare module "socket.io" {
  interface Socket {
    user?: SocketUser;
  }
}

// 🔥 UPGRADED UTILITY: Har 1 minute par 10 credit deduct karne wala engine
function startUserBilling(io: Server, socket: any, userId: string, roomId: string) {
  if (userBillingTimers.has(userId)) {
    clearInterval(userBillingTimers.get(userId));
  }

  const intervalId = setInterval(async () => {
    try {
      const user = await User.findById(userId);

      // 1. Minimum 10 credits hona compulsory hai har minute chat extend karne ke liye
      if (!user || user.credits < 10) {
        await Room.findByIdAndUpdate(roomId, { status: "locked" });

        io.to(roomId).emit("room_lock", { 
          roomId, 
          lockedAt: new Date().toISOString(), 
          reason: "insufficient_credits" 
        });

        clearInterval(intervalId);
        userBillingTimers.delete(userId);
        roomCountdownRegistry.delete(roomId);
        return;
      }

      // 2. Continuous session validation: Cuts exactly 10 credits per minute
      user.credits -= 10;
      await user.save();

      // 3. Sync real-time balance metrics with client dashboard pills
      socket.emit("balance_updated", { credits: user.credits });

      // 4. Reset checkout loop constraints: Reset room timer countdown array back to 60 seconds
      roomCountdownRegistry.set(roomId, 60);

    } catch (err) {
      console.error("Billing logic loop integration failure:", err);
      clearInterval(intervalId);
      userBillingTimers.delete(userId);
    }
  }, 60000); // Perfect 1 Minute interval tracker logic

  userBillingTimers.set(userId, intervalId);
}

function stopUserBilling(userId: string) {
  if (userBillingTimers.has(userId)) {
    clearInterval(userBillingTimers.get(userId));
    userBillingTimers.delete(userId);
  }
}

async function lockExpiredRoom(io: Server, roomId: string) {
  const room = await Room.findById(roomId);
  if (!room || room.status !== "active") return room;

  const [userA, userB] = room.participants;
  const hasFollowRelationship = await Follow.findOne({
    $or: [
      { followerId: userA, followingId: userB },
      { followerId: userB, followingId: userA }
    ]
  });

  // Agar paid follow context hai toh standard chronological expiration module bypass hoga
  if (hasFollowRelationship) {
    return room;
  }

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

    // --- DIRECT CHAT ROOM ---
    socket.on("start_direct_chat", async ({ targetUserId }, callback) => {
      try {
        const isFollowed = await Follow.findOne({
          $or: [
            { followerId: userId, followingId: targetUserId },
            { followerId: targetUserId, followingId: userId }
          ]
        });

        if (!isFollowed) {
          return callback?.({ ok: false, message: "Bhai pehle follow (₹20 ya 3 ads) karna padega!" });
        }

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
          room.status = "active";
          await room.save();
        }

        const roomIdStr = room._id.toString();
        socket.join(roomIdStr);
        
        // Baseline alignment data for tracking: start from 60 seconds window limit
        if (!roomCountdownRegistry.has(roomIdStr)) {
          roomCountdownRegistry.set(roomIdStr, 60);
        }
        
        startUserBilling(io, socket, userId, roomIdStr);
        callback?.({ ok: true, roomId: roomIdStr });

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
      const roomIdStr = roomId.toString();
      socket.join(roomIdStr);
      
      const [userA, userB] = room.participants;
      const hasFollow = await Follow.findOne({
        $or: [{ followerId: userA, followingId: userB }, { followerId: userB, followingId: userA }]
      });

      if (freshRoom && freshRoom.status === "active") {
        startUserBilling(io, socket, userId, roomIdStr);
        // If follow logic is true, initialize premium dynamic 60s runtime check parameters
        if (hasFollow && !roomCountdownRegistry.has(roomIdStr)) {
          roomCountdownRegistry.set(roomIdStr, 60);
        }
      }
      
      let finalTimeLeft = 0;
      if (hasFollow) {
        finalTimeLeft = roomCountdownRegistry.get(roomIdStr) ?? 60;
      } else if (freshRoom) {
        finalTimeLeft = getRoomTimeLeft(freshRoom);
      }

      callback?.({
        ok: true,
        timeLeft: finalTimeLeft, 
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

    socket.on("leave_room", () => {
      stopUserBilling(userId);
    });

    socket.on("disconnect", async () => {
      stopUserBilling(userId); 
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeenAt: new Date() });
      socket.broadcast.emit("presence_update", { userId, isOnline: false });
    });
  });

  // ⏱️ REAL-TIME EMITTER ENGINE LOOP: Updates tick down precisely every second
  setInterval(async () => {
    const rooms = await Room.find({ status: "active" }).limit(500);
    await Promise.all(
      rooms.map(async (room) => {
        const roomId = room._id.toString();
        
        const [userA, userB] = room.participants;
        const hasFollow = await Follow.findOne({
          $or: [{ followerId: userA, followingId: userB }, { followerId: userB, followingId: userA }]
        });

        if (hasFollow) {
          // ⚡ FIX: Static 999999 element drop. Ab dynamic decreasing logic execute hoga.
          let currentSeconds = roomCountdownRegistry.get(roomId) ?? 60;
          currentSeconds = Math.max(0, currentSeconds - 1);
          roomCountdownRegistry.set(roomId, currentSeconds);

          io.to(roomId).emit("timer_update", { 
            roomId, 
            timeLeft: currentSeconds, 
            serverTime: new Date().toISOString() 
          });
        } else {
          const timeLeft = getRoomTimeLeft(room);
          io.to(roomId).emit("timer_update", { roomId, timeLeft, serverTime: new Date().toISOString() });
          if (timeLeft <= 0) await lockExpiredRoom(io, roomId);
        }
      })
    );
  }, 1000);
}
