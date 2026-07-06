import { MatchQueue } from "../models/MatchQueue.js";
import { Room } from "../models/Room.js";
import { User, type UserDocument } from "../models/User.js";
import { emitMatchFound } from "../socket/notifier.js";

const QUEUE_TIMEOUT_MS = 2 * 60 * 1000;

function scoreMatch(a: UserDocument, b: UserDocument) {
  const aInterests = new Set(a.interests ?? []);
  const shared = (b.interests ?? []).filter((interest) => aInterests.has(interest));
  return shared.length;
}

function sharedInterests(a: UserDocument, b: UserDocument) {
  const aInterests = new Set(a.interests ?? []);
  return (b.interests ?? []).filter((interest) => aInterests.has(interest));
}

function accepts(a: UserDocument, b: UserDocument) {
  return (a.lookingFor ?? []).includes(b.gender);
}

function queueExpiry() {
  return new Date(Date.now() + QUEUE_TIMEOUT_MS);
}

export async function findOrQueueUser(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const activeRoom = await Room.findOne({ participants: user._id, status: { $in: ["active", "locked"] } });
  if (activeRoom) return { status: "matched" as const, room: activeRoom };

  await expireOldQueueEntries();

  const waitingEntries = await MatchQueue.find({
    user: { $ne: user._id },
    status: "waiting",
    expiresAt: { $gt: new Date() },
    gender: { $in: user.lookingFor }
  })
    .sort({ createdAt: 1 })
    .limit(100)
    .populate<{ user: UserDocument }>("user");

  const compatible = waitingEntries
    .filter((entry) => entry.user && accepts(user, entry.user) && accepts(entry.user, user))
    .sort((a, b) => scoreMatch(user, b.user) - scoreMatch(user, a.user));

  const partnerEntry = compatible[0];
  if (!partnerEntry) {
    await MatchQueue.findOneAndUpdate(
      { user: user._id, status: "waiting" },
      {
        user: user._id,
        gender: user.gender,
        lookingFor: user.lookingFor,
        interests: user.interests,
        lastActiveAt: new Date(),
        expiresAt: queueExpiry()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return { status: "queued" as const, timeoutSeconds: Math.floor(QUEUE_TIMEOUT_MS / 1000) };
  }

  const claimed = await MatchQueue.findOneAndUpdate(
    { _id: partnerEntry._id, status: "waiting" },
    { status: "matched", matchedWith: user._id },
    { new: true }
  );
  if (!claimed) return findOrQueueUser(userId);

  await MatchQueue.updateMany({ user: user._id, status: "waiting" }, { status: "matched", matchedWith: partnerEntry.user._id });

  const participants = [user, partnerEntry.user];
  const male = participants.find((participant) => participant.gender === "male");
  const female = participants.find((participant) => participant.gender === "female");
  if (!male || !female) throw new Error("Timed monetization requires a male/female match");

  const room = await Room.create({
    participants: participants.map((participant) => participant._id),
    maleUser: male._id,
    femaleUser: female._id,
    sharedInterests: sharedInterests(user, partnerEntry.user),
    freeWindowStartedAt: new Date(),
    freeWindowSeconds: 60
  });

  await MatchQueue.updateMany(
    { user: { $in: participants.map((participant) => participant._id) }, status: "matched", room: { $exists: false } },
    { room: room._id }
  );

  emitMatchFound(room);
  return { status: "matched" as const, room };
}

export async function removeFromQueue(userId: string) {
  await MatchQueue.updateMany({ user: userId, status: "waiting" }, { status: "cancelled" });
}

async function expireOldQueueEntries() {
  await MatchQueue.updateMany({ status: "waiting", expiresAt: { $lte: new Date() } }, { status: "expired" });
}
