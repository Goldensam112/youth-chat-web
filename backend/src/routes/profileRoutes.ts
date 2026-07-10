import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../utils/auth.js";
import { User } from "../models/User.js";
import { Follow } from "../models/Follow.js"; 
import { Block } from "../models/Block.js";   

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

// ⚡ Dynamic Single User Status API Fetching for Chat Screen
router.get("/user/:id", requireAuth, async (req, res, next) => {
  try {
    const myId = String(req.user!._id);
    const targetId = String(req.params.id);

    const targetUser = await User.findById(targetId).select("name gender bio profilePictures").lean();
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const followRecord = await Follow.findOne({ followerId: myId, followingId: targetId });

    res.json({
      success: true,
      user: targetUser,
      isFollowing: !!followRecord,
      isMutual: followRecord ? followRecord.isMutual : false
    });
  } catch (error) {
    next(error);
  }
});

// ➕ INSTAGRAM STYLE PAID/AD EXCLUSIVE CONTROLLER ROUTE (CRASH FIXED!)
router.post("/user/:id/follow", requireAuth, async (req, res, next) => {
  try {
    const followerId = String(req.user!._id); 
    const followingId = String(req.params.id); 
    
    let bodyData = req.body || {};
    if (typeof bodyData === 'string') {
      try { bodyData = JSON.parse(bodyData); } catch(e) {}
    }

    const viaAd = bodyData.viaAd || req.query.viaAd === 'true';
    const viaRecharge = bodyData.viaRecharge || req.query.viaRecharge === 'true';

    if (followerId === followingId) {
      return res.status(400).json({ success: false, message: "Aap khud ko connection mein add nahi kar sakte!" });
    }

    const isBlocked = await Block.findOne({
      $or: [
        { blockerId: followerId, blockedId: followingId },
        { blockerId: followingId, blockedId: followerId }
      ]
    });

    if (isBlocked) {
      return res.status(403).json({ success: false, message: "Action not allowed." });
    }

    const existingFollow = await Follow.findOne({ followerId, followingId });

    if (existingFollow) {
      // 🔓 UNFOLLOW IS ALWAYS FREE: Isme viaAd / viaRecharge ki zaroorat nahi hai!
      await Follow.deleteOne({ _id: existingFollow._id });
      await Follow.updateOne({ followerId: followingId, followingId: followerId }, { isMutual: false });
      return res.json({ success: true, isFollowing: false, isMutual: false, message: "Connection se hataya gaya" });
    } else {
      // 🔒 NAYA FOLLOW FREE MEI BLOCK HAI: Yahan check lagna chahiye
      if (!viaAd && !viaRecharge) {
        return res.status(403).json({ 
          success: false, 
          message: "Free me follow nahi hoga bhai! 3 Ads dekho ya ₹20 ka recharge karo." 
        });
      }

      const frontFollow = await Follow.findOne({ followerId: followingId, followingId: followerId });
      const mutual = frontFollow ? true : false;

      await Follow.create({ followerId, followingId, isMutual: mutual });

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

router.post("/user/:id/block", requireAuth, async (req, res, next) => {
  try {
    const myId = String(req.user!._id);
    const targetId = String(req.params.id);

    if (myId === targetId) {
      return res.status(400).json({ success: false, message: "Aap khud ko block nahi kar sakte!" });
    }

    const existingBlock = await Block.findOne({ blockerId: myId, blockedId: targetId });

    if (existingBlock) {
      await Block.deleteOne({ _id: existingBlock._id });
      return res.json({ success: true, isBlocked: false, message: "User ko unblock kiya gaya" });
    } else {
      await Block.create({ blockerId: myId, blockedId: targetId });
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

router.get("/my-connections", requireAuth, async (req, res, next) => {
  try {
    const myId = String(req.user!._id); 
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

router.get("/my-blocks", requireAuth, async (req, res, next) => {
  try {
    const myId = String(req.user!._id);
    const blocks = await Block.find({ blockerId: myId })
      .populate("blockedId", "name username bio profilePictures") 
      .lean();

    const formattedBlocks = blocks
      .map((b) => b.blockedId)
      .filter(Boolean);

    res.json({ success: true, data: formattedBlocks });
  } catch (error) {
    console.error("Get Blocks Backend Error:", error);
    res.status(500).json({ success: false, message: "Backend error inside get blocks." });
  }
});

export default router;
