import axios from "axios";
import * as cheerio from "cheerio";
import { cached } from "@/lib/cache";

// ─────────────────────────────────────────────────────────────────────────────
// Betting lines & player props — free public feeds + web-scraping fallback.
//
// Primary source:  ESPN's public scoreboard JSON (no key) which exposes game
//                  spreads / totals inside `competitions[].odds`.
// Fallback:        deterministic generator so the UI always has odds even when
//                  the feed is rate-limited or offline.
// ─────────────────────────────────────────────────────────────────────────────

export interface GameLine {
  homeTeam: string;
  awayTeam: string;
  total: number;
  /** Spread from the home team perspective (negative = home favored). */
  homeSpread: number;
  homeImpliedTotal: number;
  awayImpliedTotal: number;
  kickoff?: string;
  provider: string;
}

export interface ScrapedPlayerProp {
  player: string;
  team: string;
  market: string;
  line: number | null;
  odds: number;
}

const ESPN_SCOREBOARD =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

interface EspnScoreboard {
  events?: Array<{
    date?: string;
    competitions?: Array<{
      competitors?: Array<{
        homeAway: "home" | "away";
        team?: { abbreviation?: string };
      }>;
      odds?: Array<{
        details?: string; // e.g. "KC -6.5"
        overUnder?: number;
        spread?: number;
        homeTeamOdds?: { favorite?: boolean };
      }>;
    }>;
  }>;
}

function impliedTotals(total: number, homeSpread: number) {
  // Home implied = total/2 - spread/2 (spread negative => home gets more).
  const home = total / 2 - homeSpread / 2;
  const away = total - home;
  return {
    homeImpliedTotal: Math.round(home * 100) / 100,
    awayImpliedTotal: Math.round(away * 100) / 100,
  };
}

/** Attempt to read real game lines from ESPN's public scoreboard feed. */
async function scrapeEspnScoreboard(week: number): Promise<GameLine[]> {
  const { data } = await axios.get<EspnScoreboard>(ESPN_SCOREBOARD, {
    timeout: 10_000,
    params: { week },
    headers: { Accept: "application/json" },
  });

  const lines: GameLine[] = [];
  for (const event of data.events ?? []) {
    const comp = event.competitions?.[0];
    if (!comp) continue;
    const home = comp.competitors?.find((c) => c.homeAway === "home");
    const away = comp.competitors?.find((c) => c.homeAway === "away");
    const odds = comp.odds?.[0];
    if (!home?.team?.abbreviation || !away?.team?.abbreviation) continue;

    const total = odds?.overUnder ?? 44.5;
    const homeSpread = odds?.spread ?? 0;
    const { homeImpliedTotal, awayImpliedTotal } = impliedTotals(
      total,
      homeSpread,
    );

    lines.push({
      homeTeam: home.team.abbreviation,
      awayTeam: away.team.abbreviation,
      total,
      homeSpread,
      homeImpliedTotal,
      awayImpliedTotal,
      kickoff: event.date,
      provider: "espn-scoreboard",
    });
  }

  if (!lines.length) throw new Error("No games in scoreboard feed");
  return lines;
}

/**
 * Generic HTML fallback parser. Sportsbook / FantasyPros matchup pages vary, so
 * this pulls any "TEAM ±x.x" style tokens out of the markup as a last resort.
 */
export async function scrapeHtmlLines(url: string): Promise<GameLine[]> {
  const { data: html } = await axios.get<string>(url, {
    timeout: 10_000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; RosterPulse/1.0; +local)",
      Accept: "text/html",
    },
  });
  const $ = cheerio.load(html);
  const lines: GameLine[] = [];

  $("[data-total], .game-total, .matchup-odds").each((_, el) => {
    const text = $(el).text();
    const totalMatch = text.match(/(\d{2}\.?5?)/);
    const spreadMatch = text.match(/([A-Z]{2,3})\s*(-?\d+\.?5?)/);
    if (!totalMatch || !spreadMatch) return;
    const total = parseFloat(totalMatch[1]);
    const homeSpread = parseFloat(spreadMatch[2]);
    const { homeImpliedTotal, awayImpliedTotal } = impliedTotals(
      total,
      homeSpread,
    );
    lines.push({
      homeTeam: spreadMatch[1],
      awayTeam: "OPP",
      total,
      homeSpread,
      homeImpliedTotal,
      awayImpliedTotal,
      provider: "html-fallback",
    });
  });

  return lines;
}

/** Deterministic fallback so the engine always has lines to score against. */
function generateFallbackLines(week: number): GameLine[] {
  const matchups: Array<[string, string]> = [
    ["KC", "BUF"],
    ["SF", "DAL"],
    ["MIA", "PHI"],
    ["DET", "GB"],
    ["BAL", "CIN"],
    ["MIN", "CHI"],
  ];
  return matchups.map(([homeTeam, awayTeam], i) => {
    const seed = (week * 7 + i * 13) % 11;
    const total = 42.5 + seed;
    const homeSpread = -1 * (seed - 5);
    const { homeImpliedTotal, awayImpliedTotal } = impliedTotals(
      total,
      homeSpread,
    );
    return {
      homeTeam,
      awayTeam,
      total,
      homeSpread,
      homeImpliedTotal,
      awayImpliedTotal,
      provider: "fallback",
    };
  });
}

/** Public entry point — cached per week, resilient to feed failures. */
export async function getGameLines(week: number): Promise<GameLine[]> {
  return cached(
    `odds_lines_week_${week}`,
    async () => {
      try {
        return await scrapeEspnScoreboard(week);
      } catch {
        return generateFallbackLines(week);
      }
    },
    30 * 60 * 1000, // 30 min TTL — odds move, but not every second.
  );
}

/**
 * Player props (Anytime TD, yardage over/unders). Public prop feeds are
 * unstable, so this returns a deterministic set derived from the game lines
 * that downstream scoring can consume. Swap in a live scrape when available.
 */
export async function getPlayerProps(
  week: number,
): Promise<ScrapedPlayerProp[]> {
  return cached(
    `odds_props_week_${week}`,
    async () => {
      const lines = await getGameLines(week);
      const props: ScrapedPlayerProp[] = [];
      for (const line of lines.slice(0, 6)) {
        const base = line.homeImpliedTotal;
        props.push({
          player: `${line.homeTeam} WR1`,
          team: line.homeTeam,
          market: "Receiving Yards",
          line: Math.round((base * 2.6 + 20) * 2) / 2,
          odds: -110,
        });
        props.push({
          player: `${line.homeTeam} RB1`,
          team: line.homeTeam,
          market: "Rushing Yards",
          line: Math.round((base * 2.1 + 10) * 2) / 2,
          odds: -115,
        });
      }
      return props;
    },
    30 * 60 * 1000,
  );
}
