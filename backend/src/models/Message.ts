import mongoose, { InferSchemaType } from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, maxlength: 1000 },
    deliveredAt: { type: Date, default: Date.now },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

export type MessageDocument = InferSchemaType<typeof messageSchema> & { _id: mongoose.Types.ObjectId };
export const Message = mongoose.model("Message", messageSchema);
