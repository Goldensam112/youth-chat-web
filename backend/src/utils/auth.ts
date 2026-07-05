import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";
import { User, type UserDocument } from "../models/User.js";

export type AuthPayload = {
  sub: string;
};

export function signToken(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "14d" });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (!token) return res.status(401).json({ message: "Missing bearer token" });

    const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: UserDocument;
    }
  }
}
