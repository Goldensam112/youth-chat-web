"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard, Compass, CreditCard, Gem, LogOut, MessageCircle, Radar, ShieldCheck, Sparkles, UserRoundCheck, Wallet, Users, Ban, RefreshCw, Heart } from "lucide-react"; 
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket"; 
import { loadPopunderOnce, openSmartAd } from "@/lib/adsterra";
import type { Room, User, WalletTransaction, Message } from "@/lib/types";
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
  const router = useRouter();
  const { user, room, queueStatus, setUser, setQueueStatus, setRoom, setTimeLeft, setMessages } = useChatStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const [draftBio, setDraftBio] = useState("");
  const [draftInterests, setDraftInterests] = useState("");
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [notice, setNotice] = useState("");

  // 🛠️ Connections & Instagram Feature States
  const [connections, setConnections] = useState<any[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(false);

  useEffect(() => {
    if (!user) return;
    setDraftBio(user.bio);
    setDraftInterests(user.interests.join(", "));
    loadTransactions();
    loadConnections(); 
    loadBlockedUsers();
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

  // 🛠️ Connections list fetch karne ke liye
  async function loadConnections() {
    setLoadingConnections(true);
    try {
      const res = await api<{ success: boolean; data: any[] }>("/api/profile/my-connections");
      if (res.success) {
        setConnections(res.data);
      }
    } catch (err) {
      console.error("Connections fetch failed", err);
    } finally {
      setLoadingConnections(false);
    }
  }

  // 🚫 Blocked users ki list mangwana
  async function loadBlockedUsers() {
    setLoadingBlocks(true);
    try {
      // Backend settings check
      const res = await api<{ success: boolean; data: any[] }>("/api/profile/my-blocks").catch(() => ({ success: true, data: [] }));
      if (res.success) {
        setBlockedUsers(res.data || []);
      }
    } catch (err) {
      console.error("Failed to load blocklist");
    } finally {
      setLoadingBlocks(false);
    }
  }

  // 🔓 User ko dashboard se directly unblock karna
  async function handleUnblock(targetId: string) {
    if (!confirm("क्या aap is user ko unblock karna chahte hain?")) return;
    try {
      const res = await api<{ success: boolean; message?: string }>(`/api/profile/user/${targetId}/block`, {
        method: "POST"
      });
      if (res.success) {
        setNotice("User successfully unblocked!");
        loadBlockedUsers();
      }
    } catch (err) {
      setNotice("Unblock action failure.");
    }
  }

  async function startDirectChat(targetUserId: string) {
    setNotice("Connecting room...");
    const socket = getSocket();
    if (!socket) {
      setNotice("Socket connection is not ready. Please try again.");
      return;
    }

    socket.emit("start_direct_chat", { targetUserId }, async (res: { ok: boolean; roomId?: string; message?: string }) => {
      if (res.ok && res.roomId) {
        try {
          const freshRoomDetails = await api<{ room: Room; messages: Message[]; timeLeft: number }>(`/api/rooms/${res.roomId}`);
          setRoom(freshRoomDetails.room);
          setMessages(freshRoomDetails.messages);
          setTimeLeft(freshRoomDetails.timeLeft);
          setQueueStatus("matched");
          setNotice("");
          if (onOpenChat) onOpenChat();
        } catch (err) {
          setNotice("Room load karne mein dikkat aayi.");
        }
      } else {
        setNotice(res.message || "Direct chat shuru nahi ho paayi.");
      }
    });
  }

  async function findMatch() {
    loadPopunderOnce();
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
    router.replace("/login");
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
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="truncate text-xl font-bold">{user.name}</h2>
                  {user.gender === "female" && user.isFemaleVerified ? <UserRoundCheck className="h-4 w-4 text-mint" /> : null}
                  
                  {/* 🔴/🔵 Self Instagram Gender Indicator Tag */}
                  {user.gender === "female" ? (
                    <span className="bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[9px] px-1.5 py-0.2 rounded font-bold">Girl</span>
                  ) : (
                    <span className="bg-sky-500/20 text-sky-400 border border-sky-500/20 text-[9px] px-1.5 py-0.2 rounded font-bold">Boy</span>
                  )}
                </div>
                <p className="text-sm capitalize text-white/62">Age: {user.age || "20"}</p>
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
          <p className="text-sm leading-6 text-white/62">{user.bio || "No bio added yet."}</p>
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

      {showProfile ? <BannerAd /> : null}

      {showDiscover ? <div className="rounded-lg border border-line bg-panel p-4 shadow-glow">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Radar className="h-5 w-5 text-mint" />
            <h3 className="font-semibold">Discovery Radar</h3>
          </div>
          <span className={`rounded-md px-2 py-1 text-xs font-semibold ${queueStatus === "queued" ? "bg-gold text-ink" : room ? "bg-mint text-ink" : "bg-ink text-white/62"}`}>
            {queueStatus === "queued" ? "Searching" : room ? "In room" : "Idle"}
          </span>
        </div>
        <p className="mb-4 text-sm leading-6 text-white/62">Find someone based on your preferences and shared interests instantly.</p>
        <Button className="w-full" onClick={findMatch} disabled={queueStatus === "queued"}>
          <MessageCircle className="h-4 w-4" />
          {queueStatus === "queued" ? "Finding Connection..." : "Find Someone"}
        </Button>
        {queueStatus === "queued" ? (
          <Button className="mt-2 w-full" variant="secondary" onClick={cancelSearch}>
            Cancel Search
          </Button>
        ) : null}
        {notice ? <p className="mt-3 rounded-lg border border-line bg-ink p-3 text-sm text-yellow-400 font-medium">{notice}</p> : null}
      </div> : null}

      {/* 🤝 Instagram Style Connections Component */}
      {showDiscover ? (
        <div className="rounded-lg border border-line bg-panel p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-mint" />
              <h3 className="font-semibold text-sm sm:text-base">My Connections</h3>
            </div>
            <button onClick={loadConnections} className="text-xs text-mint flex items-center gap-1 hover:underline">
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>
          
          <div className="max-h-56 overflow-y-auto space-y-2 rounded-lg bg-ink p-2 border border-line">
            {loadingConnections ? (
              <p className="p-3 text-xs text-center text-white/50">Loading friends list...</p>
            ) : connections.length ? (
              connections.map((conn) => (
                <div key={conn._id} className="flex items-center justify-between p-2 rounded-md bg-panel/50 border border-line/40 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <img 
                      className="h-8 w-8 rounded-full border border-line object-cover shrink-0"
                      src={conn.profilePictures?.[0]?.url ?? `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(conn.name)}`}
                      alt=""
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-bold truncate">@{conn.username || conn.name}</p>
                        {/* Mutual Connection Heart tag */}
                        <Heart className="h-2.5 w-2.5 text-rose-500 fill-rose-500" title="Mutual Follow" />
                      </div>
                      <p className="text-[10px] text-white/45 truncate max-w-[120px]">{conn.bio || "No bio yet"}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => startDirectChat(conn._id)}
                    className="text-xs bg-mint text-ink font-bold px-3 py-1.5 rounded-md hover:opacity-90 transition-all shrink-0"
                  >
                    Chat
                  </button>
                </div>
              ))
            ) : (
              <p className="p-3 text-xs text-center text-white/45">Bhai, abhi tak koi connection nahi juda hai. Chat screen par unhe follow karke yahan list banayein!</p>
            )}
          </div>
        </div>
      ) : null}

      {/* 🚫 Instagram Style Blocklist Panel Component */}
      {showDiscover || showProfile ? (
        <div className="rounded-lg border border-line bg-panel p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-red-400" />
              <h3 className="font-semibold text-sm">Blocked Accounts</h3>
            </div>
            <button onClick={loadBlockedUsers} className="text-xs text-white/40 hover:text-white flex items-center gap-1">
              <RefreshCw className="h-2.5 w-2.5" /> Reload
            </button>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-2 rounded-lg bg-ink p-2 border border-line">
            {loadingBlocks ? (
              <p className="p-2 text-xs text-center text-white/50">Fetching blocklist...</p>
            ) : blockedUsers.length ? (
              blockedUsers.map((bUser) => (
                <div key={bUser._id} className="flex items-center justify-between p-1.5 rounded bg-panel/40 border border-line/30">
                  <span className="text-xs font-semibold text-white/80 truncate max-w-[140px]">
                    {bUser.name || "Blocked Stranger"}
                  </span>
                  <button
                    onClick={() => handleUnblock(bUser._id)}
                    className="text-[10px] border border-red-500/50 text-red-400 font-bold px-2 py-1 rounded hover:bg-red-500 hover:text-white transition"
                  >
                    Unblock
                  </button>
                </div>
              ))
            ) : (
              <p className="p-2 text-[11px] text-center text-white/30">Koi bhi account blocked nahi hai.</p>
            )}
          </div>
        </div>
      ) : null}

      {showWallet ? <div className="rounded-lg border border-line bg-panel p-4">
        <div className="mb-4 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-gold" />
          <h3 className="font-semibold">Wallet Balance</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
            <p className="text-xs text-white/45">Pack</p>
          </button>
          <button className="rounded-lg border border-line bg-ink p-3 text-left hover:border-mint" onClick={claimDailyBonus}>
            <Sparkles className="h-4 w-4 text-mint" />
            <p className="mt-2 text-sm font-bold">Daily +5</p>
            <p className="text-xs text-white/45">Claim</p>
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
      </div> : null}

      {showDiscover || showProfile ? (
        <div className="rounded-lg border border-line bg-panel p-4">
          <div className="flex gap-3">
            <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-gold" />
            <p className="text-sm leading-6 text-white/68">
              Use report or close room any time a conversation does not feel right. Safe youth framework integrated.
            </p>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
