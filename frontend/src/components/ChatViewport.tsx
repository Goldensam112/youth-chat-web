"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Clock3, Send, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import type { Message, Room } from "@/lib/types";
import { useChatStore } from "@/store/useChatStore";
import { Button } from "./Button";
import { LockOverlay } from "./LockOverlay";

export function ChatViewport() {
  const { room, user, messages, timeLeft, typingUser, setRoom, setMessages, addMessage, setTimeLeft, setTypingUser } =
    useChatStore();
  const [body, setBody] = useState("");
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

  if (!room) {
    return (
      <section className="grid min-h-[520px] place-items-center rounded-lg border border-line bg-panel p-6 text-center">
        <div>
          <Sparkles className="mx-auto h-10 w-10 text-mint" />
          <h2 className="mt-4 text-xl font-bold">Ready when you are</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-white/64">Tap Find Someone and the room will open here instantly.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative grid min-h-[calc(100svh-2rem)] grid-rows-[auto_1fr_auto] overflow-hidden rounded-lg border border-line bg-panel">
      <header className="flex items-center justify-between gap-3 border-b border-line p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-white/42">Live room</p>
          <h2 className="font-bold">{room.sharedInterests.length ? room.sharedInterests.join(", ") : "Fresh match"}</h2>
        </div>
        <div className={`inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold ${timeLeft < 10 ? "bg-coral text-white" : "bg-ink text-mint"}`}>
          <Clock3 className="h-4 w-4" />
          {displayTimer}
        </div>
      </header>

      <div ref={listRef} className="overflow-y-auto p-4">
        <div className="grid gap-3">
          {messages.map((message) => {
            const mine = message.sender === user?._id;
            return (
              <div key={message._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] rounded-lg px-3 py-2 text-sm leading-6 ${mine ? "bg-mint text-ink" : "bg-ink text-white"}`}>
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
