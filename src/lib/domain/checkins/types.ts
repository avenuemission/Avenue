// One weekly check-in as the growth screens use it.
export interface CheckinEntry {
  weekStart: string; // YYYY-MM-DD, a Monday
  relational: number;
  physical: number;
  mental: number;
  spiritual: number;
  reflection: string | null;
  updatedAt: string;
}
