import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../utils/auth.js";
import { User } from "../models/User.js";

const router = Router();

const updateProfileSchema = z.object({
  name: z.string().min(2).max(60),
  bio: z.string().max(240),
  interests: z.array(z.string().min(2).max(40)).min(1).max(12),
  lookingFor: z.array(z.enum(["male", "female", "other"])).min(1),
  profilePictures: z.array(z.object({ url: z.string().url(), isPrimary: z.boolean().default(false) })).max(6).optional()
});

router.patch("/", requireAuth, async (req, res, next) => {
  try {
    const input = updateProfileSchema.parse(req.body);
    const user = await User.findByIdAndUpdate(
      req.user!._id,
      {
        ...input,
      interests: input.interests.map((interest) => interest.trim().toLowerCase())
      },
      { new: true }
    );
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

export default router;
