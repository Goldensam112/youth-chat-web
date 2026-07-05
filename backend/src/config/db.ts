import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDatabase() {
  mongoose.set("strictQuery", true);
  mongoose.set("autoIndex", env.NODE_ENV !== "production");
  await mongoose.connect(env.MONGODB_URI);
}
