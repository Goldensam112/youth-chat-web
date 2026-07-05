import mongoose, { InferSchemaType } from "mongoose";

const walletTransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
    type: {
      type: String,
      enum: ["signup_bonus", "ad_reward", "room_unlock", "purchase"],
      required: true
    },
    direction: { type: String, enum: ["credit", "debit"], required: true },
    amount: { type: Number, required: true, min: 1 },
    balanceAfter: { type: Number, required: true, min: 0 },
    provider: { type: String },
    externalRef: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed }
  },
  { timestamps: true }
);

walletTransactionSchema.index({ user: 1, createdAt: -1 });
walletTransactionSchema.index({ externalRef: 1 }, { sparse: true });

export type WalletTransactionDocument = InferSchemaType<typeof walletTransactionSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const WalletTransaction = mongoose.model("WalletTransaction", walletTransactionSchema);
