"use client";

import { useState } from "react";
import { MessageCircle, Radar, UserRound, Wallet } from "lucide-react";
import { ChatViewport } from "./ChatViewport";
import { Dashboard } from "./Dashboard";

type MobileTab = "discover" | "chat" | "wallet" | "profile";

const navItems: { id: MobileTab; label: string; icon: typeof Radar }[] = [
  { id: "discover", label: "Discover", icon: Radar },
  { id: "chat", label: "Chat", icon: MessageCircle },
  { id: "wallet", label: "Wallet", icon: Wallet },
  { id: "profile", label: "Profile", icon: UserRound }
];

export function MobileShell() {
  const [tab, setTab] = useState<MobileTab>("discover");

  return (
    <div className="lg:hidden">
      <div className="pb-20">
        {tab === "chat" ? (
          <ChatViewport mobile />
        ) : (
          <Dashboard mobileTab={tab} onOpenChat={() => setTab("chat")} />
        )}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                className={`grid h-14 place-items-center rounded-lg text-[11px] font-semibold transition ${
                  active ? "bg-mint text-ink" : "text-white/58 hover:bg-panel hover:text-white"
                }`}
                onClick={() => setTab(item.id)}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
