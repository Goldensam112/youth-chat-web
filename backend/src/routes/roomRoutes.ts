import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../utils/auth.js";
import { Room } from "../models/Room.js";
import { Message } from "../models/Message.js";
import { SafetyReport } from "../models/SafetyReport.js";
import { getRoomTimeLeft } from "../utils/timer.js";
import { unlockRoomWithCredits } from "../services/walletService.js";

const router = Router();

router.get("/:roomId", requireAuth, async (req, res, next) => {
  try {
    const roomId = String(req.params.roomId);
    const room = await Room.findById(roomId).populate("participants", "name gender bio interests profilePictures isOnline");
    if (!room) throw new Error("Room not found");
    if (!room.participants.some((participant: any) => participant._id.toString() === req.user!._id.toString())) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const messages = await Message.find({ room: room._id }).sort({ createdAt: 1 }).limit(100);
    res.json({ room, messages, timeLeft: getRoomTimeLeft(room), serverTime: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

router.post("/:roomId/unlock", requireAuth, async (req, res, next) => {
  try {
    const result = await unlockRoomWithCredits(String(req.params.roomId), req.user!._id.toString());
    res.json({
      room: result.room,
      user: result.user,
      transaction: result.transaction,
      timeLeft: getRoomTimeLeft(result.room),
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:roomId/report", requireAuth, async (req, res, next) => {
  try {
    const room = await Room.findById(String(req.params.roomId));
    if (!room) throw new Error("Room not found");
    if (!room.participants.some((participantId) => participantId.toString() === req.user!._id.toString())) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const schema = z.object({
      reason: z.string().min(3).max(120),
      details: z.string().max(500).default("")
    });
    const input = schema.parse(req.body);
    const report = await SafetyReport.create({ room: room._id, reporter: req.user!._id, ...input });
    res.json({ report });
  } catch (error) {
    next(error);
  }
});

router.post("/:roomId/close", requireAuth, async (req, res, next) => {
  try {
    const room = await Room.findById(String(req.params.roomId));
    if (!room) throw new Error("Room not found");
    if (!room.participants.some((participantId) => participantId.toString() === req.user!._id.toString())) {
      return res.status(403).json({ message: "Forbidden" });
    }

    room.status = "closed";
    await room.save();
    res.json({ room });
  } catch (error) {
    next(error);
  }
});

export default router;
