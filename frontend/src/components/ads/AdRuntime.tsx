"use client";

import { useEffect } from "react";
import { loadSocialBarOnce } from "@/lib/adsterra";

export function AdRuntime() {
  useEffect(() => {
    const timer = window.setTimeout(() => loadSocialBarOnce(), 18000);
    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
