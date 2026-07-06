"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Radio, ShieldCheck } from "lucide-react";
import { BannerAd } from "@/components/ads/BannerAd";
import { NativeAd } from "@/components/ads/NativeAd";
import { AuthPanel } from "@/components/AuthPanel";
import { api, getToken } from "@/lib/api";
import type { User } from "@/lib/types";
import { useChatStore } from "@/store/useChatStore";

export default function LoginPage() {
  const router = useRouter();
  const setUser = useChatStore((state) => state.setUser);

  useEffect(() => {
    if (!getToken()) return;
    api<{ user: User }>("/api/auth/me")
      .then((res) => {
        setUser(res.user);
        router.replace("/");
      })
      .catch(() => window.localStorage.removeItem("pulse_token"));
  }, [router, setUser]);

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

        <div className="grid min-h-[calc(100svh-6rem)] place-items-center">
          <div className="grid w-full max-w-6xl gap-4">
            <BannerAd />
            <AuthPanel />
            <NativeAd />
          </div>
        </div>
      </div>
    </main>
  );
}
