import { useState, useEffect, useRef } from "react";
import { User } from "@/lib/auth";
import { CheckinEntry } from "@/components/ui/CheckinHistory";
import { mondayOf } from "@/lib/weeks";

// Phase 4's weekly RPMS check-ins for the leader training page: state, the
// load effect, and the one-shot save. Moved out of page.tsx verbatim; the
// comments below still read as they did there. accessChecked and hasAccess
// gate the load effect exactly as they did in the page.
export function useCheckins(user: User | null, accessChecked: boolean, hasAccess: boolean) {
  // Phase 4's weekly RPMS check-ins. This is a completely separate data
  // source and save path from the training-progress machinery above: it
  // talks to /api/leader-checkins, not /api/leader-training, has no revision
  // guard, and its own PUT is a plain one-shot save rather than a debounced,
  // merge-on-conflict one. The two must never be routed through each other.
  const [checkins, setCheckins] = useState<CheckinEntry[]>([]);
  const [checkinsLoaded, setCheckinsLoaded] = useState(false);
  // Set when the GET for check-ins fails. Distinct from checkinSaveError
  // (a PUT failure): while this is set, the form is not rendered at all,
  // only a retry prompt, because rendering the form's 5/5/5/5 defaults
  // over a week that might already have real scores, with Save left
  // enabled, is exactly how one blipped load plus one click permanently
  // overwrites a leader's real check-in with defaults they never saw.
  const [checkinLoadError, setCheckinLoadError] = useState<string | null>(null);
  // Bumped by the retry button to re-run the load effect below.
  const [checkinLoadAttempt, setCheckinLoadAttempt] = useState(0);
  const [checkinForm, setCheckinForm] = useState({
    relational: 5,
    physical: 5,
    mental: 5,
    spiritual: 5,
    reflection: "",
  });
  const [checkinSaving, setCheckinSaving] = useState(false);
  const [checkinSaveError, setCheckinSaveError] = useState<string | null>(null);
  const [checkinSaved, setCheckinSaved] = useState(false);
  const checkinSavedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The single Monday this render's check-in form is editing: computed
  // once, not recomputed from `new Date()` separately at render time and
  // again at save time. Those two computations of "now" can disagree if
  // the page has been sitting open across the Sunday-to-Monday rollover,
  // which would show the leader one week's label while quietly saving into
  // a different week. Reusing this single value for the label, the
  // pre-fill lookup, and the save payload keeps all three in lockstep for
  // as long as this page stays open, even if the real calendar week moves
  // on underneath it.
  const [editingWeekStart] = useState<string>(() => mondayOf(new Date()));

  // Load this leader's RPMS check-ins, independently of training progress
  // above. If the current week already has an entry, the form opens
  // pre-filled with it, so re-opening the week edits it rather than the
  // leader re-entering scores from scratch and the PUT's upsert creating a
  // false sense of a second row (it does not; the API upserts on
  // (email, week_start), but the form must still look pre-filled).
  //
  // If this fails, checkinLoadError is set instead of quietly leaving the
  // form at its 5/5/5/5 defaults with Save still enabled: this leader's
  // real scores for the week may already exist on the server and simply
  // failed to load, and saving the unseen defaults over them would destroy
  // that data with no way back. The check-in card renders a retry prompt
  // in that state instead of the form; see checkinLoadError below.
  useEffect(() => {
    if (!accessChecked || !hasAccess || !user) return;
    let cancelled = false;
    setCheckinLoadError(null);
    fetch(`/api/leader-checkins?email=${encodeURIComponent(user.email)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load check-ins (${res.status})`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const list: CheckinEntry[] = data.checkins ?? [];
        setCheckins(list);
        const existing = list.find((c) => c.weekStart === editingWeekStart);
        if (existing) {
          setCheckinForm({
            relational: existing.relational,
            physical: existing.physical,
            mental: existing.mental,
            spiritual: existing.spiritual,
            reflection: existing.reflection ?? "",
          });
        }
        setCheckinsLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setCheckinsLoaded(true);
        setCheckinLoadError(
          "Could not load this week's check-in. Saving is turned off until it loads, so real scores can't be overwritten by defaults you never saw."
        );
      });
    return () => {
      cancelled = true;
    };
  }, [accessChecked, hasAccess, user, editingWeekStart, checkinLoadAttempt]);

  // Clear the pending "Saved." timeout on unmount so it cannot fire after
  // the component is gone.
  useEffect(() => {
    return () => {
      if (checkinSavedTimeoutRef.current) clearTimeout(checkinSavedTimeoutRef.current);
    };
  }, []);

  // Saves the current week's RPMS check-in. Deliberately a plain one-shot
  // PUT, not routed through scheduleSave/runSave/performSave above: those
  // exist to serialise and merge training-progress saves against a revision
  // guard, none of which applies here. The API's upsert on
  // (email, week_start) is what makes re-saving the same week edit it
  // rather than create a second row.
  const saveCheckin = async () => {
    if (!user) return;
    setCheckinSaving(true);
    setCheckinSaveError(null);
    try {
      const res = await fetch("/api/leader-checkins", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          weekStart: editingWeekStart,
          relational: checkinForm.relational,
          physical: checkinForm.physical,
          mental: checkinForm.mental,
          spiritual: checkinForm.spiritual,
          reflection: checkinForm.reflection.trim() === "" ? null : checkinForm.reflection,
        }),
      });
      // Read the error out of the response body, same as setApprenticeStep
      // does below, so a validation 400 (for example a rejected week) shows
      // its actual reason instead of reading as a generic, transient
      // network blip every time.
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || `Could not save your check-in (${res.status})`);
      }
      const saved: CheckinEntry = body.checkin;
      setCheckins((prev) => {
        const others = prev.filter((c) => c.weekStart !== saved.weekStart);
        return [saved, ...others].sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));
      });
      if (checkinSavedTimeoutRef.current) clearTimeout(checkinSavedTimeoutRef.current);
      setCheckinSaved(true);
      checkinSavedTimeoutRef.current = setTimeout(() => {
        checkinSavedTimeoutRef.current = null;
        setCheckinSaved(false);
      }, 3000);
    } catch (e) {
      setCheckinSaveError(
        e instanceof Error && e.message
          ? e.message
          : "Could not save your check-in. It is kept on this page, try again shortly."
      );
    } finally {
      setCheckinSaving(false);
    }
  };

  return {
    checkins,
    checkinsLoaded,
    setCheckinsLoaded,
    checkinLoadError,
    setCheckinLoadAttempt,
    checkinForm,
    setCheckinForm,
    checkinSaving,
    checkinSaveError,
    checkinSaved,
    editingWeekStart,
    saveCheckin,
  };
}
