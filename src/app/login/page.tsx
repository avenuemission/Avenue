"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { requestCode, verifyCode, requestAccess } from "@/lib/auth";
import { Mail, User, KeyRound, ArrowRight } from "lucide-react";
import Reveal from "@/components/ui/Reveal";

type Mode = "email" | "code" | "request";

const INPUT =
  "w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-3 pl-11 pr-4 text-white focus:outline-none focus:border-[var(--accent)] transition-colors";
const LABEL = "block text-gray-400 text-xs mb-2 uppercase tracking-wider";

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

  const heading = mode === "request" ? "Request Access" : mode === "code" ? "Enter Your Code" : "Leader Login";
  const sub =
    mode === "request"
      ? "Join the Avenue leadership community"
      : mode === "code"
        ? notice
        : "We'll email you a sign-in code. No password needed.";
  const button = mode === "code" ? "Sign in" : mode === "request" ? "Request access" : "Email me a code";

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-16">
      <Reveal className="w-full max-w-md">
        <div className="panel p-8">
          <div className="text-center mb-8">
            <Image src="/images/Avenue.png" alt="Avenue" width={180} height={50} className="mx-auto mb-6" />
            <h1 className="text-2xl font-semibold text-white uppercase tracking-wider">{heading}</h1>
            <p className="text-gray-400 text-sm mt-2">{sub}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === "request" && (
              <div>
                <label className={LABEL}>Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={INPUT} placeholder="Your name" autoComplete="name" />
                </div>
              </div>
            )}

            {mode !== "code" && (
              <div>
                <label className={LABEL}>Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} placeholder="your@email.com" autoComplete="email" required />
                </div>
              </div>
            )}

            {mode === "code" && (
              <div>
                <label className={LABEL}>Sign-in code</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
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

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--accent)] text-white py-3 rounded-full font-medium hover:brightness-110 transition-all uppercase tracking-wider text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{loading ? "Please wait..." : button}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400 space-y-2">
            {mode === "code" ? (
              <button type="button" className="hover:text-white transition-colors" onClick={() => { setCode(""); setError(""); setMode("email"); }}>
                Use a different email, or send a new code
              </button>
            ) : (
              <button
                type="button"
                className="hover:text-white transition-colors"
                onClick={() => { setError(""); setMode(mode === "request" ? "email" : "request"); }}
              >
                {mode === "request" ? "Already registered? Sign in" : "New leader? Request access"}
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-gray-500 hover:text-gray-400 text-xs uppercase tracking-wider transition-colors"
          >
            ← Back to Home
          </a>
        </div>
      </Reveal>
    </div>
  );
}
