import { Router } from "express";
import { z } from "zod";
import { User } from "../models/User.js";
import { signToken, requireAuth } from "../utils/auth.js";
import { WalletTransaction } from "../models/WalletTransaction.js";

const router = Router();

const loginSchema = z.object({
  authProvider: z.enum(["google", "phone", "mock"]),
  providerId: z.string().min(2),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  name: z.string().min(2),
  age: z.number().min(18).max(99),
  gender: z.enum(["male", "female", "other"]),
  lookingFor: z.array(z.enum(["male", "female", "other"])).min(1),
  bio: z.string().max(240).default(""),
  interests: z.array(z.string()).min(1).max(12),
  profilePictures: z.array(z.object({ url: z.string().url(), isPrimary: z.boolean().default(false) })).default([])
});

router.post("/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const normalizedInterests = input.interests.map((interest) => interest.trim().toLowerCase());

    let user = await User.findOne({ authProvider: input.authProvider, providerId: input.providerId });
    if (!user) {
      user = await User.create({ ...input, interests: normalizedInterests, credits: 20 });
      await WalletTransaction.create({
        user: user._id,
        type: "signup_bonus",
        direction: "credit",
        amount: 20,
        balanceAfter: user.credits
      });
    } else {
      user.set({ ...input, interests: normalizedInterests });
      await user.save();
    }

    res.json({ token: signToken(user._id.toString()), user });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

export default router;
