import mongoose, { InferSchemaType } from "mongoose";

const safetyReportSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reason: { type: String, required: true, maxlength: 120 },
    details: { type: String, default: "", maxlength: 500 },
    status: { type: String, enum: ["open", "reviewed", "dismissed"], default: "open" }
  },
  { timestamps: true }
);

export type SafetyReportDocument = InferSchemaType<typeof safetyReportSchema> & { _id: mongoose.Types.ObjectId };
export const SafetyReport = mongoose.model("SafetyReport", safetyReportSchema);
