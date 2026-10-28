"use client";

import { useRef, useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { ONRAMP, ONRAMP_MAX_WORKSHOPS, ONRAMP_WORKSHOPS, type OnrampWorkshopId } from "@/content/onramp";
import { isOneEmail } from "@/lib/domain/forms";
import { ONRAMP_ERRORS, workshopLabel, workshopsError } from "@/lib/domain/onramp";

// The On-Ramp sign-up form: name, email, 1 or 2 workshops. Posts to
// /api/onramp, which saves one row per email (a repeat sign-up updates it).
// Checks run here first for quick feedback; the route checks again.

type Errors = Partial<Record<"name" | "email" | "workshops" | "form", string>>;

interface Done {
  name: string;
  email: string;
  workshops: OnrampWorkshopId[];
  updated: boolean;
  emailed: boolean;
}

const INPUT =
  "w-full min-h-[52px] rounded-xl border bg-[var(--night-2)] px-4 text-base text-white placeholder:text-[var(--dim)] focus:outline-none focus:border-[var(--lamp)]";

export default function OnrampForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [picked, setPicked] = useState<OnrampWorkshopId[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [limitNote, setLimitNote] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const workshopsRef = useRef<HTMLFieldSetElement>(null);

  const toggle = (id: OnrampWorkshopId) => {
    setErrors((e) => ({ ...e, workshops: undefined }));
    if (picked.includes(id)) {
      setPicked(picked.filter((p) => p !== id));
      setLimitNote(false);
    } else if (picked.length >= ONRAMP_MAX_WORKSHOPS) {
      // A third tick is refused, with a note, rather than silently ignored.
      setLimitNote(true);
    } else {
      setPicked([...picked, id]);
      setLimitNote(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found: Errors = {};
    if (!name.trim()) found.name = ONRAMP_ERRORS.name;
    if (!isOneEmail(email.trim().toLowerCase())) found.email = ONRAMP_ERRORS.email;
    const workshopProblem = workshopsError(picked);
    if (workshopProblem) found.workshops = workshopProblem;
    setErrors(found);
    if (found.name) return nameRef.current?.focus();
    if (found.email) return emailRef.current?.focus();
    if (found.workshops) return workshopsRef.current?.scrollIntoView({ block: "center" });

    setSending(true);
    try {
      const res = await fetch("/api/onramp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, workshops: picked, company }),
      });
      const body = (await res.json().catch(() => null)) as { updated?: boolean; emailed?: boolean; error?: string } | null;
      if (!res.ok) {
        setErrors({ form: body?.error ?? "We couldn't save your sign-up. Please try again." });
        return;
      }
      setDone({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        workshops: picked,
        updated: body?.updated === true,
        emailed: body?.emailed === true,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setErrors({ form: "We couldn't reach the server. Check your connection and try again." });
    } finally {
      setSending(false);
    }
  };

  if (done) {
    const first = done.name.split(" ")[0];
    return (
      <div className="night-card-lit p-6 text-center sm:p-8" role="status" aria-live="polite">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--lamp)] text-[#1a1206]">
          <Check className="h-7 w-7" strokeWidth={3} aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl">You&apos;re in, {first}!</h2>
        <p className="mt-2 text-lg text-[var(--ink-2)]">See you on {ONRAMP.shortDate}.</p>
        {done.updated && <p className="mt-3 text-sm text-[var(--lamp-2)]">You&apos;d already signed up, so we&apos;ve updated your choices.</p>}
        <div className="mt-6 text-left">
          <p className="night-label">{done.workshops.length > 1 ? "Your workshops" : "Your workshop"}</p>
          <ul className="mt-2 space-y-2">
            {done.workshops.map((id) => (
              <li key={id} className="flex items-start gap-2 text-[var(--ink)]">
                <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-[var(--lamp)]" aria-hidden="true" />
                {workshopLabel(id)}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-6 text-sm text-[var(--muted)]">
          {ONRAMP.time} · {ONRAMP.venue}
        </p>
        {done.emailed && <p className="mt-2 text-sm text-[var(--muted)]">We&apos;ve emailed a confirmation to {done.email}.</p>}
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {/* Honeypot: hidden from people, filled by bots. */}
      <input
        type="text"
        name="company"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        style={{ position: "absolute", left: "-9999px", opacity: 0 }}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <div>
        <label htmlFor="onramp-name" className="mb-2 block text-sm font-semibold text-white">
          Name
        </label>
        <input
          ref={nameRef}
          id="onramp-name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErrors((x) => ({ ...x, name: undefined }));
          }}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "onramp-name-error" : undefined}
          className={`${INPUT} ${errors.name ? "border-red-400" : "border-[var(--line-2)]"}`}
          placeholder="Your name"
        />
        {errors.name && (
          <p id="onramp-name-error" className="mt-2 text-sm text-red-400">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="onramp-email" className="mb-2 block text-sm font-semibold text-white">
          Email
        </label>
        <input
          ref={emailRef}
          id="onramp-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErrors((x) => ({ ...x, email: undefined }));
          }}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "onramp-email-error" : undefined}
          className={`${INPUT} ${errors.email ? "border-red-400" : "border-[var(--line-2)]"}`}
          placeholder="you@example.com"
        />
        {errors.email && (
          <p id="onramp-email-error" className="mt-2 text-sm text-red-400">
            {errors.email}
          </p>
        )}
      </div>

      <fieldset ref={workshopsRef} aria-describedby="onramp-workshops-hint">
        <legend className="text-sm font-semibold text-white">Pick the 2 workshops you&apos;re most interested in</legend>
        <p id="onramp-workshops-hint" className="mt-1 text-sm text-[var(--muted)]">
          At least 1, at most 2 · {picked.length} of {ONRAMP_MAX_WORKSHOPS} picked
        </p>
        <div className="mt-3 space-y-2">
          {ONRAMP_WORKSHOPS.map((w) => {
            const on = picked.includes(w.id);
            return (
              <label
                key={w.id}
                className={`flex min-h-[60px] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                  on ? "border-[var(--lamp)] bg-[var(--lamp-soft)]" : "border-[var(--line-2)] bg-[var(--night-2)]"
                }`}
              >
                <input type="checkbox" checked={on} onChange={() => toggle(w.id)} className="peer sr-only" />
                <span
                  className={`flex h-6 w-6 flex-none items-center justify-center rounded-md border-2 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--lamp)] ${
                    on ? "border-[var(--lamp)] bg-[var(--lamp)] text-[#1a1206]" : "border-[var(--dim)]"
                  }`}
                  aria-hidden="true"
                >
                  {on && <Check className="h-4 w-4" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1 text-[15px] leading-snug text-white">
                  {w.label} <span className="text-[var(--muted)]">({w.host})</span>
                </span>
              </label>
            );
          })}
        </div>
        {limitNote && !errors.workshops && (
          <p className="mt-2 text-sm text-[var(--lamp-2)]" role="status">
            You can pick up to 2. Untick one to choose a different workshop.
          </p>
        )}
        {errors.workshops && (
          <p className="mt-2 text-sm text-red-400" role="alert">
            {errors.workshops}
          </p>
        )}
      </fieldset>

      {errors.form && (
        <p className="text-sm text-red-400" role="alert">
          {errors.form}
        </p>
      )}

      <button type="submit" disabled={sending} className="btn-lamp min-h-[56px] w-full text-base disabled:opacity-60">
        {sending ? "Signing you up..." : "Sign me up"}
      </button>
    </form>
  );
}
