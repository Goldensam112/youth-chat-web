import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes.js";
import matchRoutes from "./routes/matchRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

  app.get("/health", (_req, res) => res.json({ ok: true, at: new Date().toISOString() }));
  app.use("/api/auth", authRoutes);
  app.use("/api/match", matchRoutes);
  app.use("/api/profile", profileRoutes);
  app.use("/api/rooms", roomRoutes);
  app.use("/api/wallet", walletRoutes);
  app.use(errorHandler);

  return app;
}
