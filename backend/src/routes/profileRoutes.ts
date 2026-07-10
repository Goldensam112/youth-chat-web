import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../utils/auth.js";
import { User } from "../models/User.js";
import { Follow } from "../models/Follow.js"; // Connections manage karne ke liye
import { Block } from "../models/Block.js";   // Block manage karne ke liye [Naya]

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

// ➕ UPGRADED ROUTE: Instagram Style Follow / Unfollow & Follow Back
router.post("/user/:id/follow", requireAuth, async (req, res, next) => {
  try {
    const followerId = String(req.user!._id); 
    const followingId = String(req.params.id); 

    if (followerId === followingId) {
      return res.status(400).json({ success: false, message: "Aap khud ko connection mein add nahi kar sakte!" });
    }

    // Check karo kya samne wale ne aapko block kar rakha hai ya aapne usko?
    const isBlocked = await Block.findOne({
      $or: [
        { blockerId: followerId, blockedId: followingId },
        { blockerId: followingId, blockedId: followerId }
      ]
    });

    if (isBlocked) {
      return res.status(403).json({ success: false, message: "Action not allowed." });
    }

    // Check karo kya pehle se follow kiya hua hai
    const existingFollow = await Follow.findOne({ followerId, followingId });

    if (existingFollow) {
      // 1. Agar pehle se h, toh unfollow (connection se hatao)
      await Follow.deleteOne({ _id: existingFollow._id });
      
      // Dosti toot gayi, toh samne wale ka isMutual bhi false kar do
      await Follow.updateOne({ followerId: followingId, followingId: followerId }, { isMutual: false });

      return res.json({ success: true, isFollowing: false, isMutual: false, message: "Connection se hataya gaya" });
    } else {
      // 2. Agar nahi h, toh follow karo aur check karo ki kya samne wale ne bhi follow kiya hua hai? (Follow Back)
      const frontFollow = await Follow.findOne({ followerId: followingId, followingId: followerId });
      const mutual = frontFollow ? true : false;

      await Follow.create({ followerId, followingId, isMutual: mutual });

      // Agar samne wale ne pehle se follow kiya tha, toh uski file me bhi isMutual true kar do
      if (mutual) {
        await Follow.updateOne({ followerId: followingId, followingId: followerId }, { isMutual: true });
      }

      return res.json({ 
        success: true, 
        isFollowing: true, 
        isMutual: mutual, 
        message: mutual ? "Aap dono ab dost hain (Follow Back)!" : "Connection mein joda gaya" 
      });
    }
  } catch (error) {
    console.error("Follow Action Backend Error:", error);
    res.status(500).json({ success: false, message: "Backend crash logs triggered inside follow." });
  }
});

// 🛠️ NAYA ROUTE: Instagram Style Block / Unblock Feature
router.post("/user/:id/block", requireAuth, async (req, res, next) => {
  try {
    const myId = String(req.user!._id);
    const targetId = String(req.params.id);

    if (myId === targetId) {
      return res.status(400).json({ success: false, message: "Aap khud ko block nahi kar sakte!" });
    }

    // Check karo kya pehle se block hai?
    const existingBlock = await Block.findOne({ blockerId: myId, blockedId: targetId });

    if (existingBlock) {
      // Agar pehle se block hai, toh ab Unblock kar do
      await Block.deleteOne({ _id: existingBlock._id });
      return res.json({ success: true, isBlocked: false, message: "User ko unblock kiya gaya" });
    } else {
      // Agar block nahi tha, toh naya Block banao
      await Block.create({ blockerId: myId, blockedId: targetId });

      // Block karte hi ek dusre ka follow data turant saaf kar do (Instagram rule)
      await Follow.deleteMany({
        $or: [
          { followerId: myId, followingId: targetId },
          { followerId: targetId, followingId: myId }
        ]
      });

      return res.json({ success: true, isBlocked: true, message: "User ko block kar diya gaya hai" });
    }
  } catch (error) {
    console.error("Block Action Backend Error:", error);
    res.status(500).json({ success: false, message: "Backend crash logs triggered inside block." });
  }
});

// 🛠️ Purane Connections ki list nikalna
router.get("/my-connections", requireAuth, async (req, res, next) => {
  try {
    const myId = String(req.user!._id); 

    // Un logo ko dhoondho jinhe is user ne follow kiya hai
    const connections = await Follow.find({ followerId: myId })
      .populate("followingId", "name username bio profilePictures")
      .lean();

    const formattedConnections = connections
      .map((c) => c.followingId)
      .filter(Boolean);

    res.json({ success: true, data: formattedConnections });
  } catch (error) {
    console.error("Get Connections Backend Error:", error);
    res.status(500).json({ success: false, message: "Backend crash logs triggered inside get connections." });
  }
});

export default router;
