"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { requestCode, verifyCode, requestAccess } from "@/lib/auth";
import { Mail, User, KeyRound, ArrowRight } from "lucide-react";

type Mode = "email" | "code" | "request";

const INPUT =
  "w-full min-h-[48px] bg-[var(--night)] border border-[var(--line-2)] rounded-lg py-3 pl-11 pr-4 text-white focus:outline-none focus:border-[var(--accent)]";
const LABEL = "block text-sm text-[var(--muted)] mb-2";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async (work: () => Promise<void>) => {
    setError("");
    setLoading(true);
    try {
      await work();
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "email") {
      run(async () => {
        await requestCode(email);
        setNotice(`If ${email.trim()} is registered, we've sent it a sign-in code.`);
        setMode("code");
      });
    } else if (mode === "request") {
      run(async () => {
        if (!name.trim()) throw new Error("Please enter your name");
        await requestAccess(name, email);
        setNotice(`We've sent a sign-in code to ${email.trim()}.`);
        setMode("code");
      });
    } else {
      run(async () => {
        await verifyCode(email, code);
        router.push("/leaders");
      });
    }
  };

  const heading = mode === "request" ? "Request access" : mode === "code" ? "Enter your code" : "Leader login";
  const sub =
    mode === "request"
      ? "Join the Avenue leadership community"
      : mode === "code"
        ? notice
        : "We'll email you a sign-in code. No password needed.";
  const button = mode === "code" ? "Sign in" : mode === "request" ? "Request access" : "Email me a code";

  return (
    <div className="avenue-night relative flex flex-col items-center justify-center overflow-hidden px-4 py-16">
      <NightStreet />
      <div className="relative z-10 w-full max-w-md">
        <div className="night-card p-8">
          <div className="mb-8 text-center">
            <Image src="/images/Avenue.png" alt="Avenue" width={180} height={50} className="mx-auto mb-6" />
            <h1 className="font-serif text-[34px] leading-tight text-[var(--ink)]">{heading}</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">{sub}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === "request" && (
              <div>
                <label className={LABEL}>Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--dim)]" />
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={INPUT} placeholder="Your name" autoComplete="name" />
                </div>
              </div>
            )}

            {mode !== "code" && (
              <div>
                <label className={LABEL}>Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--dim)]" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} placeholder="your@email.com" autoComplete="email" required />
                </div>
              </div>
            )}

            {mode === "code" && (
              <div>
                <label className={LABEL}>Sign-in code</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--dim)]" />
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6,10}"
                    maxLength={10}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    className={`${INPUT} tracking-[0.4em] text-lg placeholder:tracking-normal placeholder:text-sm`}
                    placeholder="Code from your email"
                    required
                    autoFocus
                  />
                </div>
              </div>
            )}

            {error && <p className="text-center text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] text-sm font-semibold text-white disabled:opacity-50"
            >
              <span>{loading ? "Please wait..." : button}</span>
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="mt-6 space-y-2 text-center text-sm text-[var(--muted)]">
            {mode === "code" ? (
              <button
                type="button"
                className="min-h-[44px] hover:text-white"
                onClick={() => {
                  setCode("");
                  setError("");
                  setMode("email");
                }}
              >
                Use a different email, or send a new code
              </button>
            ) : (
              <button
                type="button"
                className="min-h-[44px] hover:text-white"
                onClick={() => {
                  setError("");
                  setMode(mode === "request" ? "email" : "request");
                }}
              >
                {mode === "request" ? "Already registered? Sign in" : "New leader? Request access"}
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <a href="/" className="inline-flex min-h-[44px] items-center text-xs text-[var(--dim)] hover:text-[var(--muted)]">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}

// The night street behind the form (spec 4.5): sky, a few stars, the road
// with its dashed centre line, and one lit streetlight to the side. Geometry
// and colours from mockup option A. Anchored bottom right so the lamp stays
// in view on a phone.
function NightStreet() {
  const stars: [number, number, number][] = [
    [60, 40, 1],
    [180, 80, 1.2],
    [320, 30, 0.9],
    [470, 70, 1],
    [610, 26, 1.3],
    [760, 60, 0.9],
    [900, 34, 1.1],
    [960, 96, 0.8],
    [120, 120, 0.7],
    [540, 110, 0.8],
    [700, 150, 0.9],
    [840, 120, 0.7],
  ];
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1000 600"
      preserveAspectRatio="xMaxYMax slice"
    >
      <defs>
        <radialGradient id="login-cone" cx="50%" cy="0%" r="100%">
          <stop offset="0%" stopColor="#ffc56b" stopOpacity={0.55} />
          <stop offset="60%" stopColor="#ffc56b" stopOpacity={0.08} />
          <stop offset="100%" stopColor="#ffc56b" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="login-halo">
          <stop offset="0%" stopColor="#ffdca0" stopOpacity={0.9} />
          <stop offset="100%" stopColor="#ffc56b" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect width="1000" height="600" fill="#07090f" />
      <g fill="#c9d3ea" opacity={0.55}>
        {stars.map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
        ))}
      </g>
      <rect x="0" y="480" width="1000" height="120" fill="#0b0f18" />
      <line x1="0" y1="480" x2="1000" y2="480" stroke="#1f2736" />
      <line x1="0" y1="540" x2="1000" y2="540" stroke="#2b3446" strokeDasharray="18 16" />
      <g className="sm:max-lg:hidden">
        <polygon points="880,262 800,480 960,480" fill="url(#login-cone)" />
        <circle cx="880" cy="254" r="40" fill="url(#login-halo)" />
        <rect x="878" y="254" width="4" height="226" fill="#3a4458" />
        <rect x="864" y="246" width="32" height="10" rx="3" fill="#ffc56b" />
      </g>
    </svg>
  );
}
