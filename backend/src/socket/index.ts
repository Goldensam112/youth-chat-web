import jwt from "jsonwebtoken";
import type { Server } from "socket.io";
import { env } from "../config/env.js";
import { Message } from "../models/Message.js";
import { Room } from "../models/Room.js";
import { User } from "../models/User.js";
import { Follow } from "../models/Follow.js"; 
import { setSocketServer } from "./notifier.js";
import { getRoomTimeLeft, isRoomExpired } from "../utils/timer.js";

// 🔄 Har user ke billing interval timers track karne ke liye registry
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

// 🔥 NAYA UTILITY FUNCTION: Har 1 minute par credit deduct karne wala loop
function startUserBilling(io: Server, socket: any, userId: string, roomId: string) {
  // Purana koi timer chal raha ho is user ka to pehle clean karein
  if (userBillingTimers.has(userId)) {
    clearInterval(userBillingTimers.get(userId));
  }

  const intervalId = setInterval(async () => {
    try {
      const user = await User.findById(userId);

      // 1. Check karo credits bache hain ya nahi (Minimum 1 chahiye)
      if (!user || user.credits < 1) {
        // Room status lock update karo database me
        await Room.findByIdAndUpdate(roomId, { status: "locked" });

        // Room ke sabhi users ko block page event trigger bhejo
        io.to(roomId).emit("room_lock", { 
          roomId, 
          lockedAt: new Date().toISOString(), 
          reason: "insufficient_credits" 
        });

        clearInterval(intervalId);
        userBillingTimers.delete(userId);
        return;
      }

      // 2. Credits deduct karo
      user.credits -= 1;
      await user.save();

      // 3. Frontend ko realtime automatic balance push karo (CreditPill handle ke liye)
      socket.emit("balance_updated", { credits: user.credits });

    } catch (err) {
      console.error("Billing logic loop integration failure:", err);
      clearInterval(intervalId);
      userBillingTimers.delete(userId);
    }
  }, 60000); // Perfect 60000ms = 1 Minute

  userBillingTimers.set(userId, intervalId);
}

// 🛑 Billing timer clear karne ka wrapper function
function stopUserBilling(userId: string) {
  if (userBillingTimers.has(userId)) {
    clearInterval(userBillingTimers.get(userId));
    userBillingTimers.delete(userId);
  }
}

// --- ROOM EXPIRY CHECKER WITH FOLLOW BYPASS ---
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

        socket.join(room._id.toString());
        
        // ✅ Direct Chat chalu hote hi per-minute charging start kar do
        startUserBilling(io, socket, userId, room._id.toString());
        
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
      
      // ✅ Jaise hi user room join karta hai (chahe direct ho ya match se), billing timer trigger ho jayega
      if (freshRoom && freshRoom.status === "active") {
        startUserBilling(io, socket, userId, roomId);
      }
      
      const [userA, userB] = room.participants;
      const hasFollow = await Follow.findOne({
        $or: [{ followerId: userA, followingId: userB }, { followerId: userB, followingId: userA }]
      });

      callback?.({
        ok: true,
        timeLeft: hasFollow ? 999999 : (freshRoom ? getRoomTimeLeft(freshRoom) : 0), 
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

    // ✅ Room chorne ya tab browser back karne par us banda ka billing interval band karein
    socket.on("leave_room", () => {
      stopUserBilling(userId);
    });

    socket.on("disconnect", async () => {
      stopUserBilling(userId); // Billing stop
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
