"use client";

import { useEffect, useState } from "react";
import { Radio, ShieldCheck } from "lucide-react";
import { AuthPanel } from "@/components/AuthPanel";
import { AdRuntime } from "@/components/ads/AdRuntime";
import { ChatViewport } from "@/components/ChatViewport";
import { Dashboard } from "@/components/Dashboard";
import { MobileShell } from "@/components/MobileShell";
import { api, getToken } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import type { Room, User } from "@/lib/types";
import { useChatStore } from "@/store/useChatStore";

export default function Home() {
  const user = useChatStore((state) => state.user);
  const setUser = useChatStore((state) => state.setUser);
  const setRoom = useChatStore((state) => state.setRoom);
  const setTimeLeft = useChatStore((state) => state.setTimeLeft);
  const setQueueStatus = useChatStore((state) => state.setQueueStatus);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setBooting(false);
      return;
    }
    api<{ user: User }>("/api/auth/me")
      .then((res) => setUser(res.user))
      .catch(() => window.localStorage.removeItem("pulse_token"))
      .finally(() => setBooting(false));
  }, [setUser]);

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket) return;

    const handleMatchFound = ({ room, timeLeft }: { room: Room; timeLeft: number }) => {
      setRoom(room);
      setTimeLeft(timeLeft);
      setQueueStatus("matched");
    };

    socket.on("match_found", handleMatchFound);
    return () => {
      socket.off("match_found", handleMatchFound);
    };
  }, [user, setQueueStatus, setRoom, setTimeLeft]);

  return (
    <main className="safe-shell bg-[radial-gradient(circle_at_top_left,_rgba(83,230,177,0.16),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(255,111,97,0.1),_transparent_28%),#07090f] p-3 sm:p-4">
      <div className="mx-auto grid max-w-7xl gap-4">
        <header className="flex items-center justify-between rounded-lg border border-line bg-panel/80 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-mint text-ink">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-black">PrivateBaat</p>
              <p className="text-xs text-white/50">Real-time timed chats</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-lg border border-line bg-ink px-3 py-2 text-xs font-semibold text-white/70 sm:flex">
            <ShieldCheck className="h-4 w-4 text-mint" />
            Private chat
          </div>
        </header>

        {booting ? (
          <div className="grid min-h-[calc(100svh-6rem)] place-items-center">
            <div className="w-full max-w-sm rounded-lg border border-line bg-panel p-5 text-center shadow-glow">
              <div className="mx-auto h-10 w-10 animate-pulse rounded-lg bg-mint" />
              <p className="mt-4 font-semibold">Opening your account...</p>
            </div>
          </div>
        ) : user ? (
          <>
          <AdRuntime />
          <div className="hidden gap-4 lg:grid lg:grid-cols-[380px_1fr]">
            <Dashboard />
            <ChatViewport />
          </div>
          <MobileShell />
          </>
        ) : (
          <div className="grid min-h-[calc(100svh-6rem)] place-items-center">
            <div className="w-full max-w-6xl">
              <AuthPanel />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
