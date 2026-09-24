// The public site's editable content (site_stats, pathway_groups,
// intersection_events and their dates), as the pages use it. Pure.
import { melbourneInstant } from "@/lib/domain/dates/melbourne";

export interface SiteStat {
  key: string;
  value: number;
  label: string;
}

// A group on the /pathways map. The coordinator's phone stays in the
// database: the public page never shows it.
export interface PathwayGroup {
  id: number;
  name: string;
  coordinates: [number, number];
  time: string;
  coordinator: string;
  running: boolean;
  description: string;
}

export interface IntersectionEventDate {
  id: string;
  event_key: string;
  event_date: string; // YYYY-MM-DD
  event_time: string; // HH:MM, Melbourne time
}

export interface IntersectionEvent {
  key: string;
  title: string;
  description: string;
  location: string;
  time: string;
  sort_order: number;
  dates: IntersectionEventDate[]; // in date order
}

// The pathway_groups columns the map needs.
export const PATHWAY_GROUP_COLUMNS = "id, name, latitude, longitude, time, coordinator, running, description, sort_order";

export function pathwayGroupFromRow(row: Record<string, unknown>): PathwayGroup {
  return {
    id: Number(row.id),
    name: String(row.name),
    coordinates: [Number(row.latitude), Number(row.longitude)],
    time: String(row.time ?? ""),
    coordinator: String(row.coordinator ?? ""),
    running: Boolean(row.running),
    description: String(row.description ?? ""),
  };
}

// A counter's value. A missing row is an error, never a made-up number.
export function statValue(stats: SiteStat[], key: string): number {
  const stat = stats.find((s) => s.key === key);
  if (!stat) throw new Error(`site_stats has no ${key} row`);
  return stat.value;
}

const HH_MM = /^(\d{1,2}):(\d{2})$/;

// The first of an event's dates (in date order) that is still ahead of
// `now`, at its Melbourne start time; null when all have passed.
export function nextEventStart(dates: IntersectionEventDate[], now: Date): Date | null {
  for (const d of dates) {
    const m = HH_MM.exec(d.event_time);
    if (!m) throw new Error(`intersection_event_dates ${d.id}: event_time must be HH:MM`);
    const start = melbourneInstant(d.event_date, Number(m[1]), Number(m[2]));
    if (start.getTime() > now.getTime()) return start;
  }
  return null;
}
