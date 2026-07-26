"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { login, signup } from "@/lib/auth";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
import Reveal from "@/components/ui/Reveal";

export default function LoginPage() {
  const router = useRouter();
  const [isSignup, setIsSignup] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignup) {
        if (!formData.name) {
          setError("Please enter your name");
          setLoading(false);
          return;
        }
        const user = await signup(formData.email, formData.password, formData.name);
        if (user) {
          router.push("/leaders");
        } else {
          setError("Email already exists. Please login instead.");
        }
      } else {
        const user = login(formData.email, formData.password);
        if (user) {
          router.push("/leaders");
        } else {
          setError("Invalid email or password");
        }
      }
    } catch {
      setError("An error occurred. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-16">
      <Reveal className="w-full max-w-md">
        <div className="panel p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image
            src="/images/Avenue.png"
            alt="Avenue"
            width={180}
            height={50}
            className="mx-auto mb-6"
          />
          <h1 className="text-2xl font-semibold text-white uppercase tracking-wider">
            {isSignup ? "Create Account" : "Leader Login"}
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            {isSignup
              ? "Join the Avenue leadership community"
              : "Access leader resources and tools"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {isSignup && (
            <div>
              <label className="block text-gray-400 text-xs mb-2 uppercase tracking-wider">
                Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-3 pl-11 pr-4 text-white focus:outline-none focus:border-[var(--accent)] transition-colors"
                  placeholder="Your name"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-gray-400 text-xs mb-2 uppercase tracking-wider">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-3 pl-11 pr-4 text-white focus:outline-none focus:border-[var(--accent)] transition-colors"
                placeholder="your@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-xs mb-2 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-3 pl-11 pr-4 text-white focus:outline-none focus:border-[var(--accent)] transition-colors"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--accent)] text-white py-3 rounded-full font-medium hover:brightness-110 transition-all uppercase tracking-wider text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{loading ? "Please wait..." : isSignup ? "Sign Up" : "Login"}</span>
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Toggle signup/login */}
        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm">
            {isSignup ? "Already have an account?" : "Don't have an account?"}
          </p>
          <button
            onClick={() => {
              setIsSignup(!isSignup);
              setError("");
            }}
            className="text-[var(--accent)] hover:brightness-110 text-sm font-medium mt-1 transition-all"
          >
            {isSignup ? "Login instead" : "Create an account"}
          </button>
        </div>
        </div>

        {/* Back to home */}
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
