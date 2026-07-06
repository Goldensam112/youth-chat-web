import mongoose, { InferSchemaType } from "mongoose";

const matchQueueSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true, index: true },
    lookingFor: [{ type: String, enum: ["male", "female", "other"] }],
    interests: [{ type: String }],
    status: { type: String, enum: ["waiting", "matched", "cancelled", "expired"], default: "waiting", index: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
    matchedWith: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastActiveAt: { type: Date, default: Date.now, index: true },
    expiresAt: { type: Date, required: true, index: true }
  },
  { timestamps: true }
);

matchQueueSchema.index({ user: 1, status: 1 });

export type MatchQueueDocument = InferSchemaType<typeof matchQueueSchema> & { _id: mongoose.Types.ObjectId };
export const MatchQueue = mongoose.model("MatchQueue", matchQueueSchema);
