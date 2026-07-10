import { Schema, model, Document } from 'mongoose';

export interface IFollow extends Document {
  followerId: Schema.Types.ObjectId;  // Jo follow kar raha hai
  followingId: Schema.Types.ObjectId; // Jise follow kiya ja raha hai
  isMutual: boolean;                  // [Naya Feature] Kya dono ne ek dusre ko follow kiya hai? (Follow Back)
  createdAt: Date;
}

const FollowSchema = new Schema<IFollow>({
  followerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  followingId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  isMutual: { type: Boolean, default: false }, // Shuruat mein ye false rahega
  createdAt: { type: Date, default: Date.now }
});

FollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

export const Follow = model<IFollow>('Follow', FollowSchema);
