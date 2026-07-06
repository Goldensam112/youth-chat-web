"use client";

import { useEffect, useState } from "react";
import { Clapperboard, Compass, CreditCard, Gem, LogOut, MessageCircle, Radar, ShieldCheck, Sparkles, UserRoundCheck, Wallet } from "lucide-react";
import { api } from "@/lib/api";
import { loadPopunderOnce, openSmartAd } from "@/lib/adsterra";
import type { Room, User, WalletTransaction } from "@/lib/types";
import { useChatStore } from "@/store/useChatStore";
import { BannerAd } from "./ads/BannerAd";
import { NativeAd } from "./ads/NativeAd";
import { Button } from "./Button";
import { CreditPill } from "./CreditPill";

type DashboardProps = {
  mobileTab?: "discover" | "wallet" | "profile";
  onOpenChat?: () => void;
};

export function Dashboard({ mobileTab, onOpenChat }: DashboardProps) {
  const { user, room, queueStatus, setUser, setQueueStatus, setRoom, setTimeLeft, setMessages } = useChatStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const [draftBio, setDraftBio] = useState("");
  const [draftInterests, setDraftInterests] = useState("");
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!user) return;
    setDraftBio(user.bio);
    setDraftInterests(user.interests.join(", "));
    loadTransactions();
  }, [user?._id]);

  useEffect(() => {
    if (queueStatus !== "queued") return;

    const interval = window.setInterval(async () => {
      try {
        const res = await api<{ status: "queued" | "matched"; room?: Room; timeLeft?: number }>("/api/match/find", { method: "POST" });
        if (res.status === "matched" && res.room) {
          setRoom(res.room);
          setTimeLeft(res.timeLeft ?? 60);
          setQueueStatus("matched");
          setNotice("");
          onOpenChat?.();
        }
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Unable to continue search.");
      }
    }, 2500);

    return () => window.clearInterval(interval);
  }, [queueStatus, onOpenChat, setQueueStatus, setRoom, setTimeLeft]);

  async function findMatch() {
    setNotice("");
    setQueueStatus("queued");
    const res = await api<{ status: "queued" | "matched"; room?: Room; timeLeft?: number }>("/api/match/find", { method: "POST" });
    if (res.status === "matched" && res.room) {
      setRoom(res.room);
      setTimeLeft(res.timeLeft ?? 60);
      setQueueStatus("matched");
      onOpenChat?.();
    } else {
      setNotice("Searching for someone with a matching vibe...");
    }
  }

  async function cancelSearch() {
    await api<void>("/api/match/queue", { method: "DELETE" });
    setQueueStatus("idle");
    setNotice("Search cancelled.");
  }

  async function loadTransactions() {
    const res = await api<{ transactions: WalletTransaction[] }>("/api/wallet/transactions");
    setTransactions(res.transactions);
  }

  async function claimDailyBonus() {
    try {
      const res = await api<{ user: User }>("/api/wallet/daily-bonus", { method: "POST" });
      setUser(res.user);
      setNotice("+5 daily credits added.");
      await loadTransactions();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Daily bonus failed.");
    }
  }

  async function watchAd() {
    openSmartAd();
    loadPopunderOnce();
    const session = await api<{ adSessionId: string; completedAt: string; signature: string }>("/api/wallet/ad-session", { method: "POST" });
    const res = await api<{ user: User }>("/api/wallet/earn-credits", {
      method: "POST",
      body: JSON.stringify(session)
    });
    setUser(res.user);
    setNotice("+20 credits earned from rewarded ad.");
    await loadTransactions();
  }

  async function buyPack() {
    const res = await api<{ user: User }>("/api/wallet/purchase", {
      method: "POST",
      body: JSON.stringify({ packageId: "starter_50" })
    });
    setUser(res.user);
    setNotice("+50 credits added to your wallet.");
    await loadTransactions();
  }

  async function saveProfile() {
    if (!user) return;
    const interests = draftInterests
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 12);
    const res = await api<{ user: User }>("/api/profile", {
      method: "PATCH",
      body: JSON.stringify({
        name: user.name,
        bio: draftBio,
        interests,
        lookingFor: user.lookingFor,
        profilePictures: user.profilePictures
      })
    });
    setUser(res.user);
    setProfileOpen(false);
    setNotice("Profile updated.");
  }

  function logout() {
    window.localStorage.removeItem("pulse_token");
    setUser(null);
    setRoom(null);
    setMessages([]);
    setQueueStatus("idle");
  }

  if (!user) return null;
  const showAll = !mobileTab;
  const showProfile = showAll || mobileTab === "profile";
  const showDiscover = showAll || mobileTab === "discover";
  const showWallet = showAll || mobileTab === "wallet";

  return (
    <aside className="grid content-start gap-4">
      {showProfile ? <div className="overflow-hidden rounded-lg border border-line bg-panel">
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
          <Button variant="secondary" onClick={() => setProfileOpen((open) => !open)}>
            <UserRoundCheck className="h-4 w-4" />
            Edit Profile
          </Button>
          {profileOpen ? (
            <div className="grid gap-3 rounded-lg border border-line bg-ink p-3">
              <label className="grid gap-2 text-xs font-semibold text-white/62">
                Bio
                <textarea
                  className="min-h-20 resize-none rounded-lg border border-line bg-panel p-3 text-sm text-white outline-none focus:border-mint"
                  value={draftBio}
                  onChange={(event) => setDraftBio(event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-xs font-semibold text-white/62">
                Interests, comma separated
                <input
                  className="h-11 rounded-lg border border-line bg-panel px-3 text-sm text-white outline-none focus:border-mint"
                  value={draftInterests}
                  onChange={(event) => setDraftInterests(event.target.value)}
                />
              </label>
              <Button onClick={saveProfile}>Save Profile</Button>
            </div>
          ) : null}
        </div>
      </div> : null}

      {showDiscover ? <div className="rounded-lg border border-line bg-panel p-4 shadow-glow">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Radar className="h-5 w-5 text-mint" />
            <h3 className="font-semibold">Discovery</h3>
          </div>
          <span className={`rounded-md px-2 py-1 text-xs font-semibold ${queueStatus === "queued" ? "bg-gold text-ink" : room ? "bg-mint text-ink" : "bg-ink text-white/62"}`}>
            {queueStatus === "queued" ? "Searching" : room ? "In room" : "Idle"}
          </span>
        </div>
        <p className="mb-4 text-sm leading-6 text-white/62">Find someone based on your preferences and shared interests.</p>
        <Button className="w-full" onClick={findMatch} disabled={queueStatus === "queued"}>
          <MessageCircle className="h-4 w-4" />
          {queueStatus === "queued" ? "Finding..." : "Find Someone"}
        </Button>
        {queueStatus === "queued" ? (
          <Button className="mt-2 w-full" variant="secondary" onClick={cancelSearch}>
            Cancel Search
          </Button>
        ) : null}
        {notice ? <p className="mt-3 rounded-lg border border-line bg-ink p-3 text-sm text-white/65">{notice}</p> : null}
      </div> : null}

      {showDiscover ? <NativeAd /> : null}

      {showWallet ? <div className="rounded-lg border border-line bg-panel p-4">
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
            <p className="text-xs text-white/45">Credit pack</p>
          </button>
          <button className="rounded-lg border border-line bg-ink p-3 text-left hover:border-mint" onClick={claimDailyBonus}>
            <Sparkles className="h-4 w-4 text-mint" />
            <p className="mt-2 text-sm font-bold">Daily +5</p>
            <p className="text-xs text-white/45">Once a day</p>
          </button>
        </div>
        <div className="mt-4 max-h-48 overflow-y-auto rounded-lg border border-line bg-ink">
          {transactions.length ? (
            transactions.slice(0, 8).map((transaction) => (
              <div key={transaction._id} className="flex items-center justify-between border-b border-line px-3 py-2 last:border-b-0">
                <div>
                  <p className="text-xs font-semibold capitalize">{transaction.type.replace("_", " ")}</p>
                  <p className="text-[11px] text-white/42">{new Date(transaction.createdAt).toLocaleString()}</p>
                </div>
                <p className={`text-sm font-bold ${transaction.direction === "credit" ? "text-mint" : "text-coral"}`}>
                  {transaction.direction === "credit" ? "+" : "-"}
                  {transaction.amount}
                </p>
              </div>
            ))
          ) : (
            <p className="p-3 text-sm text-white/50">No wallet history yet.</p>
          )}
        </div>
        <div className="mt-4">
          <BannerAd />
        </div>
      </div> : null}

      {showDiscover || showProfile ? <div className="rounded-lg border border-line bg-panel p-4">
        <div className="flex gap-3">
          <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-gold" />
          <p className="text-sm leading-6 text-white/68">
            Use report or close room any time a conversation does not feel right.
          </p>
        </div>
      </div> : null}

      {showDiscover ? <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-line bg-panel p-3">
          <Compass className="h-4 w-4 text-mint" />
          <p className="mt-2 text-sm font-semibold">Interest match</p>
        </div>
        <div className="rounded-lg border border-line bg-panel p-3">
          <Sparkles className="h-4 w-4 text-gold" />
          <p className="mt-2 text-sm font-semibold">60 sec hook</p>
        </div>
      </div> : null}
    </aside>
  );
}
