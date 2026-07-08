import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../utils/auth.js";
import { User } from "../models/User.js";
import { Follow } from "../models/Follow.js"; // Connections manage karne ke liye

const router = Router();

const updateProfileSchema = z.object({
  name: z.string().min(2).max(60),
  bio: z.string().max(240),
  interests: z.array(z.string().min(2).max(40)).min(1).max(12),
  lookingFor: z.array(z.enum(["male", "female", "other"])).min(1),
  profilePictures: z.array(z.object({ url: z.string().url(), isPrimary: z.boolean().default(false) })).max(6).optional()
});

// 🔒 Purana Profile Update Feature (Bilkul Safe Hai)
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

// ➕ NAYA ROUTE: Kisi user ko follow/unfollow (Connection mein add) karne ke liye action
router.post("/user/:id/follow", requireAuth, async (req, res, next) => {
  try {
    const followerId = req.user!._id; // ✅ Fixed: Added ! for TypeScript
    const followingId = req.params.id; // Jise follow/connection mein add karna hai

    if (followerId.toString() === followingId.toString()) {
      return res.status(400).json({ success: false, message: "Aap khud ko connection mein add nahi kar sakte!" });
    }

    // Check karo kya pehle se follow kiya hua hai
    const existingFollow = await Follow.findOne({ followerId, followingId });

    if (existingFollow) {
      // Agar pehle se h, toh unfollow (connection se hatao)
      await Follow.deleteOne({ _id: existingFollow._id });
      return res.json({ success: true, isFollowing: false, message: "Connection se hataya gaya" });
    } else {
      // Agar nahi h, toh follow (connection mein jodo)
      await Follow.create({ followerId, followingId });
      return res.json({ success: true, isFollowing: true, message: "Connection mein joda gaya" });
    }
  } catch (error) {
    next(error);
  }
});

// 🛠️ NAYA ROUTE: Purane Connections (Followed Users) ki list nikalna
router.get("/my-connections", requireAuth, async (req, res, next) => {
  try {
    const myId = req.user!._id; // ✅ Fixed: Added ! for TypeScript

    // Un logo ko dhoondho jinhe is user ne follow kiya hai
    const connections = await Follow.find({ followerId: myId })
      .populate("followingId", "name username bio profilePictures") // Samne wale ki details pull karna
      .lean();

    // Data ko saaf karke sirf un users ki list banana jinhe follow kiya hai
    const formattedConnections = connections
      .map((c) => c.followingId)
      .filter(Boolean);

    res.json({ success: true, data: formattedConnections });
  } catch (error) {
    next(error);
  }
});

export default router;
