import { Schema, model, Document } from 'mongoose';

// Yeh system ko samjha raha hai ki ek Follow ke andar kya-kya likha hoga
export interface IFollow extends Document {
  followerId: Schema.Types.ObjectId;  // Jo ladka recharge karke follow kar raha hai
  followingId: Schema.Types.ObjectId; // Jise follow kiya ja raha hai (e.g., Girl)
  createdAt: Date;                    // Kis time par follow kiya
}

// Yeh database ke liye ek sancha (mould) hai
const FollowSchema = new Schema<IFollow>({
  followerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  followingId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

// Isse ek user kisi ko ek hi baar follow kar payega, baar-baar nahi
FollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

export const Follow = model<IFollow>('Follow', FollowSchema);
