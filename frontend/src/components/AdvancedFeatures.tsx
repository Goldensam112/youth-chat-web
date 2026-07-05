"use client";

import {
  BadgeCheck,
  Bell,
  Bot,
  ChartNoAxesColumn,
  Clock3,
  Coins,
  Eye,
  Flag,
  Gift,
  History,
  Languages,
  Lock,
  MessageSquareText,
  Radio,
  Search,
  Shield,
  Sparkles,
  UserRoundCheck,
  Wallet,
  Zap
} from "lucide-react";

const features = [
  ["Mock signup/login", BadgeCheck],
  ["Profile builder", UserRoundCheck],
  ["Interest matching", Search],
  ["Live Socket.io chat", Radio],
  ["Typing indicator", MessageSquareText],
  ["Online presence model", Eye],
  ["60 sec server timer", Clock3],
  ["Instant chat lock", Lock],
  ["Credit wallet", Wallet],
  ["Spend 10 unlock", Coins],
  ["Reward ad earn", Gift],
  ["Mock buy credits", Zap],
  ["Wallet history", History],
  ["Daily bonus", Bell],
  ["Report room", Flag],
  ["Close room", Shield],
  ["Female verify flag", Sparkles],
  ["PWA manifest", Bot],
  ["Scalable schemas", ChartNoAxesColumn],
  ["Localization ready", Languages]
] as const;

export function AdvancedFeatures() {
  return (
    <section className="rounded-lg border border-line bg-panel p-4">
      <div className="mb-4">
        <h3 className="font-semibold">20 active MVP features</h3>
        <p className="mt-1 text-sm text-white/55">Green means it is wired in the current demo flow.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {features.map(([label, Icon]) => (
          <div key={label} className="flex min-h-12 items-center gap-2 rounded-lg border border-line bg-ink p-2">
            <Icon className="h-4 w-4 shrink-0 text-mint" />
            <span className="text-xs font-semibold leading-4 text-white/75">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
