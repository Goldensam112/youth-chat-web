"use client";

import { useState } from "react";
import { LogIn } from "lucide-react";
import { api, setToken } from "@/lib/api";
import type { Gender, User } from "@/lib/types";
import { useChatStore } from "@/store/useChatStore";
import { Button } from "./Button";

const interestOptions = ["gaming", "music", "late night talks", "anime", "fitness", "startups", "movies", "memes"];

export function AuthPanel() {
  const setUser = useChatStore((state) => state.setUser);
  const [gender, setGender] = useState<Gender>("male");
  const [name, setName] = useState("Aarav");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function login() {
    setLoading(true);
    setError("");
    try {
      const payload = {
        authProvider: "mock",
        providerId: `${gender}-${name.toLowerCase()}-${Math.round(Math.random() * 10000)}`,
        name,
        age: 21,
        gender,
        lookingFor: gender === "male" ? ["female"] : ["male"],
        bio: "Here for quick, real conversations.",
        interests: interestOptions.slice(0, 5),
        profilePictures: [
          {
            url: `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(name)}`,
            isPrimary: true
          }
        ]
      };
      const res = await api<{ token: string; user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setToken(res.token);
      setUser(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profile create nahi ho paaya");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid gap-5 rounded-lg border border-line bg-panel p-5 shadow-glow">
      <div>
        <h1 className="text-2xl font-bold">Pulse Match</h1>
        <p className="mt-2 text-sm leading-6 text-white/68">Create a test profile and jump into the timed chat flow.</p>
      </div>

      <label className="grid gap-2 text-sm">
        Display name
        <input
          className="h-11 rounded-lg border border-line bg-ink px-3 outline-none focus:border-mint"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>

      <div className="grid grid-cols-3 gap-2">
        {(["male", "female", "other"] as Gender[]).map((option) => (
          <button
            key={option}
            className={`h-11 rounded-lg border text-sm font-semibold capitalize ${
              gender === option ? "border-mint bg-mint text-ink" : "border-line bg-ink text-white"
            }`}
            onClick={() => setGender(option)}
          >
            {option}
          </button>
        ))}
      </div>

      <Button onClick={login} disabled={loading}>
        <LogIn className="h-4 w-4" />
        {loading ? "Creating..." : "Continue"}
      </Button>
      {error ? <p className="rounded-lg border border-coral/40 bg-coral/10 p-3 text-sm text-coral">{error}</p> : null}
    </section>
  );
}
