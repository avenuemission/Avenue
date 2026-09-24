"use client";

import { useEffect, useState } from "react";
import { EMAIL_KIND_INFO, EMAIL_KINDS, type EmailKind } from "@/lib/emails/prefs";
import { adminFetch } from "@/lib/client/adminFetch";

// Spec 3.3 preview: render any leader's email as the engine would send it
// now, in a sandboxed frame. Nothing is sent from here.
interface LeaderOption {
  email: string;
  name: string | null;
  full_access: boolean;
}

interface Preview {
  subject: string | null;
  html: string | null;
  text: string | null;
  periodKey: string | null;
  note: string | null;
}

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lamp)]";
const field = `min-h-[44px] rounded-lg border border-[var(--border)] bg-black/30 px-3 text-sm normal-case tracking-normal text-white ${focus}`;
const label = "flex flex-col gap-1 text-xs uppercase tracking-wider text-[var(--muted)]";

export default function EmailPreviewTab({ adminKey }: { adminKey: string }) {
  const [leaders, setLeaders] = useState<LeaderOption[]>([]);
  const [email, setEmail] = useState("");
  const [kind, setKind] = useState<EmailKind>("digest");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    adminFetch("/api/admin/leaders", adminKey)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `Could not load leaders (${res.status})`);
        return (body.leaders ?? []) as LeaderOption[];
      })
      .then((list) => {
        if (cancelled) return;
        setLeaders(list);
        const first = list.find((l) => l.full_access) ?? list[0];
        if (first) setEmail((current) => current || first.email);
      })
      .catch((e: Error) => {
        console.error("EmailPreviewTab: leaders failed", e);
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [adminKey]);

  const show = async () => {
    if (!email || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/email-preview?kind=${kind}&email=${encodeURIComponent(email)}`, adminKey);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Could not render the preview (${res.status})`);
      setPreview(body as Preview);
    } catch (e) {
      console.error("EmailPreviewTab: preview failed", e);
      setPreview(null);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Henry to check wording */}
      <p className="text-sm text-[var(--muted)]">
        See any leader&rsquo;s email as it would be sent right now. Nothing is sent from here.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className={label}>
          Email
          <select value={kind} onChange={(e) => setKind(e.target.value as EmailKind)} className={field}>
            {EMAIL_KINDS.map((k) => (
              <option key={k} value={k}>
                {EMAIL_KIND_INFO[k].label}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Leader
          <select value={email} onChange={(e) => setEmail(e.target.value)} className={field}>
            {leaders.map((l) => (
              <option key={l.email} value={l.email}>
                {(l.name || l.email) + (l.full_access ? "" : " (no full access)")}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={show}
          aria-busy={busy}
          className={`min-h-[44px] rounded-lg bg-[var(--accent)] px-5 text-sm font-semibold text-white ${focus}`}
        >
          {busy ? "Rendering..." : "Show preview"}
        </button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}

      {preview ? (
        <div className="space-y-3">
          {preview.note ? <p className="text-sm text-amber-400">{preview.note}</p> : null}
          {preview.subject ? (
            <p className="text-sm text-white">
              <span className="text-[var(--muted)]">Subject: </span>
              {preview.subject}
            </p>
          ) : null}
          {preview.html ? (
            <iframe
              title="Email preview"
              sandbox=""
              srcDoc={preview.html}
              className="h-[900px] w-full rounded-xl border border-[var(--border)] bg-[#05070c]"
            />
          ) : null}
          {preview.text ? (
            <details>
              <summary className={`flex min-h-[44px] cursor-pointer items-center text-sm text-[var(--muted)] hover:text-white ${focus}`}>
                Plain-text version
              </summary>
              <pre className="whitespace-pre-wrap break-words rounded-lg border border-[var(--border)] p-4 text-xs text-[var(--muted)]">
                {preview.text}
              </pre>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
