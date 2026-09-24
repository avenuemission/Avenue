"use client";

import { useEffect, useState } from "react";
import { leaderFetch } from "@/lib/leaderFetch";
import { EMAIL_KIND_INFO, EMAIL_KINDS, type EmailKind, type EmailPrefs } from "@/lib/emails/prefs";

// Spec 3.4: the leader's five email switches. Each change saves at once
// through PATCH /api/email-prefs, which takes the email from the session.
// A failed save puts the switch back and says why. The buttons are never
// disabled while saving (a disabled button drops keyboard focus); a second
// tap during a save is ignored instead.
export default function EmailPrefsPanel() {
  const [prefs, setPrefs] = useState<EmailPrefs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<EmailKind | null>(null);

  useEffect(() => {
    let cancelled = false;
    leaderFetch("/api/email-prefs")
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `Could not load your email settings (${res.status})`);
        return body.prefs as EmailPrefs;
      })
      .then((loaded) => {
        if (!cancelled) setPrefs(loaded);
      })
      .catch((e: Error) => {
        console.error("EmailPrefsPanel: load failed", e);
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = async (kind: EmailKind) => {
    if (!prefs || saving) return;
    const next = !prefs[kind];
    setSaving(kind);
    setError(null);
    setPrefs({ ...prefs, [kind]: next });
    try {
      const res = await leaderFetch("/api/email-prefs", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [kind]: next }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Could not save your email settings (${res.status})`);
      setPrefs(body.prefs as EmailPrefs);
    } catch (e) {
      console.error("EmailPrefsPanel: save failed", e);
      setPrefs((p) => (p ? { ...p, [kind]: !next } : p));
      setError((e as Error).message);
    } finally {
      setSaving(null);
    }
  };

  return (
    <section aria-labelledby="email-prefs-heading" className="night-card p-5 sm:p-6">
      <h2 id="email-prefs-heading" className="font-serif text-2xl text-[var(--ink)]">
        Emails
      </h2>
      {/* Henry to check wording */}
      <p className="mt-1 text-sm text-[var(--muted)]">
        Choose which emails Avenue sends you. Every email also has an unsubscribe link.
      </p>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-amber-400">
          {error}
        </p>
      ) : null}
      {!prefs && !error ? <p className="mt-4 text-sm text-[var(--muted)]">Loading your email settings...</p> : null}
      {prefs ? (
        <ul className="mt-4 divide-y divide-[var(--line)]">
          {EMAIL_KINDS.map((kind) => {
            const on = prefs[kind];
            return (
              <li key={kind}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-labelledby={`email-pref-${kind}-label`}
                  aria-describedby={`email-pref-${kind}-desc`}
                  aria-busy={saving === kind}
                  onClick={() => toggle(kind)}
                  className="flex min-h-[44px] w-full items-center justify-between gap-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lamp)]"
                >
                  <span className="min-w-0">
                    <span id={`email-pref-${kind}-label`} className="block text-sm font-semibold text-[var(--ink)]">
                      {EMAIL_KIND_INFO[kind].label}
                    </span>
                    <span id={`email-pref-${kind}-desc`} className="block text-xs text-[var(--muted)]">
                      {EMAIL_KIND_INFO[kind].description}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full border transition-colors ${
                      on ? "border-[var(--lamp)] bg-[var(--lamp-soft)]" : "border-[var(--line-2)]"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full transition-transform motion-reduce:transition-none ${
                        on ? "translate-x-6 bg-[var(--lamp)]" : "translate-x-1 bg-[var(--dim)]"
                      }`}
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
