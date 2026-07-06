"use client";

import { useEffect, useRef } from "react";
import { loadNativeAd } from "@/lib/adsterra";

export function NativeAd() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (ref.current) loadNativeAd(ref.current);
  }, []);

  return <div className="overflow-hidden rounded-lg border border-line bg-panel p-2" ref={ref} />;
}
