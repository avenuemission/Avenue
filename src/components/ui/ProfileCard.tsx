"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  Cake,
  Droplets,
  BookOpen,
  Music,
  Coffee,
  Sparkles,
  Pencil,
  X,
  Loader2,
  ChevronUp,
  Compass,
  Rocket,
} from "lucide-react";
import Link from "next/link";
import { leaderFetch } from "@/lib/leaderFetch";

interface Profile {
  display_name: string;
  avatar_url: string;
  birthday: string;
  baptism_anniversary: string;
  favourite_verse: string;
  favourite_verse_ref: string;
  pathway_group: string;
  role: string;
  apest: string;
  about: string;
  favourite_song: string;
  coffee_order: string;
}

const EMPTY: Profile = {
  display_name: "",
  avatar_url: "",
  birthday: "",
  baptism_anniversary: "",
  favourite_verse: "",
  favourite_verse_ref: "",
  pathway_group: "",
  role: "",
  apest: "",
  about: "",
  favourite_song: "",
  coffee_order: "",
};

const ROLES = ["Leader", "Apprentice", "Coordinator", "Member"];
const APEST = ["Apostle", "Prophet", "Evangelist", "Shepherd", "Teacher"];

const AVATAR_PX = 256;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // reject huge originals before decoding

// Shrink whatever they picked to a small square JPEG so it's fast to load and
// small enough to store. Centre-cropped so faces don't get squashed.
function resizeToSquareDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file isn't a readable image."));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = AVATAR_PX;
        canvas.height = AVATAR_PX;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Image processing isn't supported here."));

        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_PX, AVATAR_PX);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

