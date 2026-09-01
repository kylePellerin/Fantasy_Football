import axios from "axios";
import { cached } from "@/lib/cache";
import type { EspnCredentials, LeagueRef } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// ESPN Fantasy API wrapper.
//
// Public leagues:  no auth required.
// Private leagues: requires the user's `espn_s2` and `SWID` cookies, which are
//                  passed straight through as a Cookie header (never stored
//                  server-side beyond the request unless the caller caches).
// ─────────────────────────────────────────────────────────────────────────────

const READS_BASE = "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

export interface EspnTeam {
  id: number;
  name?: string;
  abbrev?: string;
  location?: string;
  nickname?: string;
  primaryOwner?: string;
  owners?: string[];
  roster?: { entries: EspnRosterEntry[] };
  record?: { overall?: { wins: number; losses: number; ties: number } };
}

export interface EspnRosterEntry {
  lineupSlotId: number;
  playerPoolEntry: {
    player: {
      id: number;
      fullName: string;
      defaultPositionId: number;
      proTeamId: number;
      injuryStatus?: string;
      stats?: Array<{
        scoringPeriodId: number;
        statSourceId: number;
        appliedTotal?: number;
      }>;
    };
  };
}

export interface EspnScheduleItem {
  matchupPeriodId: number;
  home?: { teamId: number; totalProjectedPointsLive?: number; totalPoints?: number };
  away?: { teamId: number; totalProjectedPointsLive?: number; totalPoints?: number };
}

export interface EspnLeagueResponse {
  id: number;
  seasonId: number;
  settings?: { name: string };
  status?: { currentMatchupPeriod: number };
  teams?: EspnTeam[];
  schedule?: EspnScheduleItem[];
}

function buildCookieHeader(creds: EspnCredentials): Record<string, string> {
  if (creds.espnS2 && creds.swid) {
    const swid = creds.swid.startsWith("{") ? creds.swid : `{${creds.swid}}`;
    return { Cookie: `espn_s2=${creds.espnS2}; SWID=${swid}` };
  }
  return {};
}

/**
 * Fetch a league with the given views. Private leagues require valid cookies;
 * a 401 is surfaced as a friendly error prompting the user for credentials.
 */
export async function fetchEspnLeague(
  creds: EspnCredentials,
  views: string[] = ["mTeam", "mRoster", "mMatchup", "mSettings"],
): Promise<EspnLeagueResponse> {
  const url = `${READS_BASE}/seasons/${creds.season}/segments/0/leagues/${creds.leagueId}`;
  try {
    const { data } = await axios.get<EspnLeagueResponse>(url, {
      timeout: 12_000,
      headers: {
        Accept: "application/json",
        "User-Agent": BROWSER_UA,
        ...buildCookieHeader(creds),
      },
      params: { view: views },
      // ESPN uses repeated `view` params; axios serializes arrays that way.
      paramsSerializer: {
        indexes: null,
      },
    });
    return data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      throw new Error(
        "ESPN league is private — provide valid espn_s2 and SWID cookies.",
      );
    }
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      throw new Error(`ESPN league ${creds.leagueId} not found for ${creds.season}.`);
    }
    throw err;
  }
}

export function espnLeagueRef(res: EspnLeagueResponse): LeagueRef {
  return {
    id: `espn-${res.id}`,
    name: res.settings?.name ?? `ESPN League ${res.id}`,
    platform: "espn",
    season: String(res.seasonId),
  };
}

// ESPN slot / position id maps (subset used for lineup display).
export const ESPN_POSITION: Record<number, string> = {
  1: "QB",
  2: "RB",
  3: "WR",
  4: "TE",
  5: "K",
  16: "DEF",
};

export const ESPN_LINEUP_SLOT: Record<number, string> = {
  0: "QB",
  2: "RB",
  4: "WR",
  6: "TE",
  16: "DEF",
  17: "K",
  20: "BN",
  21: "IR",
  23: "FLEX",
};

// ESPN proTeamId → NFL abbreviation (0 = free agent / no team).
export const ESPN_PRO_TEAM: Record<number, string> = {
  1: "ATL", 2: "BUF", 3: "CHI", 4: "CIN", 5: "CLE", 6: "DAL", 7: "DEN",
  8: "DET", 9: "GB", 10: "TEN", 11: "IND", 12: "KC", 13: "LV", 14: "LAR",
  15: "MIA", 16: "MIN", 17: "NE", 18: "NO", 19: "NYG", 20: "NYJ", 21: "PHI",
  22: "ARI", 23: "PIT", 24: "LAC", 25: "SF", 26: "SEA", 27: "TB", 28: "WAS",
  29: "CAR", 30: "JAX", 33: "BAL", 34: "HOU",
};

export function espnHeadshot(playerId: number): string {
  return `https://a.espncdn.com/i/headshots/nfl/players/full/${playerId}.png`;
}

