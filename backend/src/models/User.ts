import mongoose, { InferSchemaType } from "mongoose";

const profileImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    isPrimary: { type: Boolean, default: false }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    authProvider: { type: String, enum: ["google", "phone", "mock"], required: true },
    providerId: { type: String, required: true, index: true },
    phone: { type: String, index: true },
    email: { type: String, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    age: { type: Number, min: 18, max: 99, required: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    lookingFor: [{ type: String, enum: ["male", "female", "other"] }],
    bio: { type: String, default: "", maxlength: 240 },
    interests: [{ type: String, trim: true, lowercase: true }],
    profilePictures: [profileImageSchema],
    isFemaleVerified: { type: Boolean, default: false },
    credits: { type: Number, default: 20, min: 0 },
    isOnline: { type: Boolean, default: false },
    lastSeenAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

userSchema.index({ authProvider: 1, providerId: 1 }, { unique: true });
userSchema.index({ gender: 1 });

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId };
export const User = mongoose.model("User", userSchema);
