import { Room } from "../models/Room.js";
import { User, type UserDocument } from "../models/User.js";

type QueueEntry = {
  userId: string;
  joinedAt: number;
};

const queue: QueueEntry[] = [];

function scoreMatch(a: UserDocument, b: UserDocument) {
  const aInterests = new Set(a.interests ?? []);
  const shared = (b.interests ?? []).filter((interest) => aInterests.has(interest));
  return shared.length;
}

function accepts(a: UserDocument, b: UserDocument) {
  return (a.lookingFor ?? []).includes(b.gender);
}

export async function findOrQueueUser(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const activeRoom = await Room.findOne({ participants: user._id, status: { $in: ["active", "locked"] } });
  if (activeRoom) return { status: "matched" as const, room: activeRoom };

  const candidates = await User.find({
    _id: { $in: queue.map((entry) => entry.userId).filter((id) => id !== userId) }
  });

  const compatible = candidates
    .filter((candidate) => accepts(user, candidate) && accepts(candidate, user))
    .sort((a, b) => scoreMatch(user, b) - scoreMatch(user, a));

  const partner = compatible[0];
  if (!partner) {
    if (!queue.some((entry) => entry.userId === userId)) queue.push({ userId, joinedAt: Date.now() });
    return { status: "queued" as const };
  }

  const partnerIndex = queue.findIndex((entry) => entry.userId === partner._id.toString());
  if (partnerIndex >= 0) queue.splice(partnerIndex, 1);

  const participants = [user, partner];
  const male = participants.find((participant) => participant.gender === "male");
  const female = participants.find((participant) => participant.gender === "female");
  if (!male || !female) throw new Error("Timed monetization requires a male/female match");

  const userInterests = new Set(user.interests ?? []);
  const sharedInterests = (partner.interests ?? []).filter((interest) => userInterests.has(interest));

  const room = await Room.create({
    participants: participants.map((participant) => participant._id),
    maleUser: male._id,
    femaleUser: female._id,
    sharedInterests,
    freeWindowStartedAt: new Date(),
    freeWindowSeconds: 60
  });

  return { status: "matched" as const, room };
}

export function removeFromQueue(userId: string) {
  const index = queue.findIndex((entry) => entry.userId === userId);
  if (index >= 0) queue.splice(index, 1);
}