export function espnTeamLogo(abbrev: string): string {
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${abbrev.toLowerCase()}.png`;
}

export interface EspnPlayerLite {
  id: number;
  name: string;
  team: string;
  position: string;
}

interface EspnRawPlayer {
  id?: number;
  fullName?: string;
  defaultPositionId?: number;
  proTeamId?: number;
  player?: EspnRawPlayer;
}

function normalizePlayerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.'`]/g, "")
    .replace(/\s+(jr|sr|ii|iii|iv|v)$/i, "")
    .trim();
}

/**
 * The full active NFL player universe as a normalized-name → player map, used to
 * resolve official ESPN headshots. ESPN ignores ranking/stat filters on the
 * public players endpoint, so this is used only for identity + faces, never for
 * projections. ~2.3MB; cached 24h.
 */
export async function getEspnPlayerIndex(
  season: string,
): Promise<Record<string, EspnPlayerLite>> {
  return cached(
    `espn_player_index_${season}`,
    async () => {
      const url = `${READS_BASE}/seasons/${season}/players?view=players_wl`;
      const { data } = await axios.get<unknown>(url, {
        timeout: 20_000,
        headers: {
          Accept: "application/json",
          "User-Agent": BROWSER_UA,
          "x-fantasy-filter": JSON.stringify({
            players: { limit: 20000, filterActive: { value: true } },
          }),
        },
      });
      const arr = (
        Array.isArray(data)
          ? data
          : ((data as { players?: EspnRawPlayer[] })?.players ?? [])
      ) as EspnRawPlayer[];
      const out: Record<string, EspnPlayerLite> = {};
      for (const raw of arr) {
        const pl = raw.player ?? raw;
        if (!pl.fullName || !pl.id) continue;
        const key = normalizePlayerName(pl.fullName);
        if (key in out) continue;
        out[key] = {
          id: pl.id,
          name: pl.fullName,
          team: ESPN_PRO_TEAM[pl.proTeamId ?? 0] ?? "",
          position: ESPN_POSITION[pl.defaultPositionId ?? 0] ?? "",
        };
      }
      return out;
    },
    24 * 60 * 60 * 1000,
  );
}

/** Normalize a SWID to the brace-wrapped form ESPN expects. */
export function normalizeSwid(swid?: string): string {
  if (!swid) return "";
  const s = swid.trim();
  return s.startsWith("{") ? s : `{${s}}`;
}

/**
 * Discover every ESPN fantasy-football league for a user straight from their
 * SWID cookie — no league IDs required. Uses the public ESPN "fan" API and
 * parses defensively since the response shape is undocumented.
 */
export async function listEspnLeagues(
  creds: EspnCredentials,
): Promise<LeagueRef[]> {
  const swid = normalizeSwid(creds.swid);
  if (!swid) {
    throw new Error("An ESPN SWID cookie is required to find your leagues.");
  }
  const url = `https://fan.api.espn.com/apis/v2/fans/${encodeURIComponent(swid)}`;
  let data: unknown;
  try {
    ({ data } = await axios.get(url, {
      timeout: 12_000,
      headers: { Accept: "application/json", "User-Agent": BROWSER_UA, ...buildCookieHeader(creds) },
      params: {
        configuration: "SITE_DEFAULT",
        context: "fantasy",
        displayEvents: true,
        displayNow: true,
        displayPreferences: true,
        recentLimit: 25,
      },
    }));
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      throw new Error("ESPN rejected those cookies — double-check espn_s2 and SWID.");
    }
    throw new Error("Couldn't reach ESPN to list your leagues.");
  }

  const prefs = (data as { preferences?: unknown[] })?.preferences;
  const out: LeagueRef[] = [];
  const seen = new Set<string>();
  if (!Array.isArray(prefs)) return out;

  for (const pref of prefs) {
    const entry = (pref as { metaData?: { entry?: Record<string, unknown> } })
      ?.metaData?.entry;
    if (!entry) continue;
    const abbrev = String(entry.abbrev ?? entry.gameAbbrev ?? "").toUpperCase();
    const gameId = entry.gameId;
    const isFootball =
      abbrev === "FFL" ||
      gameId === 1 ||
      /football/i.test(String(entry.name ?? ""));
    if (!isFootball) continue;
    const season = String(entry.seasonId ?? creds.season ?? "");
    const groups = Array.isArray(entry.groups) ? entry.groups : [];
    for (const g of groups as Array<Record<string, unknown>>) {
      const lid = String(g.groupId ?? "");
      if (!lid || seen.has(lid)) continue;
      seen.add(lid);
      out.push({
        id: `espn-${lid}`,
        name: String(g.groupName ?? entry.name ?? `ESPN League ${lid}`),
        platform: "espn",
        season,
      });
    }
  }
  return out;
}
