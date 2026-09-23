"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Users, X } from "lucide-react";
import { getCurrentUser, type User } from "@/lib/auth";
import { leaderFetch } from "@/lib/leaderFetch";
import Reveal from "@/components/ui/Reveal";
import NetworkGraph from "@/components/ui/NetworkGraph";
import type { NetworkPerson } from "@/lib/networkLayout";

export default function NetworkPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [people, setPeople] = useState<NetworkPerson[]>([]);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<NetworkPerson | null>(null);

  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "" });

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await leaderFetch("/api/network");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load the network.");
      setPeople(data.people ?? []);
      setViewerId(data.viewerId ?? null);
      setLoaded(true);
      return true;
    } catch (e) {
      setError((e as Error).message);
      setLoaded(false);
      setSelected(null);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) {
      router.push("/login");
      return;
    }
    setUser(current);
    load();
  }, [router, load]);

  const act = async (body: Record<string, unknown>) => {
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      const res = await leaderFetch("/api/network", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "That did not work.");
      return await load();
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await act({ action: "add", ...form });
    if (ok) {
      setForm({ firstName: "", lastName: "", email: "" });
      setAdding(false);
    }
  };

  const sentOutByName = (person: NetworkPerson) => {
    const parent = people.find((p) => p.id === person.sentOutBy);
    return parent ? parent.firstName : null;
  };

  const canRemove = (person: NetworkPerson) =>
    !!person.sentOutBy && (person.id === viewerId || person.sentOutBy === viewerId);

  const inputClass =
    "w-full bg-black/30 border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[var(--accent)] transition-colors";

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex items-center gap-3 text-[var(--muted)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading the network…
        </div>
      </div>
    );
  }

  const mine = people.filter((p) => p.sentOutBy === viewerId);

  return (
    <div className="min-h-screen bg-black">
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/leaders"
            className="flex items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Leaders Hub
          </Link>
          <span className="text-sm text-[var(--muted)]">{user.name}</span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <Reveal className="mb-8 text-center">
          <span className="eyebrow">Multiplication</span>
          <h1 className="mb-2 mt-2 text-3xl font-bold uppercase tracking-tight text-white md:text-4xl">
            Discipleship Network
          </h1>
          <p className="text-[var(--muted)]">
            Everyone Avenue has sent out, and everyone they have sent out in turn.
          </p>
        </Reveal>

        {loaded && (
          <Reveal className="mb-6 flex flex-wrap items-center justify-center gap-3">
            <span className="text-sm text-[var(--muted)]">
              {people.length} {people.length === 1 ? "person" : "people"} · you are sending out{" "}
              {mine.length}
            </span>
            <button
              onClick={() => setAdding((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-white transition-all hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add someone you sent out
            </button>
          </Reveal>
        )}

        {adding && loaded && (
          <Reveal className="mx-auto mb-6 max-w-xl">
            <form onSubmit={submitAdd} className="panel space-y-3 p-6">
              <span className="eyebrow">Someone you sent out</span>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  required
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  placeholder="First name"
                  className={inputClass}
                />
                <input
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  placeholder="Last name (optional)"
                  className={inputClass}
                />
              </div>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Email (optional, lets them confirm)"
                className={inputClass}
              />
              <p className="text-xs text-[var(--muted)]">
                With an email they can confirm the link once they have an account. Without
                one they stay on the chart as a name only.
              </p>
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Adding…" : "Add to the network"}
              </button>
            </form>
          </Reveal>
        )}

        {error && (
          <div className="mx-auto mb-6 max-w-xl panel border-red-500/40 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {loaded &&
          (people.length === 0 ? (
            <Reveal className="mx-auto max-w-xl">
              <div className="panel p-10 text-center">
                <Users className="mx-auto mb-4 h-10 w-10 text-[var(--accent)]" />
                <h2 className="mb-2 text-xl font-semibold text-white">Nobody here yet</h2>
                <p className="text-sm text-[var(--muted)]">
                  Add the first person you sent out and the network starts from there.
                </p>
              </div>
            </Reveal>
          ) : (
            <Reveal>
              <NetworkGraph
                people={people}
                viewerId={viewerId}
                selectedId={selected?.id ?? null}
                onSelect={setSelected}
              />
            </Reveal>
          ))}

        {loaded && selected && (
          <div className="mx-auto mt-6 max-w-xl">
            <div className="panel p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {[selected.firstName, selected.lastName].filter(Boolean).join(" ")}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {sentOutByName(selected)
                      ? `Sent out by ${sentOutByName(selected)}${
                          selected.linkStatus === "confirmed" ? "" : ", not confirmed yet"
                        }`
                      : "Not sent out by anyone yet"}
                  </p>
                  {!selected.joined && (
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Has not joined the site yet.
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                  className="rounded-lg p-2 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {canRemove(selected) && (
                <button
                  onClick={async () => {
                    const ok = await act({ action: "remove", id: selected.id });
                    if (ok) setSelected(null);
                  }}
                  disabled={saving}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-white transition-all hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
                >
                  Remove this link
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
