"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Clock3, Flag, MessageSquareDashed, Send, Shield, Sparkles, TimerReset, X, Zap, UserPlus, MoreVertical, Ban, Check, UserCheck } from "lucide-react";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import type { Message, Room } from "@/lib/types";
import { useChatStore } from "@/store/useChatStore";
import { BannerAd } from "./ads/BannerAd";
import { NativeAd } from "./ads/NativeAd";
import { Button } from "./Button";
import { LockOverlay } from "./LockOverlay";
import AdFollowPopup from "./ads/AdFollowPopup";

export function ChatViewport({ mobile = false }: { mobile?: boolean }) {
  const { room, user, messages, timeLeft, typingUser, setRoom, setMessages, addMessage, setTimeLeft, setTypingUser, setUser } =
    useChatStore();
  const [body, setBody] = useState("");
  const [roomNotice, setRoomNotice] = useState("");
  const [sending, setSending] = useState(false);
  
  const [isAdPopupOpen, setIsAdPopupOpen] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);
  
  // Instagram Style Extra States
  const [showMenu, setShowMenu] = useState(false);
  const [followStatus, setFollowStatus] = useState<{ isFollowing: boolean; isMutual: boolean }>({ isFollowing: false, isMutual: false });
  const [opponentDetails, setOpponentDetails] = useState<{ name: string; gender: string } | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const roomId = room?._id;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!roomId) return;
    api<{ room: Room; messages: Message[]; timeLeft: number }>(`/api/rooms/${roomId}`).then((res) => {
      setRoom(res.room);
      setMessages(res.messages);
      setTimeLeft(res.timeLeft);
    });
  }, [roomId, setMessages, setRoom, setTimeLeft]);

  useEffect(() => {
    if (!room || !user) return;
    const targetUserId = room.participants.find(p => p !== user?._id);
    if (!targetUserId) return;

    api<{ success: boolean; user?: { name: string; gender: string }; isFollowing?: boolean; isMutual?: boolean }>(`/api/profile/user/${targetUserId}`).then((res) => {
      if (res.user) {
        setOpponentDetails({
          name: res.user.name || "Stranger",
          gender: res.user.gender || "unknown"
        });
      }
      setFollowStatus({
        isFollowing: res.isFollowing || false,
        isMutual: res.isMutual || false
      });
    }).catch(() => {
      setOpponentDetails({ name: "Chat Partner", gender: "unknown" });
    });
  }, [room, user]);

  useEffect(() => {
    if (!roomId) return;
    const socket = getSocket();
    if (!socket) return;

    socket.emit("join_room", { roomId }, (res: { ok: boolean; timeLeft: number; status: Room["status"] }) => {
      if (res.ok) {
        setTimeLeft(res.timeLeft);
        useChatStore.setState((state) => (state.room ? { room: { ...state.room, status: res.status } } : state));
      }
    });

    const handleMessage = ({ message }: { message: Message }) => addMessage(message);
    const handleTimer = ({ roomId: eventRoomId, timeLeft: nextTimeLeft }: { roomId: string; timeLeft: number }) => {
      if (eventRoomId === roomId) setTimeLeft(nextTimeLeft);
    };
    const handleLock = ({ roomId: eventRoomId }: { roomId: string }) => {
      if (eventRoomId !== roomId) return;
      useChatStore.setState((state) => (state.room ? { room: { ...state.room, status: "locked" } } : state));
    };
    const handleTyping = ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      setTypingUser(isTyping ? userId : null);
    };
    const handleBalanceUpdated = (data: { credits: number }) => {
      if (user) setUser({ ...user, credits: data.credits });
    };

    socket.on("message:new", handleMessage);
    socket.on("timer_update", handleTimer);
    socket.on("room_lock", handleLock);
    socket.on("typing", handleTyping);
    socket.on("balance_updated", handleBalanceUpdated);

    return () => {
      socket.off("message:new", handleMessage);
      socket.off("timer_update", handleTimer);
      socket.off("room_lock", handleLock);
      socket.off("typing", handleTyping);
      socket.off("balance_updated", handleBalanceUpdated);
    };
  }, [roomId, addMessage, setTimeLeft, setTypingUser, user, setUser]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const displayTimer = useMemo(() => {
    const minutes = Math.floor(timeLeft / 60).toString().padStart(2, "0");
    const seconds = (timeLeft % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [timeLeft]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!room || sending || !body.trim() || room.status !== "active") return;
    const socket = getSocket();
    if (!socket) {
      setRoomNotice("Connection is not ready. Please try again.");
      return;
    }
    const messageBody = body.trim();
    setSending(true);
    setBody("");
    socket.emit("send_message", { roomId: room._id, body: messageBody }, (res: { ok: boolean; message?: string }) => {
      setSending(false);
      if (!res.ok) {
        setRoomNotice(res.message ?? "Message could not be sent.");
        setBody(messageBody);
      }
    });
  }

  function emitTyping(value: string) {
    setBody(value);
    if (!room) return;
    getSocket()?.emit("typing", { roomId: room._id, isTyping: value.length > 0 });
  }

  async function toggleFollowAction() {
    if (!room || !user) return;
    setLoadingFollow(true);
    try {
      const targetUserId = room.participants.find(p => p !== user?._id);
      const res = await api<{ success: boolean; isFollowing: boolean; isMutual: boolean; message?: string }>(`/api/profile/user/${targetUserId}/follow`, {
        method: "POST"
      });

      if (res.success) {
        setFollowStatus({ isFollowing: res.isFollowing, isMutual: res.isMutual });
        setRoomNotice(res.message || "Action updated successfully!");
      } else {
        setRoomNotice(res.message || "Failed to update connection status.");
      }
    } catch (err) {
      setRoomNotice("Error executing connection shift.");
    } finally {
      setLoadingFollow(false);
    }
  }

  // ⚡ FIX: Direct `/api/profile/...` aur standard body stringification
  async function followViaRecharge() {
    if (!room || !user) return;
    setLoadingFollow(true);
    try {
      const targetUserId = room.participants.find(p => p !== user?._id);
      const res = await api<{ success: boolean; isFollowing: boolean; isMutual: boolean; message?: string }>(`/api/profile/user/${targetUserId}/follow`, {
        method: "POST",
        body: JSON.stringify({ viaRecharge: true })
      });

      if (res.success) {
        setRoomNotice("Mubarak ho! Connection successfully joda gaya 🎉");
        setFollowStatus({ isFollowing: res.isFollowing, isMutual: res.isMutual });
        useChatStore.setState((state) => (state.room ? { room: { ...state.room, status: "active" } } : state));
        setTimeLeft(60);
      } else {
        setRoomNotice(res.message || "Recharge balance kam hai bhai!");
      }
    } catch (err) {
      setRoomNotice(err instanceof Error ? err.message : "Action execution failure!");
    } finally {
      setLoadingFollow(false);
    }
  }

  // ⚡ FIX: Direct `/api/profile/...` aur standard body stringification
  async function handleAdsSuccess() {
    setIsAdPopupOpen(false);
    if (!room || !user) return;
    try {
      const targetUserId = room.participants.find(p => p !== user?._id);
      const res = await api<{ success: boolean; isFollowing: boolean; isMutual: boolean }>(`/api/profile/user/${targetUserId}/follow`, {
        method: "POST",
        body: JSON.stringify({ viaAd: true })
      });

      if (res.success) {
        setRoomNotice("Mubarak ho! 3 Ads complete hue. Connected!");
        setFollowStatus({ isFollowing: res.isFollowing, isMutual: res.isMutual });
        useChatStore.setState((state) => (state.room ? { room: { ...state.room, status: "active" } } : state));
        setTimeLeft(60);
      }
    } catch (err) {
      setRoomNotice(err instanceof Error ? err.message : "Something went wrong with connection activation!");
    }
  }

  async function triggerBlockUser() {
    if (!room || !user) return;
    setShowMenu(false);
    if (!confirm("Kya aap sach me is user ko block karna chahte hain?")) return;
    
    try {
      const targetUserId = room.participants.find(p => p !== user?._id);
      const res = await api<{ success: boolean; message?: string }>(`/api/profile/user/${targetUserId}/block`, {
        method: "POST"
      });

      if (res.success) {
        alert("User ko block kar diya gaya hai.");
        closeRoom(); 
      }
    } catch (err) {
      setRoomNotice("Block operation failed.");
    }
  }

  async function reportRoom() {
    if (!room) return;
    await api(`/api/rooms/${room._id}/report`, {
      method: "POST",
      body: JSON.stringify({ reason: "User reported from chat", details: "Quick report from live room UI." })
    });
    setRoomNotice("Report submitted for review.");
    setShowMenu(false);
  }

  async function closeRoom() {
    if (!room) return;
    await api(`/api/rooms/${room._id}/close`, { method: "POST" });
    setRoom(null);
    setMessages([]);
    setRoomNotice("");
  }

  if (!room) {
    return (
      <section className={`grid place-items-center overflow-hidden rounded-lg border border-line bg-panel p-5 text-center ${mobile ? "min-h-[calc(100svh-8.5rem)]" : "min-h-[calc(100svh-2rem)]"}`}>
        <div className="max-w-lg">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-lg border border-mint/30 bg-mint/10">
            <MessageSquareDashed className="h-10 w-10 text-mint" />
          </div>
          <h2 className="mt-5 text-2xl font-bold">Your next chat opens here</h2>
          <p className="mt-3 text-sm leading-6 text-white/64">
            Hit Find Someone to create a live room. The backend starts the free 60-second clock at room creation.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ["Live matching", Sparkles],
              ["Server timer", TimerReset],
              ["Credit unlock", Zap]
            ].map(([label, Icon]) => (
              <div key={String(label)} className="rounded-lg border border-line bg-ink p-3">
                <Icon className="mx-auto h-5 w-5 text-gold" />
                <p className="mt-2 text-xs font-semibold">{String(label)}</p>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <BannerAd />
          </div>
          <div className="mt-4">
            <NativeAd />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`relative grid grid-rows-[auto_1fr_auto] overflow-hidden rounded-lg border border-line bg-panel ${mobile ? "h-[calc(100svh-8.5rem)]" : "min-h-[calc(100svh-2rem)]"}`}>
      
      <header className="border-b border-line bg-ink/50 p-3 sm:p-4 relative">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="font-bold text-base truncate max-w-[120px] sm:max-w-[200px]">
                  {opponentDetails?.name || "Stranger"}
                </h2>
                
                {opponentDetails?.gender === "female" && (
                  <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] px-1.5 py-0.5 rounded-full font-bold flex items-center">
                    🔴 Girl
                  </span>
                )}
                {opponentDetails?.gender === "male" && (
                  <span className="bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] px-1.5 py-0.5 rounded-full font-bold flex items-center">
                    🔵 Boy
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/42 truncate mt-0.5">
                {room.sharedInterests.length ? `Interests: ${room.sharedInterests.join(", ")}` : "Live Connected Match"}
              </p>
            </div>

            <button
              onClick={() => {
                if (followStatus.isMutual || followStatus.isFollowing) {
                  toggleFollowAction();
                } else {
                  setRoomNotice("Bhai, free me follow nahi hoga! Niche diye ₹20 Recharge ya Watch Ads option ka use karein.");
                }
              }}
              disabled={loadingFollow}
              className={`ml-2 text-xs font-bold px-3 py-1 rounded-full transition duration-200 flex items-center gap-1 shrink-0 ${
                followStatus.isMutual 
                  ? "bg-white/10 text-white hover:bg-white/20" 
                  : followStatus.isFollowing 
                    ? "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                    : "bg-blue-600 text-white hover:bg-blue-500"
              }`}
            >
              {followStatus.isMutual ? (
                <>
                  <UserCheck className="h-3 w-3" /> Friends
                </>
              ) : followStatus.isFollowing ? (
                "Following"
              ) : "Follow"}
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold ${timeLeft < 10 ? "bg-coral text-white" : "bg-mint text-ink"}`}>
              <Clock3 className="h-3.5 w-3.5" />
              {displayTimer}
            </div>

            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-panel text-white/65 hover:text-white"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-zinc-900 border border-line rounded-lg shadow-xl py-1 z-50 text-sm">
                  <button 
                    onClick={triggerBlockUser}
                    className="w-full text-left px-3 py-2 text-red-400 hover:bg-white/5 font-medium flex items-center gap-2"
                  >
                    <Ban className="h-3.5 w-3.5" /> Block User
                  </button>
                  <button 
                    onClick={reportRoom}
                    className="w-full text-left px-3 py-2 text-white/80 hover:bg-white/5 flex items-center gap-2"
                  >
                    <Flag className="h-3.5 w-3.5" /> Report Room
                  </button>
                  <button 
                    onClick={closeRoom}
                    className="w-full text-left px-3 py-2 text-white/60 hover:bg-white/5 border-t border-white/5 flex items-center gap-2"
                  >
                    <X className="h-3.5 w-3.5" /> Close Chat
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-3 p-2 bg-purple-950/40 border border-purple-500/30 rounded-lg flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-purple-300 font-medium flex items-center gap-1">
            <UserPlus className="h-3 w-3 text-purple-400" /> Premium Follow Features Allocation System:
          </div>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <button 
              onClick={followViaRecharge} 
              disabled={loadingFollow}
              className="bg-gold hover:bg-gold/80 text-ink text-xs font-bold px-2 py-1.5 rounded transition disabled:opacity-50"
            >
              {loadingFollow ? "Processing..." : "₹20 Recharge"}
            </button>
            <button 
              onClick={() => setIsAdPopupOpen(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-2 py-1.5 rounded transition"
            >
              📺 Watch 3 Ads (Follow)
            </button>
          </div>
        </div>

        {roomNotice ? <p className="mt-2 rounded-lg border border-line bg-panel p-2 text-xs text-yellow-400 font-medium">{roomNotice}</p> : null}
      </header>
      
      <div className="border-b border-line bg-panel p-2">
        <BannerAd />
      </div>

      <div ref={listRef} className="overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(83,230,177,0.08),transparent_30%)] p-4">
        <div className="grid gap-3">
          {messages.length === 0 ? (
            <div className="mx-auto my-8 max-w-xs rounded-lg border border-line bg-ink/80 p-4 text-center">
              <Sparkles className="mx-auto h-6 w-6 text-mint" />
              <p className="mt-2 text-sm font-semibold">Say something before the timer ends</p>
              <p className="mt-1 text-xs leading-5 text-white/50">Try a shared interest opener. Short and real works best.</p>
            </div>
          ) : null}
          {messages.map((message) => {
            const mine = message.sender === user?._id;
            return (
              <div key={message._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] rounded-lg px-3 py-2 text-sm leading-6 shadow-sm ${mine ? "bg-mint text-ink" : "border border-line bg-ink text-white"}`}>
                  {message.body}
                </div>
              </div>
            );
          })}
          {typingUser && typingUser !== user?._id ? <p className="text-xs text-white/48">Typing...</p> : null}
        </div>
      </div>

      <div className="border-t border-line bg-panel p-2">
        <BannerAd />
      </div>

      <form onSubmit={submit} className="flex gap-2 border-t border-line p-3">
        <input
          className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-ink px-3 outline-none focus:border-mint disabled:opacity-45"
          value={body}
          onChange={(event) => emitTyping(event.target.value)}
          placeholder={room.status === "locked" ? "Chat is locked" : "Type a message"}
          disabled={room.status === "locked"}
        />
        <Button className="aspect-square px-0" disabled={sending || room.status === "locked" || !body.trim()} title="Send">
          <Send className="h-4 w-4" />
        </Button>
      </form>

      <LockOverlay />

      <AdFollowPopup 
        isOpen={isAdPopupOpen} 
        onClose={() => setIsAdPopupOpen(false)} 
        onSuccess={handleAdsSuccess} 
      />
    </section>
  );
}
