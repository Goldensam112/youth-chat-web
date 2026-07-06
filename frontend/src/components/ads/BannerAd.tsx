"use client";

import { useEffect, useRef } from "react";
import { loadBannerAd } from "@/lib/adsterra";

export function BannerAd() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (ref.current) loadBannerAd(ref.current);
  }, []);

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-ink p-2">
      <div className="mx-auto min-h-[50px] w-[320px] max-w-full" ref={ref} />
    </div>
  );
}
