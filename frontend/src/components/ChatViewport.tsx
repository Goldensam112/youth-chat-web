"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Clock3, Flag, MessageSquareDashed, Send, Shield, Sparkles, TimerReset, X, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import type { Message, Room } from "@/lib/types";
import { useChatStore } from "@/store/useChatStore";
import { Button } from "./Button";
import { LockOverlay } from "./LockOverlay";

export function ChatViewport({ mobile = false }: { mobile?: boolean }) {
  const { room, user, messages, timeLeft, typingUser, setRoom, setMessages, addMessage, setTimeLeft, setTypingUser } =
    useChatStore();
  const [body, setBody] = useState("");
  const [roomNotice, setRoomNotice] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!room) return;
    api<{ room: Room; messages: Message[]; timeLeft: number }>(`/api/rooms/${room._id}`).then((res) => {
      setRoom(res.room);
      setMessages(res.messages);
      setTimeLeft(res.timeLeft);
    });
  }, [room?._id, setMessages, setRoom, setTimeLeft]);

  useEffect(() => {
    if (!room) return;
    const socket = getSocket();
    if (!socket) return;

    socket.emit("join_room", { roomId: room._id }, (res: { ok: boolean; timeLeft: number; status: Room["status"] }) => {
      if (res.ok) {
        setTimeLeft(res.timeLeft);
        setRoom({ ...room, status: res.status });
      }
    });

    socket.on("message:new", ({ message }: { message: Message }) => addMessage(message));
    socket.on("timer_update", ({ timeLeft: nextTimeLeft }: { timeLeft: number }) => setTimeLeft(nextTimeLeft));
    socket.on("room_lock", () => setRoom({ ...room, status: "locked" }));
    socket.on("typing", ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      setTypingUser(isTyping ? userId : null);
    });

    return () => {
      socket.off("message:new");
      socket.off("timer_update");
      socket.off("room_lock");
      socket.off("typing");
    };
  }, [room?._id, addMessage, room, setRoom, setTimeLeft, setTypingUser]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const displayTimer = useMemo(() => {
    const minutes = Math.floor(timeLeft / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (timeLeft % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [timeLeft]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!room || !body.trim() || room.status !== "active") return;
    const socket = getSocket();
    socket?.emit("send_message", { roomId: room._id, body }, (res: { ok: boolean; message?: string }) => {
      if (!res.ok) console.warn(res.message);
    });
    setBody("");
  }

  function emitTyping(value: string) {
    setBody(value);
    if (!room) return;
    getSocket()?.emit("typing", { roomId: room._id, isTyping: value.length > 0 });
  }

  async function reportRoom() {
    if (!room) return;
    await api(`/api/rooms/${room._id}/report`, {
      method: "POST",
      body: JSON.stringify({ reason: "User reported from chat", details: "Quick report from live room UI." })
    });
    setRoomNotice("Report submitted for review.");
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
        </div>
      </section>
    );
  }

  return (
    <section className={`relative grid grid-rows-[auto_1fr_auto] overflow-hidden rounded-lg border border-line bg-panel ${mobile ? "h-[calc(100svh-8.5rem)]" : "min-h-[calc(100svh-2rem)]"}`}>
      <header className="border-b border-line bg-ink/50 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-white/42">Live room</p>
            <h2 className="truncate font-bold">{room.sharedInterests.length ? room.sharedInterests.join(", ") : "Fresh match"}</h2>
          </div>
          <div className={`inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold ${timeLeft < 10 ? "bg-coral text-white" : "bg-mint text-ink"}`}>
            <Clock3 className="h-4 w-4" />
            {displayTimer}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 flex-1 items-center gap-2 text-xs text-white/55 sm:flex">
            <Shield className="h-4 w-4 text-gold" />
            <span className="line-clamp-2">{room.status === "active" ? "Messages are live until the free clock ends." : "Room is locked until credits are used."}</span>
          </div>
          <div className="flex gap-2">
            <button className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-panel text-white/65 hover:text-white" onClick={reportRoom} title="Report">
              <Flag className="h-4 w-4" />
            </button>
            <button className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-panel text-white/65 hover:text-white" onClick={closeRoom} title="Close room">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        {roomNotice ? <p className="mt-2 rounded-lg border border-line bg-panel p-2 text-xs text-white/65">{roomNotice}</p> : null}
      </header>

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

      <form onSubmit={submit} className="flex gap-2 border-t border-line p-3">
        <input
          className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-ink px-3 outline-none focus:border-mint disabled:opacity-45"
          value={body}
          onChange={(event) => emitTyping(event.target.value)}
          placeholder={room.status === "locked" ? "Chat is locked" : "Type a message"}
          disabled={room.status === "locked"}
        />
        <Button className="aspect-square px-0" disabled={room.status === "locked" || !body.trim()} title="Send">
          <Send className="h-4 w-4" />
        </Button>
      </form>

      <LockOverlay />
    </section>
  );
}
