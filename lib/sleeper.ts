import axios from "axios";
import { cached } from "@/lib/cache";
import type { LeagueRef } from "@/types";
import {
  sleeperAvatar,
  sleeperHeadshot,
  sleeperTeamLogo,
} from "@/lib/sleeper-assets";

// Re-export client-safe asset helpers so existing server imports keep working.
export { sleeperAvatar, sleeperHeadshot, sleeperTeamLogo };

// ─────────────────────────────────────────────────────────────────────────────
// Sleeper API wrapper — 100% free, no API key, public read-only REST.
// Docs: https://docs.sleeper.com
// ─────────────────────────────────────────────────────────────────────────────

const BASE = "https://api.sleeper.app/v1";

const http = axios.create({
  baseURL: BASE,
  timeout: 12_000,
  headers: { Accept: "application/json" },
});

export interface SleeperUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string | null;
}

export interface SleeperLeague {
  league_id: string;
  name: string;
  season: string;
  status: string;
  sport: string;
  avatar: string | null;
  total_rosters: number;
  settings: Record<string, unknown>;
  scoring_settings: Record<string, number>;
  roster_positions: string[];
}

export interface SleeperRoster {
  roster_id: number;
  owner_id: string;
  league_id: string;
  players: string[] | null;
  starters: string[] | null;
  reserve: string[] | null;
  settings: { wins: number; losses: number; ties: number; fpts?: number };
}

export interface SleeperMatchup {
  roster_id: number;
  matchup_id: number;
  points: number;
  starters: string[];
  players: string[];
  players_points: Record<string, number>;
  starters_points: number[];
}

export interface SleeperPlayer {
  player_id: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  team?: string | null;
  fantasy_positions?: string[];
  injury_status?: string | null;
  age?: number;
  years_exp?: number;
  search_rank?: number;
}

/** Resolve a username to a Sleeper user object. */
export async function getSleeperUser(username: string): Promise<SleeperUser> {
  const { data } = await http.get<SleeperUser>(
    `/user/${encodeURIComponent(username)}`,
  );
  if (!data || !data.user_id) {
    throw new Error(`Sleeper user "${username}" not found`);
  }
  return data;
}

/** List a user's NFL leagues for a given season. */
export async function getSleeperLeagues(
  userId: string,
  season: string,
): Promise<SleeperLeague[]> {
  const { data } = await http.get<SleeperLeague[]>(
    `/user/${userId}/leagues/nfl/${season}`,
  );
  return data ?? [];
}

export async function getSleeperRosters(
  leagueId: string,
): Promise<SleeperRoster[]> {
  const { data } = await http.get<SleeperRoster[]>(`/league/${leagueId}/rosters`);
  return data ?? [];
}

export async function getSleeperLeague(
  leagueId: string,
): Promise<SleeperLeague> {
  const { data } = await http.get<SleeperLeague>(`/league/${leagueId}`);
  return data;
}

export async function getSleeperMatchups(
  leagueId: string,
  week: number,
): Promise<SleeperMatchup[]> {
  const { data } = await http.get<SleeperMatchup[]>(
    `/league/${leagueId}/matchups/${week}`,
  );
  return data ?? [];
}

/**
 * The full player dictionary is ~5MB — fetch at most once per day and cache it
 * to disk so lookups are instant and we never hammer the endpoint.
 */
export async function getSleeperPlayers(): Promise<
  Record<string, SleeperPlayer>
> {
  return cached(
    "sleeper_players_nfl",
    async () => {
      const { data } = await http.get<Record<string, SleeperPlayer>>(
        "/players/nfl",
      );
      return data;
    },
    24 * 60 * 60 * 1000, // 24h TTL
  );
}

/** Trending waiver-wire adds across all Sleeper leagues (free public feed). */
export async function getTrendingAdds(
  lookbackHours = 24,
  limit = 25,
): Promise<Array<{ player_id: string; count: number }>> {
  const { data } = await http.get<Array<{ player_id: string; count: number }>>(
    `/players/nfl/trending/add`,
    { params: { lookback_hours: lookbackHours, limit } },
  );
  return data ?? [];
}

/** Weekly PPR projections keyed by Sleeper player_id (undocumented endpoint). */
export async function getSleeperProjections(
  season: string,
  week: number,
): Promise<Record<string, number>> {
  return cached(
    `sleeper_proj_${season}_${week}`,
    async () => {
      const { data } = await axios.get<
        Array<{ player_id: string; stats?: { pts_ppr?: number } }>
      >(`https://api.sleeper.com/projections/nfl/${season}/${week}`, {
        params: { season_type: "regular", order_by: "ppr" },
        timeout: 15_000,
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (RosterPulse)",
        },
      });
      const map: Record<string, number> = {};
      for (const row of Array.isArray(data) ? data : []) {
        const ppr = row.stats?.pts_ppr;
        if (row.player_id && typeof ppr === "number") {
          map[row.player_id] = Math.round(ppr * 10) / 10;
        }
      }
      return map;
    },
    3 * 60 * 60 * 1000,
  );
}

/** Convenience: list leagues as normalized LeagueRefs (cached briefly). */
export async function listSleeperLeagueRefs(
  username: string,
  season: string,
): Promise<{ user: SleeperUser; leagues: LeagueRef[] }> {
  return cached(
    `sleeper_leagues_${username}_${season}`,
    async () => {
      const user = await getSleeperUser(username);
      const leagues = await getSleeperLeagues(user.user_id, season);
      return {
        user,
        leagues: leagues.map<LeagueRef>((l) => ({
          id: `sleeper-${l.league_id}`,
          name: l.name,
          platform: "sleeper",
          season: l.season,
          avatarUrl: sleeperAvatar(l.avatar),
        })),
      };
    },
    30 * 60 * 1000, // 30 min TTL
  );
}
