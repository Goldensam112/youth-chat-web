"use client";

import { Clapperboard, CreditCard, Lock, Unlock } from "lucide-react";
import { api } from "@/lib/api";
import type { Room, User } from "@/lib/types";
import { useChatStore } from "@/store/useChatStore";
import { Button } from "./Button";

export function LockOverlay() {
  const { room, user, setUser, setRoom, setTimeLeft } = useChatStore();
  if (!room || room.status !== "locked") return null;

  async function watchAd() {
    const session = await api<{ adSessionId: string; completedAt: string; signature: string }>("/api/wallet/ad-session", {
      method: "POST"
    });
    const res = await api<{ user: User }>("/api/wallet/earn-credits", {
      method: "POST",
      body: JSON.stringify(session)
    });
    setUser(res.user);
  }

  async function buyCredits() {
    const res = await api<{ user: User }>("/api/wallet/purchase", {
      method: "POST",
      body: JSON.stringify({ packageId: "starter_50" })
    });
    setUser(res.user);
  }

  async function unlock() {
    if (!room) return;
    const roomId = room._id;
    const res = await api<{ room: Room; user: User; timeLeft: number }>(`/api/rooms/${roomId}/unlock`, { method: "POST" });
    setRoom(res.room);
    setUser(res.user);
    setTimeLeft(res.timeLeft);
  }

  const canUnlock = user?.gender === "male" && (user?.credits ?? 0) >= 10;

  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-ink/88 p-4 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-lg border border-line bg-panel p-5 text-center shadow-glow">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-coral/18">
          <Lock className="h-7 w-7 text-coral" />
        </div>
        <h2 className="mt-4 text-xl font-bold">Chat locked</h2>
        <p className="mt-2 text-sm leading-6 text-white/68">
          The free minute is over. Resume this room with credits or earn more through a rewarded ad.
        </p>
        <div className="mt-5 grid gap-3">
          <Button onClick={unlock} disabled={!canUnlock}>
            <Unlock className="h-4 w-4" />
            Spend 10 Credits
          </Button>
          <Button variant="secondary" onClick={watchAd}>
            <Clapperboard className="h-4 w-4" />
            Watch Ad to Earn 20
          </Button>
          <Button variant="secondary" onClick={buyCredits}>
            <CreditCard className="h-4 w-4" />
            Buy Credits Pack
          </Button>
        </div>
      </div>
    </div>
  );
}
