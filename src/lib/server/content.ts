import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { STUDY_GUIDE_COLUMNS, type StudyGuide } from "@/lib/domain/studyGuides";
import {
  PATHWAY_GROUP_COLUMNS,
  pathwayGroupFromRow,
  type IntersectionEvent,
  type IntersectionEventDate,
  type PathwayGroup,
  type SiteStat,
} from "@/lib/domain/content";

// Public page content, read on the server with the service role (anon has
// no table access). Every read throws on error: a page never shows made-up
// content, it shows the (site) error screen and ISR keeps the last good copy.

function fail(table: string, error: { message: string }): never {
  throw new Error(`${table}: ${error.message}`);
}

export async function getSiteStats(): Promise<SiteStat[]> {
  const { data, error } = await getSupabaseAdmin().from("site_stats").select("key, value, label");
  if (error) fail("site_stats", error);
  return (data ?? []) as SiteStat[];
}

export async function getPathwayGroups(): Promise<PathwayGroup[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("pathway_groups")
    .select(PATHWAY_GROUP_COLUMNS)
    .order("sort_order", { ascending: true });
  if (error) fail("pathway_groups", error);
  return ((data ?? []) as Record<string, unknown>[]).map(pathwayGroupFromRow);
}

export async function getIntersectionEvents(): Promise<IntersectionEvent[]> {
  const db = getSupabaseAdmin();
  const [events, dates] = await Promise.all([
    db.from("intersection_events").select("key, title, description, location, time, sort_order").order("sort_order", { ascending: true }),
    db.from("intersection_event_dates").select("id, event_key, event_date, event_time").order("event_date", { ascending: true }),
  ]);
  if (events.error) fail("intersection_events", events.error);
  if (dates.error) fail("intersection_event_dates", dates.error);
  const allDates = (dates.data ?? []) as IntersectionEventDate[];
  return ((events.data ?? []) as Omit<IntersectionEvent, "dates">[]).map((event) => ({
    ...event,
    description: event.description ?? "",
    location: event.location ?? "",
    time: event.time ?? "",
    dates: allDates.filter((d) => d.event_key === event.key),
  }));
}

export async function getStudyGuides(): Promise<StudyGuide[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("study_guides")
    .select(STUDY_GUIDE_COLUMNS)
    .order("sort_order", { ascending: true });
  if (error) fail("study_guides", error);
  return (data ?? []) as unknown as StudyGuide[];
}

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];
const FOLDER_NAME = /^[a-zA-Z0-9_-]+$/;

// Every image in public/images/<folder>, as public paths, sorted by name.
// The list only changes on deploy, so pages read it while rendering.
export async function getCarouselImages(folder: string): Promise<string[]> {
  if (!FOLDER_NAME.test(folder)) throw new Error(`Bad carousel folder name: ${JSON.stringify(folder)}`);
  const files = await fs.readdir(path.join(process.cwd(), "public", "images", folder));
  return files
    .filter((file) => IMAGE_EXTENSIONS.includes(path.extname(file).toLowerCase()))
    .sort()
    .map((file) => `/images/${folder}/${file}`);
}
