import crypto from "crypto";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../utils/auth.js";
import { env } from "../config/env.js";
import { creditUser } from "../services/walletService.js";
import { WalletTransaction } from "../models/WalletTransaction.js";

const router = Router();

const adSchema = z.object({
  adSessionId: z.string().min(8),
  completedAt: z.string().datetime(),
  signature: z.string().min(20)
});

function signAdPayload(userId: string, adSessionId: string, completedAt: string) {
  return crypto
    .createHmac("sha256", env.AD_CALLBACK_SECRET)
    .update(`${userId}.${adSessionId}.${completedAt}`)
    .digest("hex");
}

router.post("/ad-session", requireAuth, async (req, res) => {
  const adSessionId = crypto.randomUUID();
  const completedAt = new Date().toISOString();
  const signature = signAdPayload(req.user!._id.toString(), adSessionId, completedAt);
  res.json({ adSessionId, completedAt, signature });
});

router.get("/transactions", requireAuth, async (req, res, next) => {
  try {
    const transactions = await WalletTransaction.find({ user: req.user!._id }).sort({ createdAt: -1 }).limit(30);
    res.json({ transactions });
  } catch (error) {
    next(error);
  }
});

router.post("/daily-bonus", requireAuth, async (req, res, next) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const existing = await WalletTransaction.findOne({
      user: req.user!._id,
      type: "ad_reward",
      "metadata.source": "daily_bonus",
      createdAt: { $gte: startOfDay }
    });
    if (existing) return res.status(409).json({ message: "Daily bonus already claimed" });

    const result = await creditUser(req.user!._id.toString(), 5, "ad_reward", { source: "daily_bonus" });
    res.json({ user: result.user, transaction: result.transaction });
  } catch (error) {
    next(error);
  }
});

router.post("/earn-credits", requireAuth, async (req, res, next) => {
  try {
    const input = adSchema.parse(req.body);
    const expected = signAdPayload(req.user!._id.toString(), input.adSessionId, input.completedAt);
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(input.signature))) {
      return res.status(403).json({ message: "Invalid rewarded ad signature" });
    }

    const existing = await WalletTransaction.findOne({ externalRef: input.adSessionId });
    if (existing) return res.status(409).json({ message: "Ad reward already claimed" });

    const result = await creditUser(req.user!._id.toString(), 20, "ad_reward", { adSessionId: input.adSessionId });
    result.transaction.externalRef = input.adSessionId;
    result.transaction.provider = "mock-rewarded-ad";
    await result.transaction.save();

    res.json({ user: result.user, transaction: result.transaction });
  } catch (error) {
    next(error);
  }
});

router.post("/purchase", requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({ packageId: z.enum(["starter_50", "plus_150", "max_500"]) });
    const { packageId } = schema.parse(req.body);
    const amount = packageId === "starter_50" ? 50 : packageId === "plus_150" ? 150 : 500;
    const result = await creditUser(req.user!._id.toString(), amount, "purchase", { packageId, provider: "mock-payment" });
    res.json({ user: result.user, transaction: result.transaction });
  } catch (error) {
    next(error);
  }
});

export default router;
