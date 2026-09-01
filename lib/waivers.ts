import type { NflPosition, WaiverAdd } from "@/types";
import {
  getSleeperPlayers,
  getSleeperRosters,
  getTrendingAdds,
  sleeperHeadshot,
  sleeperTeamLogo,
  type SleeperPlayer,
} from "@/lib/sleeper";
import { clamp } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Waiver-wire recommendations.
//
// Uses Sleeper's public "trending adds" feed (leagues adding a player in the
// last N hours) and weights it toward long-term upside — younger players and
// ascending roles score higher than veteran streamers.
// ─────────────────────────────────────────────────────────────────────────────

function normalizePos(sp?: SleeperPlayer): NflPosition {
  const p = (sp?.position ?? sp?.fantasy_positions?.[0] ?? "FLEX").toUpperCase();
  if (["QB", "RB", "WR", "TE", "K", "DEF"].includes(p)) return p as NflPosition;
  return "FLEX";
}

function upsideScore(sp: SleeperPlayer, addCount: number, maxAdds: number): number {
  const addNorm = clamp((addCount / (maxAdds || 1)) * 100, 0, 100);
  const age = sp.age ?? 26;
  const exp = sp.years_exp ?? 4;
  // Youth curve: 21yo ~100, 30yo ~10.
  const youth = clamp(100 - (age - 21) * 10, 0, 100);
  const green = clamp(100 - exp * 18, 0, 100);
  return Math.round(addNorm * 0.45 + youth * 0.35 + green * 0.2);
}

function tagFor(sp: SleeperPlayer): string {
  const exp = sp.years_exp ?? 4;
  const age = sp.age ?? 26;
  if (exp === 0) return "Rookie breakout";
  if (age <= 23) return "Ascending role";
  if (exp <= 2) return "Long-term upside";
  return "Trending add";
}

/** Build waiver recommendations, optionally filtering out rostered players. */
export async function getWaiverRecommendations(opts: {
  username?: string;
  leagueId?: string;
  limit?: number;
}): Promise<WaiverAdd[]> {
  const { leagueId, limit = 6 } = opts;

  const [trending, players] = await Promise.all([
    getTrendingAdds(48, 40),
    getSleeperPlayers(),
  ]);

  // Exclude every player already rostered anywhere in the league so only true
  // free agents surface.
  const rostered = new Set<string>();
  if (leagueId) {
    try {
      const cleanLeague = leagueId.replace(/^sleeper-/, "");
      const rosters = await getSleeperRosters(cleanLeague);
      for (const r of rosters) {
        for (const pid of r.players ?? []) rostered.add(pid);
      }
    } catch {
      // ignore — still return general trending adds
    }
  }

  const maxAdds = trending[0]?.count ?? 1;

  const results: WaiverAdd[] = [];
  for (const t of trending) {
    if (rostered.has(t.player_id)) continue;
    const sp = players[t.player_id];
    if (!sp) continue;
    const position = normalizePos(sp);
    if (!["QB", "RB", "WR", "TE"].includes(position)) continue;

    const name =
      sp.full_name ?? `${sp.first_name ?? ""} ${sp.last_name ?? ""}`.trim();
    if (!name) continue;
    const team = (sp.team ?? "FA").toUpperCase();

    results.push({
      id: t.player_id,
      name,
      position,
      team,
      avatarUrl:
        position === "DEF"
          ? sleeperTeamLogo(team)
          : sleeperHeadshot(t.player_id),
      addCount: t.count,
      upside: upsideScore(sp, t.count, maxAdds),
      tag: tagFor(sp),
    });
  }

  // Prioritize long-term upside, then raw demand.
  results.sort((a, b) => b.upside - a.upside || b.addCount - a.addCount);
  return results.slice(0, limit);
}
