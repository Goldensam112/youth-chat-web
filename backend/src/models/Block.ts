import { Schema, model, Document } from 'mongoose';

export interface IBlock extends Document {
  blockerId: Schema.Types.ObjectId; // Block karne wala user
  blockedId: Schema.Types.ObjectId; // Block hone wala user
  createdAt: Date;
}

const BlockSchema = new Schema<IBlock>({
  blockerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  blockedId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

// Ek user kisi ko ek hi baar block kar sakega
BlockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

export const Block = model<IBlock>('Block', BlockSchema);
