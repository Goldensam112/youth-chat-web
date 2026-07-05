"use client";

import { MessageCircle, Radar, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import type { Room, User } from "@/lib/types";
import { useChatStore } from "@/store/useChatStore";
import { Button } from "./Button";
import { CreditPill } from "./CreditPill";

export function Dashboard() {
  const { user, queueStatus, setQueueStatus, setRoom, setTimeLeft } = useChatStore();

  async function findMatch() {
    setQueueStatus("queued");
    const res = await api<{ status: "queued" | "matched"; room?: Room; timeLeft?: number }>("/api/match/find", { method: "POST" });
    if (res.status === "matched" && res.room) {
      setRoom(res.room);
      setTimeLeft(res.timeLeft ?? 60);
      setQueueStatus("matched");
    }
  }

  if (!user) return null;

  return (
    <aside className="grid content-start gap-4">
      <div className="rounded-lg border border-line bg-panel p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-white/60">Signed in as</p>
            <h2 className="text-xl font-bold">{user.name}</h2>
          </div>
          <CreditPill credits={user.credits} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {user.interests.map((interest) => (
            <span key={interest} className="rounded-md border border-line px-2 py-1 text-xs text-white/72">
              {interest}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-line bg-panel p-4">
        <div className="mb-4 flex items-center gap-2">
          <Radar className="h-5 w-5 text-mint" />
          <h3 className="font-semibold">Discovery</h3>
        </div>
        <Button className="w-full" onClick={findMatch} disabled={queueStatus === "queued"}>
          <MessageCircle className="h-4 w-4" />
          {queueStatus === "queued" ? "Finding..." : "Find Someone"}
        </Button>
      </div>

      <div className="rounded-lg border border-line bg-panel p-4">
        <div className="flex gap-3">
          <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-gold" />
          <p className="text-sm leading-6 text-white/68">
            Female verification and ad/payment callbacks are modeled as backend-controlled flows for production hardening.
          </p>
        </div>
      </div>
    </aside>
  );
}
