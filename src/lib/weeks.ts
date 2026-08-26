function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function mondayOf(date: Date): string {
  // Create a new Date so we don't mutate the input
  const d = new Date(date);
  const dayOfWeek = d.getDay();

  // dayOfWeek: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // We need to find the Monday of this week.
  // If dayOfWeek is 0 (Sunday), we go back 6 days to get to Monday
  // Otherwise, we go back (dayOfWeek - 1) days
  const daysBack = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  // Move the date back by daysBack days
  d.setDate(d.getDate() - daysBack);

  return formatDate(d);
}

export function recentMondays(count: number, from: Date): string[] {
  const mondays: string[] = [];

  // Get the Monday of the given date's week
  let currentMonday = mondayOf(from);

  for (let i = 0; i < count; i++) {
    mondays.push(currentMonday);

    // Go back 7 days to get the previous Monday. Parse `currentMonday`
    // (YYYY-MM-DD) into year/month/day parts and construct the Date with
    // the local-time constructor, not `new Date(currentMonday)`. A bare
    // "YYYY-MM-DD" string is parsed as UTC midnight per the Date spec; in
    // any zone behind UTC, reading it back with local getters (as
    // formatDate does below) then reads the previous calendar day, so
    // consecutive Mondays drift by a day at a time instead of staying
    // exactly seven days apart. Staying in local time throughout, the same
    // way mondayOf does above, avoids that entirely.
    const [year, month, day] = currentMonday.split("-").map(Number);
    const currentDate = new Date(year, month - 1, day);
    currentDate.setDate(currentDate.getDate() - 7);
    currentMonday = formatDate(currentDate);
  }

  return mondays;
}
