// Reads everything one email run needs, once (spec 3.3). Nine whole-table
// reads through readRows, which fails loud on any error or on the row cap.
import type { SupabaseClient } from "@supabase/supabase-js";
import { INITIAL_PHASES } from "@/app/leaders/training/phases";
import { readRows } from "@/lib/adminRead";
import type { HealthCheckinRow, HealthPersonRow, HealthProfileRow } from "@/lib/churchHealth";
import type { NetworkRow, Snapshot, TrainingRow, WorksheetRow } from "./compose";
import { emailTablesError, PREFS_COLUMNS, type LeaderRow, type PrefsRow } from "./prefs";
import type { GuideRow } from "./topic";

// The Foundations module ids, from the same content the training page uses.
export function foundationsModuleIds(): string[] {
  const phase = INITIAL_PHASES.find((p) => p.id === "phase1");
  if (!phase || phase.modules.length === 0) throw new Error("loadSnapshot: no Foundations modules in INITIAL_PHASES");
  return phase.modules.map((m) => m.id);
}

export async function loadSnapshot(db: SupabaseClient, now: Date): Promise<Snapshot> {
  try {
    const [leaders, prefs, profiles, checkins, people, network, training, worksheets, guides] = await Promise.all([
      readRows<LeaderRow>(db, "leaders", "email, name, full_access"),
      readRows<PrefsRow>(db, "leader_email_prefs", PREFS_COLUMNS),
      readRows<HealthProfileRow>(db, "leader_profiles", "email, display_name, pathway_group"),
      readRows<HealthCheckinRow>(db, "leader_checkins", "email, week_start, relational, physical, mental, spiritual"),
      readRows<HealthPersonRow>(db, "leader_people", "owner_email, first_name, last_name, metrics, created_at"),
      readRows<NetworkRow>(db, "network_people", "id, email, first_name, last_name, sent_out_by, apprentice_step"),
      readRows<TrainingRow>(db, "leader_training_progress", "email, completed_modules"),
      readRows<WorksheetRow>(db, "leader_worksheets", "email, kind, data"),
      readRows<GuideRow>(db, "study_guides", "id, guide_date, series, topic, scripture, pdf_url"),
    ]);
    return {
      now,
      leaders,
      prefs,
      profiles,
      checkins,
      people,
      network,
      training,
      worksheets,
      guides,
      foundationsModuleIds: foundationsModuleIds(),
    };
  } catch (e) {
    throw new Error(emailTablesError((e as Error).message));
  }
}
