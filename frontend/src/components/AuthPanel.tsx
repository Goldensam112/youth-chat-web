"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, BadgeCheck, Gamepad2, Heart, LogIn, MessageCircle, Phone, ShieldCheck, Sparkles } from "lucide-react";
import { api, setToken } from "@/lib/api";
import type { Gender, User } from "@/lib/types";
import { useChatStore } from "@/store/useChatStore";
import { Button } from "./Button";

const interestOptions = ["gaming", "music", "late night talks", "anime", "fitness", "startups", "movies", "memes", "college", "travel"];
const genderOptions: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" }
];

export function AuthPanel() {
  const setUser = useChatStore((state) => state.setUser);
  const [step, setStep] = useState(0);
  const [gender, setGender] = useState<Gender>("male");
  const [lookingFor, setLookingFor] = useState<Gender[]>(["female"]);
  const [name, setName] = useState("");
  const [age, setAge] = useState(21);
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>(["gaming", "music", "late night talks"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleInterest(interest: string) {
    setInterests((current) =>
      current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest].slice(0, 8)
    );
  }

  function toggleLookingFor(value: Gender) {
    setLookingFor((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  }

  function nextStep() {
    setError("");
    if (step === 0 && name.trim().length < 2) {
      setError("Naam kam se kam 2 letters ka hona chahiye.");
      return;
    }
    if (step === 1 && lookingFor.length === 0) {
      setError("Aap kisko meet karna chahte ho select karo.");
      return;
    }
    if (step === 2 && interests.length === 0) {
      setError("Kam se kam ek interest select karo.");
      return;
    }
    setStep((current) => Math.min(2, current + 1));
  }

  async function login() {
    setLoading(true);
    setError("");
    try {
      const payload = {
        authProvider: "mock",
        providerId: `${gender}-${name.trim().toLowerCase()}-${Date.now()}`,
        name: name.trim(),
        age,
        gender,
        lookingFor,
        bio: bio.trim() || "Here for quick, real conversations.",
        interests,
        profilePictures: [
          {
            url: `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(name || "pulse")}`,
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
    <section className="grid overflow-hidden rounded-lg border border-line bg-panel shadow-glow lg:grid-cols-[1fr_440px]">
      <div className="relative hidden min-h-[680px] overflow-hidden bg-ink p-8 lg:block">
        <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(83,230,177,0.2),transparent_42%),radial-gradient(circle_at_70%_20%,rgba(255,111,97,0.16),transparent_30%)]" />
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-mint/30 bg-mint/10 px-3 py-2 text-sm font-semibold text-mint">
              <Sparkles className="h-4 w-4" />
              PrivateBaat
            </div>
            <h1 className="mt-8 max-w-xl text-5xl font-black leading-tight">Meet, match, chat. One minute decides the vibe.</h1>
            <p className="mt-5 max-w-md text-base leading-7 text-white/68">
              Build your profile, find someone by interest, and unlock conversations with credits after the free timer ends.
            </p>
          </div>

          <div className="grid gap-3">
            {[
              ["60 sec free chat", MessageCircle],
              ["Credit wallet paywall", Heart],
              ["Safety-first profiles", ShieldCheck]
            ].map(([label, Icon]) => (
              <div key={String(label)} className="flex items-center gap-3 rounded-lg border border-line bg-panel/70 p-3">
                <Icon className="h-5 w-5 text-mint" />
                <span className="font-semibold">{String(label)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:p-7">
        <div>
          <p className="text-sm font-semibold text-mint">Step {step + 1} of 3</p>
          <h2 className="mt-2 text-2xl font-bold">{step === 0 ? "Create your profile" : step === 1 ? "Set your match preference" : "Choose your vibe"}</h2>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[0, 1, 2].map((item) => (
              <div key={item} className={`h-1.5 rounded-full ${item <= step ? "bg-mint" : "bg-line"}`} />
            ))}
          </div>
        </div>

        {step === 0 ? (
          <div className="grid gap-4">
            <div className="grid grid-cols-[72px_1fr] items-center gap-4 rounded-lg border border-line bg-ink p-3">
              <img
                className="h-[72px] w-[72px] rounded-lg bg-panel object-cover"
                src={`https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(name || "pulse")}`}
                alt=""
              />
              <div>
                <p className="font-semibold">{name || "Your profile"}</p>
                <p className="mt-1 text-sm text-white/55">Profile photo is auto-generated for demo mode.</p>
              </div>
            </div>
            <label className="grid gap-2 text-sm font-semibold">
              Display name
              <input
                className="h-12 rounded-lg border border-line bg-ink px-3 font-normal outline-none focus:border-mint"
                placeholder="Example: Aarav"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Age
              <input
                className="h-12 rounded-lg border border-line bg-ink px-3 font-normal outline-none focus:border-mint"
                type="number"
                min={18}
                max={99}
                value={age}
                onChange={(event) => setAge(Number(event.target.value))}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Short bio
              <textarea
                className="min-h-24 resize-none rounded-lg border border-line bg-ink p-3 font-normal outline-none focus:border-mint"
                placeholder="A little line about you"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
              />
            </label>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-5">
            <div>
              <p className="mb-2 text-sm font-semibold">I am</p>
              <div className="grid grid-cols-3 gap-2">
                {genderOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`h-12 rounded-lg border text-sm font-semibold ${
                      gender === option.value ? "border-mint bg-mint text-ink" : "border-line bg-ink text-white"
                    }`}
                    onClick={() => setGender(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Looking for</p>
              <div className="grid grid-cols-3 gap-2">
                {genderOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`h-12 rounded-lg border text-sm font-semibold ${
                      lookingFor.includes(option.value) ? "border-gold bg-gold text-ink" : "border-line bg-ink text-white"
                    }`}
                    onClick={() => toggleLookingFor(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-line bg-ink p-4">
              <div className="flex gap-3">
                <BadgeCheck className="mt-1 h-5 w-5 shrink-0 text-mint" />
                <p className="text-sm leading-6 text-white/65">Female verification is supported in the database and can be upgraded to document or selfie verification later.</p>
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-4">
            <div className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5 text-mint" />
              <p className="font-semibold">Pick up to 8 interests</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {interestOptions.map((interest) => (
                <button
                  key={interest}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold capitalize ${
                    interests.includes(interest) ? "border-mint bg-mint text-ink" : "border-line bg-ink text-white"
                  }`}
                  onClick={() => toggleInterest(interest)}
                >
                  {interest}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex h-12 items-center justify-center gap-2 rounded-lg border border-line bg-ink text-sm font-semibold text-white/72">
                <Phone className="h-4 w-4" />
                Phone OTP
              </button>
              <button className="flex h-12 items-center justify-center gap-2 rounded-lg border border-line bg-ink text-sm font-semibold text-white/72">
                <LogIn className="h-4 w-4" />
                Google
              </button>
            </div>
          </div>
        ) : null}

        {error ? <p className="rounded-lg border border-coral/40 bg-coral/10 p-3 text-sm text-coral">{error}</p> : null}

        <div className="grid grid-cols-[auto_1fr] gap-3">
          <Button variant="secondary" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0 || loading} title="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {step < 2 ? (
            <Button onClick={nextStep}>
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={login} disabled={loading}>
              <LogIn className="h-4 w-4" />
              {loading ? "Creating..." : "Enter PrivateBaat"}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
