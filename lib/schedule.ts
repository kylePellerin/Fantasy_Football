// ─────────────────────────────────────────────────────────────────────────────
// NFL week helpers.
//
// The regular season kicks off the Thursday after Labor Day. We anchor to the
// 2026 Week 1 kickoff and derive the active week from the current date so the
// user never has to pick a week manually.
// ─────────────────────────────────────────────────────────────────────────────

// 2026 NFL Week 1 kickoff (Thu, Sep 10 2026). Adjust yearly.
const SEASON_START: Record<number, string> = {
  2025: "2025-09-04",
  2026: "2026-09-10",
  2027: "2027-09-09",
};

const REGULAR_SEASON_WEEKS = 18;

export function getCurrentNflWeek(now: Date = new Date()): number {
  const year = now.getFullYear();
  const startStr = SEASON_START[year] ?? `${year}-09-10`;
  const start = new Date(`${startStr}T00:00:00`);

  // Before the season opens, surface Week 1 as the upcoming slate.
  if (now < start) return 1;

  const diffDays = Math.floor(
    (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );
  const week = Math.floor(diffDays / 7) + 1;
  return Math.min(Math.max(week, 1), REGULAR_SEASON_WEEKS);
}

export function getSeason(now: Date = new Date()): string {
  // The fantasy season is labelled by the calendar year it starts in.
  const year = now.getFullYear();
  // January/early Feb belongs to the previous season's playoffs.
  if (now.getMonth() === 0) return String(year - 1);
  return String(year);
}
