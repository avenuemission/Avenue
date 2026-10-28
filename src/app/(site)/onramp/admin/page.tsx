"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Download, Lock, QrCode, RefreshCw } from "lucide-react";
import { adminErrorMessage, adminFetch } from "@/lib/client/adminFetch";
import { useAdminKey } from "@/hooks/useAdminKey";
import { ONRAMP } from "@/content/onramp";
import { signupsCsv, workshopCounts, workshopLabel, type OnrampRow } from "@/lib/domain/onramp";

// /onramp/admin: the On-Ramp sign-ups, per-workshop counts, a CSV download
// and the QR code. Admin passcode only (no leader sign-in), checked by
// /api/admin/session and again by /api/admin/onramp. The passcode is kept
// for this browser tab only (sessionStorage), like /leaders/admin.

const LOCKED_OUT = "Too many attempts. Please wait a few minutes and try again.";

async function probe(key: string): Promise<"ok" | "wrong" | "locked" | "error"> {
  const res = await adminFetch("/api/admin/session", key);
  if (res.status === 204) return "ok";
  if (res.status === 401) return "wrong";
  if (res.status === 429) return "locked";
  return "error";
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-AU", { timeZone: "Australia/Melbourne", dateStyle: "medium", timeStyle: "short" });

export default function OnrampAdminPage() {
  const { key: storedKey, setKey, clear } = useAdminKey();
  const [verifiedKey, setVerifiedKey] = useState<string | null>(null);
  const [typedKey, setTypedKey] = useState("");
  const [authError, setAuthError] = useState("");
  const [rows, setRows] = useState<OnrampRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloads, setReloads] = useState(0);
  const authenticated = storedKey !== null && storedKey === verifiedKey;

  // A passcode kept from earlier in this tab is checked again on load.
  useEffect(() => {
    if (storedKey === null || storedKey === verifiedKey) return;
    let cancelled = false;
    probe(storedKey)
      .then((result) => {
        if (cancelled) return;
        if (result === "ok") setVerifiedKey(storedKey);
        else clear();
      })
      .catch((e) => console.error("onramp admin: stored key check failed", e));
    return () => {
      cancelled = true;
    };
  }, [storedKey, verifiedKey, clear]);

  const load = useCallback(async (key: string) => {
    const res = await adminFetch("/api/admin/onramp", key);
    if (!res.ok) throw new Error(`Could not load sign-ups: ${await adminErrorMessage(res)}`);
    return ((await res.json()) as { signups: OnrampRow[] }).signups;
  }, []);

  useEffect(() => {
    if (!authenticated || storedKey === null) return;
    let cancelled = false;
    load(storedKey).then(
      (data) => {
        if (cancelled) return;
        setRows(data);
        setLoadError(null);
      },
      (e: unknown) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Could not load sign-ups");
      }
    );
    return () => {
      cancelled = true;
    };
  }, [authenticated, storedKey, load, reloads]);

  const unlock = (e: FormEvent) => {
    e.preventDefault();
    const key = typedKey.trim();
    if (!key) return;
    probe(key)
      .then((result) => {
        if (result === "ok") {
          setVerifiedKey(key);
          setKey(key);
          setAuthError("");
        } else setAuthError(result === "locked" ? LOCKED_OUT : result === "wrong" ? "Invalid admin passcode" : "Could not check the passcode");
      })
      .catch(() => setAuthError("Could not check the passcode"));
  };

  const downloadCsv = () => {
    if (!rows) return;
    const url = URL.createObjectURL(new Blob([signupsCsv(rows)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `onramp-signups-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!authenticated) {
    return (
      <div className="avenue-night flex items-start justify-center px-5 pt-16">
        <form onSubmit={unlock} className="night-card w-full max-w-md p-7">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--lamp-soft)]">
              <Lock className="h-5 w-5 text-[var(--lamp)]" aria-hidden="true" />
            </span>
            <h1 className="text-xl font-bold uppercase tracking-wider text-white">On-Ramp sign-ups</h1>
          </div>
          <label htmlFor="onramp-admin-key" className="mb-2 block text-sm text-[var(--muted)]">
            Enter the admin passcode to see who has signed up.
          </label>
          <input
            id="onramp-admin-key"
            type="password"
            value={typedKey}
            onChange={(e) => setTypedKey(e.target.value)}
            autoComplete="current-password"
            className="min-h-[48px] w-full rounded-lg border border-[var(--line-2)] bg-[var(--night)] px-4 text-white focus:border-[var(--lamp)] focus:outline-none"
          />
          {authError && (
            <p role="alert" className="mt-3 text-sm text-red-400">
              {authError}
            </p>
          )}
          <button type="submit" className="btn-lamp mt-4 min-h-[48px] w-full text-sm">
            Unlock
          </button>
        </form>
      </div>
    );
  }

  const counts = rows ? workshopCounts(rows) : [];
  const top = Math.max(1, ...counts.map((c) => c.count));

  return (
    <div className="avenue-night">
      <div className="mx-auto max-w-5xl px-5 pb-16 pt-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--lamp)]">{ONRAMP.date}</p>
            <h1 className="mt-1 text-3xl font-bold uppercase tracking-tight text-white md:text-4xl">On-Ramp sign-ups</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setReloads((n) => n + 1)}
              className="btn-night inline-flex min-h-[44px] items-center gap-2 px-4 text-xs"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
            </button>
            <button
              type="button"
              onClick={downloadCsv}
              disabled={!rows || rows.length === 0}
              className="btn-lamp min-h-[44px] px-5 text-xs disabled:opacity-50"
            >
              {/* .btn-lamp sets display itself, so the icon row is an inner span. */}
              <span className="flex items-center gap-2">
                <Download className="h-4 w-4" aria-hidden="true" /> Download CSV
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                clear();
                setVerifiedKey(null);
                setTypedKey("");
              }}
              className="inline-flex min-h-[44px] items-center px-3 text-xs text-[var(--muted)] hover:text-white"
            >
              Lock
            </button>
          </div>
        </header>

        {loadError && (
          <p role="alert" className="mt-6 text-sm text-red-400">
            {loadError}
          </p>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-6">
            {/* Counts */}
            <section className="night-card p-5" aria-labelledby="onramp-counts">
              <div className="flex items-baseline justify-between">
                <h2 id="onramp-counts" className="night-label">
                  Workshops
                </h2>
                <span className="text-sm text-[var(--ink-2)]">
                  <strong className="text-2xl font-bold text-white tabular-nums">{rows?.length ?? "–"}</strong> signed up
                </span>
              </div>
              <ul className="mt-4 space-y-3">
                {counts.map((c) => (
                  <li key={c.id}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-[var(--ink)]">{workshopLabel(c.id)}</span>
                      <span className="font-semibold text-white tabular-nums">{c.count}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--line)]">
                      <div className="h-full rounded-full bg-[var(--lamp)]" style={{ width: `${(c.count / top) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Sign-ups */}
            <section aria-labelledby="onramp-list">
              <h2 id="onramp-list" className="night-label mb-3">
                Everyone, newest first
              </h2>
              {rows === null && !loadError ? (
                <p className="text-[var(--muted)]">Loading...</p>
              ) : rows && rows.length === 0 ? (
                <p className="text-[var(--muted)]">No sign-ups yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-[var(--night-2)] text-left">
                      <tr>
                        {["Name", "Email", "Workshops", "Signed up"].map((h) => (
                          <th key={h} className="night-label px-4 py-3 font-normal">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows?.map((r) => (
                        <tr key={r.id} className="border-t border-[var(--line)] align-top">
                          <td className="px-4 py-3 font-semibold text-white">{r.name}</td>
                          <td className="px-4 py-3 text-[var(--ink-2)]">{r.email}</td>
                          <td className="px-4 py-3 text-[var(--ink-2)]">
                            {r.workshops.map((w) => (
                              <span key={w} className="block">
                                {workshopLabel(w)}
                              </span>
                            ))}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)] tabular-nums">
                            {when(r.created_at)}
                            {r.updated_at !== r.created_at && <span className="block text-xs">updated {when(r.updated_at)}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          {/* QR code */}
          <aside className="night-card h-fit min-w-0 p-5" aria-labelledby="onramp-qr">
            <h2 id="onramp-qr" className="night-label flex items-center gap-2">
              <QrCode className="h-4 w-4 text-[var(--lamp)]" aria-hidden="true" /> QR code
            </h2>
            {/* eslint-disable-next-line @next/next/no-img-element -- a static SVG shown as is; next/image adds nothing here */}
            <img
              src="/images/onramp-qr.svg"
              alt="QR code for avenuemission.com/onramp"
              width={260}
              height={260}
              className="mt-4 w-full rounded-lg"
            />
            <p className="mt-3 text-center text-sm text-[var(--ink-2)]">avenuemission.com/onramp</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a href="/images/onramp-qr.png" download="avenue-onramp-qr.png" className="btn-lamp py-3 text-center text-xs">
                PNG
              </a>
              <a href="/images/onramp-qr.svg" download="avenue-onramp-qr.svg" className="btn-night py-3 text-center text-xs">
                SVG
              </a>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
