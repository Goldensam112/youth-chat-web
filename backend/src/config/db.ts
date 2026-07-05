import mongoose from "mongoose";
import { env } from "./env.js";
import { User } from "../models/User.js";

export async function connectDatabase() {
  mongoose.set("strictQuery", true);
  mongoose.set("autoIndex", env.NODE_ENV !== "production");
  await mongoose.connect(env.MONGODB_URI);
  await dropParallelArrayUserIndexes();
}

async function dropParallelArrayUserIndexes() {
  const indexes = await User.collection.indexes();
  const badIndexes = indexes.filter((index) => {
    const keys = Object.keys(index.key);
    return keys.includes("interests") && keys.includes("lookingFor");
  });

  for (const index of badIndexes) {
    if (index.name) await User.collection.dropIndex(index.name);
  }
}