// Birthdays read better without a year; anniversaries keep theirs.
function formatDate(value: string, withYear: boolean) {
  if (!value) return "";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

interface ProfileCardProps {
  email: string;
  fallbackName: string;
  collapsible?: boolean;
}

export default function ProfileCard({ email, fallbackName, collapsible = false }: ProfileCardProps) {
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [draft, setDraft] = useState<Profile>(EMPTY);
  const [editing, setEditing] = useState(false);
  // Collapsed by default only when the parent asks for it, so every other
  // caller keeps the old always-open behaviour.
  const [open, setOpen] = useState(!collapsible);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [groups, setGroups] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await leaderFetch("/api/leader-profile");
      const json = await res.json();
      const loaded: Profile = { ...EMPTY };
      if (json.profile) {
        for (const key of Object.keys(EMPTY) as (keyof Profile)[]) {
          loaded[key] = json.profile[key] ?? "";
        }
      }
      if (!loaded.display_name) loaded.display_name = fallbackName;
      setProfile(loaded);
    } catch {
      // Leave the card in its empty state; the user can still fill it in.
    } finally {
      setLoading(false);
    }
  }, [fallbackName]);

  // The profile is always the signed-in leader's own (the server reads the
  // email from the session), but a change of signed-in email still reloads it.
  useEffect(() => {
    load();
  }, [load, email]);

  useEffect(() => {
    fetch("/api/content/pathway-groups")
      .then((r) => r.json())
      .then((j) => setGroups((j.groups ?? []).map((g: { name: string }) => g.name)))
      .catch(() => {});
  }, []);

  const startEdit = () => {
    setDraft(profile);
    setError("");
    setEditing(true);
  };

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("That image is very large. Please pick one under 8MB.");
      return;
    }
    try {
      const dataUrl = await resizeToSquareDataUrl(file);
      setDraft((d) => ({ ...d, avatar_url: dataUrl }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not process that image.");
    }
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await leaderFetch("/api/leader-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not save your profile.");
      setProfile(draft);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full bg-black/30 border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[var(--accent)] transition-colors";
  const labelClass = "block text-xs text-[var(--muted)] uppercase tracking-wider mb-1.5";

  const name = profile.display_name || fallbackName;

  const avatar = (url: string, size: string, text: string) =>
    url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" className={`${size} rounded-full object-cover border border-[var(--border)]`} />
    ) : (
      <div
        className={`${size} rounded-full border border-[var(--border)] bg-[var(--surface-hover)] flex items-center justify-center font-bold text-[var(--accent)] ${text}`}
      >
        {initialsOf(name)}
      </div>
    );

  const facts = [
    { icon: Cake, label: "Birthday", value: formatDate(profile.birthday, false) },
    { icon: Droplets, label: "Baptism anniversary", value: formatDate(profile.baptism_anniversary, true) },
    { icon: Music, label: "Favourite song", value: profile.favourite_song },
    { icon: Coffee, label: "Coffee order", value: profile.coffee_order },
  ].filter((f) => f.value);

  if (loading) {
    return (
      <div className="panel p-6 flex items-center gap-3 text-[var(--muted)] text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading your profile…
      </div>
    );
  }

  // ---------- Collapsed ----------
  // Just the avatar. The dashboard leads with actions, not with your own face.
  if (collapsible && !open && !editing) {
    return (
      <div className="flex justify-center">
        <button
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-label="Open my profile"
          title="My Profile"
          className="rounded-full transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          {avatar(profile.avatar_url, "w-14 h-14", "text-base")}
        </button>
      </div>
    );
  }

  // ---------- Edit mode ----------
  if (editing) {
    return (
      <div className="panel p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <span className="eyebrow">Edit profile</span>
          <button
            onClick={() => setEditing(false)}
            aria-label="Cancel editing"
            className="p-2 rounded-lg text-[var(--muted)] hover:text-white hover:bg-[var(--surface-hover)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Photo */}
        <div className="flex items-center gap-5 mb-6">
          {avatar(draft.avatar_url, "w-20 h-20", "text-xl")}
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickPhoto(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-white hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] transition-all"
            >
              <Camera className="w-4 h-4" />
              {draft.avatar_url ? "Change photo" : "Upload photo"}
            </button>
            {draft.avatar_url && (
              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, avatar_url: "" }))}
                className="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] hover:text-white transition-colors"
              >
                Remove
              </button>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Display name</label>
            <input
              className={inputClass}
              value={draft.display_name}
              onChange={(e) => setDraft({ ...draft, display_name: e.target.value })}
              placeholder="How you'd like to be known"
            />
          </div>

          <div>
            <label className={labelClass}>Birthday</label>
            <input
              type="date"
              className={inputClass}
              value={draft.birthday}
              onChange={(e) => setDraft({ ...draft, birthday: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Baptism anniversary</label>
            <input
              type="date"
              className={inputClass}
              value={draft.baptism_anniversary}
              onChange={(e) => setDraft({ ...draft, baptism_anniversary: e.target.value })}
            />
          </div>

          <div>
            <label className={labelClass}>Pathway group</label>
            <select
              className={inputClass}
              value={draft.pathway_group}
              onChange={(e) => setDraft({ ...draft, pathway_group: e.target.value })}
            >
              <option value="">Not set</option>
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Role</label>
            <select
              className={inputClass}
              value={draft.role}
              onChange={(e) => setDraft({ ...draft, role: e.target.value })}
            >
              <option value="">Not set</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>APEST gifting</label>
            <select
              className={inputClass}
              value={draft.apest}
              onChange={(e) => setDraft({ ...draft, apest: e.target.value })}
            >
              <option value="">Not set</option>
              {APEST.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Favourite worship song</label>
            <input
              className={inputClass}
              value={draft.favourite_song}
              onChange={(e) => setDraft({ ...draft, favourite_song: e.target.value })}
              placeholder="e.g. Goodness of God"
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>Favourite Bible verse</label>
            <textarea
              rows={2}
              className={`${inputClass} resize-none`}
              value={draft.favourite_verse}
              onChange={(e) => setDraft({ ...draft, favourite_verse: e.target.value })}
              placeholder="The verse itself"
            />
          </div>
          <div>
            <label className={labelClass}>Verse reference</label>
            <input
              className={inputClass}
              value={draft.favourite_verse_ref}
              onChange={(e) => setDraft({ ...draft, favourite_verse_ref: e.target.value })}
              placeholder="e.g. Philippians 4:13"
            />
          </div>
          <div>
            <label className={labelClass}>Coffee order</label>
            <input
              className={inputClass}
              value={draft.coffee_order}
              onChange={(e) => setDraft({ ...draft, coffee_order: e.target.value })}
              placeholder="e.g. Oat flat white"
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>About me</label>
            <input
              className={inputClass}
              value={draft.about}
              onChange={(e) => setDraft({ ...draft, about: e.target.value })}
              placeholder="One line about you"
            />
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white hover:brightness-110 transition-all disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Saving…" : "Save profile"}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded-full border border-[var(--border)] px-6 py-2.5 text-sm text-[var(--muted)] hover:text-white hover:border-[var(--border-strong)] transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ---------- Display mode ----------
  return (
    <div className="panel p-6 md:p-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <span className="eyebrow">My Profile</span>
        <div className="flex items-center gap-2">
        {collapsible && (
          <button
            onClick={() => setOpen(false)}
            aria-expanded
            aria-label="Collapse my profile"
            className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] p-2 text-[var(--muted)] hover:text-white hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] transition-all"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={startEdit}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] transition-all"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
        {avatar(profile.avatar_url, "w-24 h-24", "text-2xl")}
        <div className="min-w-0">
          <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">{name}</h2>
          {(profile.role || profile.pathway_group) && (
            <p className="mt-1 text-[var(--muted)]">
              {[profile.role, profile.pathway_group].filter(Boolean).join(" · ")}
            </p>
          )}
          {profile.apest && (
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-3 py-1 text-xs font-semibold text-[var(--accent)]">
              <Sparkles className="w-3 h-3" />
              {profile.apest}
            </span>
          )}
          {profile.about && (
            <p className="mt-3 text-sm text-[var(--muted)] italic">&ldquo;{profile.about}&rdquo;</p>
          )}
        </div>
      </div>

      {profile.favourite_verse && (
        <div className="mt-6 border-l-2 border-[var(--accent)]/50 pl-4">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span className="text-xs uppercase tracking-wider text-[var(--muted)]">
              Favourite verse
            </span>
          </div>
          <p className="text-white leading-relaxed">&ldquo;{profile.favourite_verse}&rdquo;</p>
          {profile.favourite_verse_ref && (
            <p className="mt-1 text-sm text-[var(--accent)]">{profile.favourite_verse_ref}</p>
          )}
        </div>
      )}

      {facts.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-5">
          {facts.map((f) => (
            <div key={f.label} className="flex items-start gap-2.5">
              <f.icon className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--accent)]" />
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-[var(--muted)]">{f.label}</p>
                <p className="text-sm text-white truncate">{f.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!profile.avatar_url && facts.length === 0 && !profile.favourite_verse && (
        <p className="mt-6 text-sm text-[var(--muted)] italic">
          Add a photo and a few details to make this yours.
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3 border-t border-[var(--border)] pt-5">
        <Link
          href="/leaders/training/calling/profile"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-5 text-sm font-semibold text-white hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] transition-all"
        >
          <Compass className="w-4 h-4 text-[var(--accent)]" />
          My Calling Profile
        </Link>
        <Link
          href="/leaders/training/launch/plan"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-5 text-sm font-semibold text-white hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] transition-all"
        >
          <Rocket className="w-4 h-4 text-[var(--accent)]" />
          My Launch Plan
        </Link>
      </div>
    </div>
  );
}
