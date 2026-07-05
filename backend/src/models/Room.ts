import mongoose, { InferSchemaType } from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    maleUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    femaleUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sharedInterests: [{ type: String }],
    status: { type: String, enum: ["active", "locked", "closed"], default: "active", index: true },
    freeWindowStartedAt: { type: Date, required: true },
    freeWindowSeconds: { type: Number, default: 60 },
    unlockedAt: { type: Date },
    unlockedByTransaction: { type: mongoose.Schema.Types.ObjectId, ref: "WalletTransaction" },
    lastMessageAt: { type: Date }
  },
  { timestamps: true }
);

roomSchema.index({ participants: 1, status: 1 });

export type RoomDocument = InferSchemaType<typeof roomSchema> & { _id: mongoose.Types.ObjectId };
export const Room = mongoose.model("Room", roomSchema);
