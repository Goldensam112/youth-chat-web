"use client";

import { useEffect } from "react";
import { AuthPanel } from "@/components/AuthPanel";
import { ChatViewport } from "@/components/ChatViewport";
import { Dashboard } from "@/components/Dashboard";
import { api, getToken } from "@/lib/api";
import type { User } from "@/lib/types";
import { useChatStore } from "@/store/useChatStore";

export default function Home() {
  const user = useChatStore((state) => state.user);
  const setUser = useChatStore((state) => state.setUser);

  useEffect(() => {
    if (!getToken()) return;
    api<{ user: User }>("/api/auth/me")
      .then((res) => setUser(res.user))
      .catch(() => window.localStorage.removeItem("pulse_token"));
  }, [setUser]);

  return (
    <main className="safe-shell bg-[radial-gradient(circle_at_top_left,_rgba(83,230,177,0.16),_transparent_34%),#07090f] p-4">
      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[360px_1fr]">
        {user ? (
          <>
            <Dashboard />
            <ChatViewport />
          </>
        ) : (
          <div className="grid min-h-[calc(100svh-2rem)] place-items-center lg:col-span-2">
            <div className="w-full max-w-md">
              <AuthPanel />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
