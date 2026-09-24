// This week's Pathways topic for the Monday digest (spec 3.2). Pure.
// study_guides.guide_on is a date, sent as YYYY-MM-DD. A row whose date
// cannot be read is skipped and reported, never guessed at.
import { addDaysISO } from "@/lib/domain/dates/melbourne";
import { parseGuideOn } from "@/lib/domain/studyGuides";

export interface GuideRow {
  id: string;
  guide_on: string | null;
  series: string | null;
  topic: string | null;
  scripture: string | null;
  pdf_url: string | null;
}

export interface WeekTopic {
  guide: GuideRow;
  date: string;
  thisWeek: boolean;
}

// The guide dated within Monday to Sunday of this week (the earliest if
// several), else the most recent past one, else null.
export function topicForWeek(guides: GuideRow[], mondayISO: string): { topic: WeekTopic | null; unparseable: string[] } {
  const sunday = addDaysISO(mondayISO, 6);
  const dated: { guide: GuideRow; date: string }[] = [];
  const unparseable: string[] = [];
  for (const guide of guides) {
    const date = parseGuideOn(guide.guide_on);
    if (date) dated.push({ guide, date });
    else unparseable.push(`${guide.id} (${JSON.stringify(guide.guide_on)})`);
  }
  const inWeek = dated.filter((d) => d.date >= mondayISO && d.date <= sunday).sort((a, b) => a.date.localeCompare(b.date));
  if (inWeek.length > 0) return { topic: { ...inWeek[0], thisWeek: true }, unparseable };
  const past = dated.filter((d) => d.date < mondayISO).sort((a, b) => b.date.localeCompare(a.date));
  return { topic: past.length > 0 ? { ...past[0], thisWeek: false } : null, unparseable };
}
