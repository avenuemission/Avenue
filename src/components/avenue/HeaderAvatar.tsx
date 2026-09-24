"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import ProfileCard from "@/components/ui/ProfileCard";
import EmailPrefsPanel from "@/components/ui/EmailPrefsPanel";
import { leaderFetch } from "@/lib/leaderFetch";
import { avatarFromProfileResponse, initialsOf, type AvatarSummary } from "@/lib/profileAvatar";

export interface HeaderAvatarProps {
  user: { email: string; name: string } | null;
}

// Round 2 spec 1: the leader's photo (or initials), 36 px inside a 44 px
// button at the top right of every leader header. Tapping it opens the
// existing ProfileCard, unchanged, in a panel. Escape, the close button or
// a click on the backdrop closes it, and focus returns to the avatar.
export default function HeaderAvatar({ user }: HeaderAvatarProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Whether the press that started this click sequence landed outside the
  // sheet's box. A text selection dragged from an input out past the
  // backdrop fires mousedown inside and click (on mouseup) outside, so the
  // backdrop close only fires when both ends were outside.
  const downOutside = useRef(false);
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<AvatarSummary | null>(null);
  // Bumped each time the panel closes, so a photo saved inside it shows here.
  const [reloadKey, setReloadKey] = useState(0);

  const email = user?.email ?? null;
  const fallbackName = user?.name ?? "";

  // The same read ProfileCard makes. If it fails, the initials stay and the
  // failure is logged: a missing photo must never break a page.
  useEffect(() => {
    if (!email) return;
    let cancelled = false;
    leaderFetch("/api/leader-profile")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || `Could not load your profile (${res.status})`);
        return json;
      })
      .then((json) => {
        if (!cancelled) setSummary(avatarFromProfileResponse(json, fallbackName));
      })
      .catch((e) => {
        console.error("HeaderAvatar: profile load failed", e);
      });
    return () => {
      cancelled = true;
    };
  }, [email, fallbackName, reloadKey]);

  // The dialog follows `open`. showModal() puts it in the top layer, traps
  // focus inside it and moves focus to its first control (the close button).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  // Runs for every way the dialog closes: Escape, the close button, the
  // backdrop.
  const handleClose = () => {
    setOpen(false);
    setReloadKey((k) => k + 1);
    buttonRef.current?.focus();
  };

  if (!user) return null;
  const name = summary?.name ?? user.name;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="My profile"
        aria-haspopup="dialog"
        className="no-print inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lamp)]"
      >
        {summary?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={summary.avatarUrl}
            alt=""
            className="h-9 w-9 rounded-full border border-[var(--line-2)] object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line-2)] bg-[var(--night-2)] text-xs font-semibold text-[var(--ink)]"
          >
            {initialsOf(name)}
          </span>
        )}
      </button>
      <dialog
        ref={dialogRef}
        aria-label="My profile"
        className="av-sheet no-print"
        onClose={handleClose}
        onPointerDown={(e) => {
          // Records whether this press started outside the sheet's box, so
          // a drag that starts inside (a text selection) and releases
          // outside is not treated as a backdrop click.
          if (e.target !== e.currentTarget) {
            downOutside.current = false;
            return;
          }
          const box = e.currentTarget.getBoundingClientRect();
          const inside =
            e.clientX >= box.left && e.clientX <= box.right && e.clientY >= box.top && e.clientY <= box.bottom;
          downOutside.current = !inside;
        }}
        onClick={(e) => {
          // A click on the ::backdrop reports the dialog as its target, but
          // so does a click on empty space inside the sheet (on desktop the
          // sheet is full height and the card is shorter). Only a click
          // outside the sheet's box closes it, and only when the press that
          // started it was also outside, so an unsaved edit is never
          // dropped by a stray click inside or a selection dragged out of
          // an input (pre-flight F3). Keyboard activation reports 0,0 and
          // never targets the dialog itself.
          if (e.target !== e.currentTarget) return;
          const box = e.currentTarget.getBoundingClientRect();
          const inside =
            e.clientX >= box.left && e.clientX <= box.right && e.clientY >= box.top && e.clientY <= box.bottom;
          if (!inside && downOutside.current) setOpen(false);
        }}
      >
        <div className="av-sheet-body">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close my profile"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--muted)] hover:text-[var(--ink)]"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          {/* Mounted only while open, so both load fresh each time. */}
          {open ? (
            <div className="space-y-6">
              <ProfileCard email={user.email} fallbackName={user.name} />
              <EmailPrefsPanel />
            </div>
          ) : null}
        </div>
      </dialog>
    </>
  );
}
