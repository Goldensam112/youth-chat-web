import { Gem } from "lucide-react";

export function CreditPill({ credits }: { credits: number }) {
  return (
    <div className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-panel px-3 text-sm font-semibold">
      <Gem className="h-4 w-4 text-gold" />
      {credits} credits
    </div>
  );
}
