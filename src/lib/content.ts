import { PATHWAY_GROUPS as FALLBACK_PATHWAY_GROUPS, PATHWAY_STATS as FALLBACK_PATHWAY_STATS, INTERSECTION_EVENTS as FALLBACK_INTERSECTION_EVENTS } from "@/lib/data";

export interface PathwayGroup {
  id: number;
  name: string;
  coordinates: [number, number];
  time: string;
  coordinator: string;
  phone: string;
  running: boolean;
  description: string;
}

export interface SiteStat {
  key: string;
  value: number;
  label: string;
}

export interface IntersectionEvent {
  key: string;
  title: string;
  description: string;
  location: string;
  time: string;
  sort_order: number;
}

export interface IntersectionEventDate {
  id: string;
  event_key: string;
  event_date: string;
  event_time: string;
}

export interface StudyGuide {
  id: string;
  guide_date: string;
  series: string;
  topic: string;
  scripture: string;
  spotify_url: string;
  pdf_url: string;
  color: string;
}

// Load pathway groups from Supabase, falling back to hardcoded constants
export async function getPathwayGroups(): Promise<PathwayGroup[]> {
  try {
    const res = await fetch("/api/content/pathway-groups", { cache: "no-store" });
    if (!res.ok) throw new Error("Pathway groups API failed");
    const json = await res.json();
    const raw = json.groups as Array<Record<string, unknown>>;
    const groups = (raw || []).map((g) => ({
      id: Number(g.id),
      name: String(g.name),
      coordinates: [Number(g.latitude), Number(g.longitude)] as [number, number],
      time: String(g.time || ""),
      coordinator: String(g.coordinator || ""),
      phone: String(g.phone || ""),
      running: Boolean(g.running),
      description: String(g.description || ""),
    }));
    return groups.length > 0 ? groups : FALLBACK_PATHWAY_GROUPS;
  } catch (error) {
    console.error("Failed to load pathway groups from Supabase:", error);
    return FALLBACK_PATHWAY_GROUPS;
  }
}

// Load site stats from Supabase, falling back to constants
export async function getPathwayStats(): Promise<Record<string, number>> {
  try {
    const res = await fetch("/api/content/site-stats", { cache: "no-store" });
    if (!res.ok) throw new Error("Site stats API failed");
    const json = await res.json();
    const stats: SiteStat[] = json.stats || [];
    if (stats.length > 0) {
      return stats.reduce((acc, s) => {
        acc[s.key] = s.value;
        return acc;
      }, {} as Record<string, number>);
    }
  } catch (error) {
    console.error("Failed to load site stats from Supabase:", error);
  }

  return {
    communities: FALLBACK_PATHWAY_STATS.communities,
    countries: FALLBACK_PATHWAY_STATS.countries,
    languages: FALLBACK_PATHWAY_STATS.languages,
    new_groups: FALLBACK_PATHWAY_STATS.newGroupsStartingSoon,
  };
}

// Load intersection events + dates from Supabase, falling back to constants
export async function getIntersectionEvents(): Promise<{
  events: IntersectionEvent[];
  dates: IntersectionEventDate[];
}> {
  try {
    const res = await fetch("/api/content/intersection-events", { cache: "no-store" });
    if (!res.ok) throw new Error("Intersection events API failed");
    const json = await res.json();
    if ((json.events?.length || 0) > 0) {
      return { events: json.events || [], dates: json.dates || [] };
    }
  } catch (error) {
    console.error("Failed to load intersection events from Supabase:", error);
  }

  const fallbackEvents = [
    {
      key: "prayerAndPraise",
      title: FALLBACK_INTERSECTION_EVENTS.prayerAndPraise.title,
      description: FALLBACK_INTERSECTION_EVENTS.prayerAndPraise.description,
      location: FALLBACK_INTERSECTION_EVENTS.prayerAndPraise.location,
      time: FALLBACK_INTERSECTION_EVENTS.prayerAndPraise.time,
      sort_order: 1,
    },
    {
      key: "weekOfWorship",
      title: FALLBACK_INTERSECTION_EVENTS.weekOfWorship.title,
      description: FALLBACK_INTERSECTION_EVENTS.weekOfWorship.description,
      location: FALLBACK_INTERSECTION_EVENTS.weekOfWorship.location,
      time: FALLBACK_INTERSECTION_EVENTS.weekOfWorship.time,
      sort_order: 2,
    },
    {
      key: "quarterlySermon",
      title: FALLBACK_INTERSECTION_EVENTS.quarterlySermon.title,
      description: FALLBACK_INTERSECTION_EVENTS.quarterlySermon.description,
      location: FALLBACK_INTERSECTION_EVENTS.quarterlySermon.location,
      time: FALLBACK_INTERSECTION_EVENTS.quarterlySermon.time,
      sort_order: 3,
    },
  ];

  return { events: fallbackEvents, dates: [] };
}

// Load study guides from Supabase, falling back to CSV
export async function getStudyGuides(): Promise<StudyGuide[]> {
  try {
    const res = await fetch("/api/content/study-guides", { cache: "no-store" });
    if (!res.ok) throw new Error("Study guides API failed");
    const json = await res.json();
    if ((json.guides?.length || 0) > 0) return json.guides;
  } catch (error) {
    console.error("Failed to load study guides from Supabase:", error);
  }

  // Fallback to CSV
  try {
    const res = await fetch("/data/study_guides.csv");
    const csv = await res.text();
    const lines = csv.trim().split("\n");
    const guides: StudyGuide[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",");
      guides.push({
        id: i.toString(),
        guide_date: values[0]?.trim() || "",
        series: values[1]?.trim() || "",
        topic: values[2]?.trim() || "",
        scripture: values[3]?.trim() || "",
        spotify_url: values[4]?.trim() || "",
        pdf_url: values[5]?.trim() || "",
        color: values[6]?.trim() || "",
      });
    }
    return guides;
  } catch (error) {
    console.error("Failed to load study guides CSV fallback:", error);
    return [];
  }
}
