import mongoose from "mongoose";
import { Room } from "../models/Room.js";
import { User } from "../models/User.js";
import { WalletTransaction } from "../models/WalletTransaction.js";

export async function creditUser(userId: string, amount: number, type: "ad_reward" | "purchase" | "signup_bonus", metadata = {}) {
  const session = await mongoose.startSession();
  return session.withTransaction(async () => {
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { credits: amount } },
      { new: true, session }
    );
    if (!user) throw new Error("User not found");

    const [transaction] = await WalletTransaction.create(
      [
        {
          user: user._id,
          type,
          direction: "credit",
          amount,
          balanceAfter: user.credits,
          metadata
        }
      ],
      { session }
    );

    return { user, transaction };
  }).finally(() => session.endSession());
}

// 🛠️ UPGRADED FUNCTION: Ab yeh dynamic interval system aur continuous billing handle karega
export async function unlockRoomWithCredits(roomId: string, userId: string) {
  const session = await mongoose.startSession();
  return session.withTransaction(async () => {
    const room = await Room.findById(roomId).session(session);
    if (!room) throw new Error("Room not found");
    
    // Male participant parameters safety verification
    if (room.maleUser.toString() !== userId) throw new Error("Only the male participant can unlock this room");

    const user = await User.findById(userId).session(session);
    if (!user) throw new Error("User not found");
    
    // Check balance validity triggers
    if (user.credits < 10) throw new Error("Insufficient credits! Please earn or recharge credits.");

    // 10 credits debit process sequence logic mapping
    user.credits -= 10;
    await user.save({ session });

    const [transaction] = await WalletTransaction.create(
      [
        {
          user: user._id,
          room: room._id,
          type: "room_unlock",
          direction: "debit",
          amount: 10,
          balanceAfter: user.credits
        }
      ],
      { session }
    );

    // Dynamic timer updates settings: triggers extra 60 seconds interval tracking
    room.status = "active";
    room.freeWindowStartedAt = new Date();
    room.freeWindowSeconds = 60; // 60 seconds temporary extension allocated
    room.unlockedAt = new Date();
    room.unlockedByTransaction = transaction._id;
    await room.save({ session });

    return { room, user, transaction };
  }).finally(() => session.endSession());
}

// ➕ NAYA FUNCTION: Har 1 min baad check karega aur automatic deduction call karega backend loops se
export async function chargeRecurringCredits(roomId: string, userId: string) {
  const session = await mongoose.startSession();
  return session.withTransaction(async () => {
    const room = await Room.findById(roomId).session(session);
    if (!room) throw new Error("Room tracking target missing.");
    if (room.status !== "active") return { room, status: "inactive" };

    const user = await User.findById(userId).session(session);
    if (!user) throw new Error("User metadata sync crash.");

    // Agar balance khatam hai toh automatic lock room trigger execute hoga
    if (user.credits < 10) {
      room.status = "locked";
      await room.save({ session });
      return { room, user, status: "locked_due_to_insufficient_funds" };
    }

    // Dynamic minute billing logic triggered: cuts 10 credits from balance
    user.credits -= 10;
    await user.save({ session });

    const [transaction] = await WalletTransaction.create(
      [
        {
          user: user._id,
          room: room._id,
          type: "room_unlock", // Recurring charge logged as session extension
          direction: "debit",
          amount: 10,
          balanceAfter: user.credits
        }
      ],
      { session }
    );

    // Extend window tracking by resetting baseline parameter arrays
    room.freeWindowStartedAt = new Date();
    room.freeWindowSeconds = 60; // Agla 1 minute active transaction mode par chala gaya
    await room.save({ session });

    return { room, user, transaction, status: "charged_successfully" };
  }).finally(() => session.endSession());
}
