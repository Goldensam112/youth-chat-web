import { Router } from "express";
import { requireAuth } from "../utils/auth.js";
import { findOrQueueUser, removeFromQueue } from "../services/matchService.js";
import { getRoomTimeLeft } from "../utils/timer.js";

const router = Router();

router.post("/find", requireAuth, async (req, res, next) => {
  try {
    const result = await findOrQueueUser(req.user!._id.toString());
    if (result.status === "queued") return res.json({ status: "queued" });

    res.json({
      status: "matched",
      room: result.room,
      serverTime: new Date().toISOString(),
      timeLeft: getRoomTimeLeft(result.room)
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/queue", requireAuth, async (req, res) => {
  removeFromQueue(req.user!._id.toString());
  res.status(204).send();
});

export default router;
