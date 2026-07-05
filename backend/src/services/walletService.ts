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

export async function unlockRoomWithCredits(roomId: string, userId: string) {
  const session = await mongoose.startSession();
  return session.withTransaction(async () => {
    const room = await Room.findById(roomId).session(session);
    if (!room) throw new Error("Room not found");
    if (room.maleUser.toString() !== userId) throw new Error("Only the male participant can unlock this room");
    if (room.status !== "locked") throw new Error("Room is not locked");

    const user = await User.findById(userId).session(session);
    if (!user) throw new Error("User not found");
    if (user.credits < 10) throw new Error("Insufficient credits");

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

    room.status = "active";
    room.freeWindowStartedAt = new Date();
    room.freeWindowSeconds = 60;
    room.unlockedAt = new Date();
    room.unlockedByTransaction = transaction._id;
    await room.save({ session });

    return { room, user, transaction };
  }).finally(() => session.endSession());
}
