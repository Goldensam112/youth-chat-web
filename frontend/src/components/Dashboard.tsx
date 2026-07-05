"use client";

import { Clapperboard, Compass, CreditCard, Gem, LogOut, MessageCircle, Radar, ShieldCheck, Sparkles, UserRoundCheck, Wallet } from "lucide-react";
import { api } from "@/lib/api";
import type { Room, User } from "@/lib/types";
import { useChatStore } from "@/store/useChatStore";
import { Button } from "./Button";
import { CreditPill } from "./CreditPill";

export function Dashboard() {
  const { user, room, queueStatus, setUser, setQueueStatus, setRoom, setTimeLeft, setMessages } = useChatStore();

  async function findMatch() {
    setQueueStatus("queued");
    const res = await api<{ status: "queued" | "matched"; room?: Room; timeLeft?: number }>("/api/match/find", { method: "POST" });
    if (res.status === "matched" && res.room) {
      setRoom(res.room);
      setTimeLeft(res.timeLeft ?? 60);
      setQueueStatus("matched");
    }
  }

  async function watchAd() {
    const session = await api<{ adSessionId: string; completedAt: string; signature: string }>("/api/wallet/ad-session", { method: "POST" });
    const res = await api<{ user: User }>("/api/wallet/earn-credits", {
      method: "POST",
      body: JSON.stringify(session)
    });
    setUser(res.user);
  }

  async function buyPack() {
    const res = await api<{ user: User }>("/api/wallet/purchase", {
      method: "POST",
      body: JSON.stringify({ packageId: "starter_50" })
    });
    setUser(res.user);
  }

  function logout() {
    window.localStorage.removeItem("pulse_token");
    setUser(null);
    setRoom(null);
    setMessages([]);
    setQueueStatus("idle");
  }

  if (!user) return null;

  return (
    <aside className="grid content-start gap-4">
      <div className="overflow-hidden rounded-lg border border-line bg-panel">
        <div className="bg-[linear-gradient(135deg,rgba(83,230,177,0.18),rgba(255,209,102,0.09))] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <img
                className="h-14 w-14 shrink-0 rounded-lg border border-line bg-ink object-cover"
                src={user.profilePictures[0]?.url ?? `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(user.name)}`}
                alt=""
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-xl font-bold">{user.name}</h2>
                  {user.gender === "female" && user.isFemaleVerified ? <UserRoundCheck className="h-4 w-4 text-mint" /> : null}
                </div>
                <p className="text-sm capitalize text-white/62">{user.age} • {user.gender}</p>
              </div>
            </div>
            <button
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line bg-ink text-white/72 hover:text-white"
              onClick={logout}
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="grid gap-4 p-4">
          <p className="text-sm leading-6 text-white/62">{user.bio}</p>
          <div className="flex flex-wrap gap-2">
            {user.interests.map((interest) => (
              <span key={interest} className="rounded-md border border-line bg-ink px-2 py-1 text-xs capitalize text-white/72">
                {interest}
              </span>
            ))}
          </div>
          <CreditPill credits={user.credits} />
        </div>
      </div>

      <div className="rounded-lg border border-line bg-panel p-4 shadow-glow">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Radar className="h-5 w-5 text-mint" />
            <h3 className="font-semibold">Discovery</h3>
          </div>
          <span className={`rounded-md px-2 py-1 text-xs font-semibold ${queueStatus === "queued" ? "bg-gold text-ink" : room ? "bg-mint text-ink" : "bg-ink text-white/62"}`}>
            {queueStatus === "queued" ? "Searching" : room ? "In room" : "Idle"}
          </span>
        </div>
        <p className="mb-4 text-sm leading-6 text-white/62">Find a compatible user by gender preference and shared tags. Open another browser/incognito profile to test matching.</p>
        <Button className="w-full" onClick={findMatch} disabled={queueStatus === "queued"}>
          <MessageCircle className="h-4 w-4" />
          {queueStatus === "queued" ? "Finding..." : "Find Someone"}
        </Button>
      </div>

      <div className="rounded-lg border border-line bg-panel p-4">
        <div className="mb-4 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-gold" />
          <h3 className="font-semibold">Wallet</h3>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-line bg-ink p-3">
            <Gem className="h-4 w-4 text-gold" />
            <p className="mt-2 text-lg font-bold">{user.credits}</p>
            <p className="text-xs text-white/45">Credits</p>
          </div>
          <button className="rounded-lg border border-line bg-ink p-3 text-left hover:border-mint" onClick={watchAd}>
            <Clapperboard className="h-4 w-4 text-mint" />
            <p className="mt-2 text-sm font-bold">Earn 20</p>
            <p className="text-xs text-white/45">Reward ad</p>
          </button>
          <button className="rounded-lg border border-line bg-ink p-3 text-left hover:border-mint" onClick={buyPack}>
            <CreditCard className="h-4 w-4 text-coral" />
            <p className="mt-2 text-sm font-bold">Buy 50</p>
            <p className="text-xs text-white/45">Mock pack</p>
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-panel p-4">
        <div className="flex gap-3">
          <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-gold" />
          <p className="text-sm leading-6 text-white/68">
            Safety controls are designed into the data model. Add report, block, moderation queue, and real verification before public scale.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-line bg-panel p-3">
          <Compass className="h-4 w-4 text-mint" />
          <p className="mt-2 text-sm font-semibold">Interest match</p>
        </div>
        <div className="rounded-lg border border-line bg-panel p-3">
          <Sparkles className="h-4 w-4 text-gold" />
          <p className="mt-2 text-sm font-semibold">60 sec hook</p>
        </div>
      </div>
    </aside>
  );
}
