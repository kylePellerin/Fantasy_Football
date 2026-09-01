import type {
  ExpertContext,
  GameOdds,
  Matchup,
  NewsNote,
  NflPosition,
  Player,
  Roster,
} from "@/types";
import {
  getSleeperLeague,
  getSleeperMatchups,
  getSleeperPlayers,
  getSleeperProjections,
  getSleeperRosters,
  getSleeperUser,
  sleeperHeadshot,
  sleeperTeamLogo,
  type SleeperPlayer,
} from "@/lib/sleeper";
import { getSeason } from "@/lib/schedule";
import { getGameLines, type GameLine } from "@/lib/scrapers/odds";
import { getEcr, getNews } from "@/lib/scrapers/experts";
import { computeStartConfidence } from "@/lib/optimizer";
import { lineupOrderFor } from "@/lib/lineup";
import type { EspnCredentials } from "@/types";
import {
  ESPN_LINEUP_SLOT,
  ESPN_POSITION,
  ESPN_PRO_TEAM,
  espnHeadshot,
  espnTeamLogo,
  fetchEspnLeague,
  normalizeSwid,
  type EspnTeam,
} from "@/lib/espn";

// ─────────────────────────────────────────────────────────────────────────────
// Live roster assembler.
//
// Joins a real Sleeper roster with scraped betting lines, FantasyPros ECR, and
// ESPN news to produce fully-scored Player objects. Projections come straight
// from the betting market (implied fantasy points) since Sleeper's free API
// exposes no projections.
// ─────────────────────────────────────────────────────────────────────────────

const TEAM_ALIAS: Record<string, string> = {
  WSH: "WAS",
  JAC: "JAX",
  LA: "LAR",
  OAK: "LV",
  SD: "LAC",
  STL: "LAR",
  ARZ: "ARI",
};

function normTeam(t?: string | null): string {
  const u = (t ?? "").toUpperCase();
  return TEAM_ALIAS[u] ?? u;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.'`]/g, "")
    .replace(/\s+(jr|sr|ii|iii|iv|v)$/i, "")
    .trim();
}

function normalizePos(sp?: SleeperPlayer): NflPosition {
  const p = (sp?.position ?? sp?.fantasy_positions?.[0] ?? "FLEX").toUpperCase();
  if (["QB", "RB", "WR", "TE", "K", "DEF"].includes(p)) return p as NflPosition;
  return "FLEX";
}

function mapInjury(status?: string | null): Player["status"] {
  switch ((status ?? "").toLowerCase()) {
    case "questionable":
      return "questionable";
    case "doubtful":
      return "doubtful";
    case "out":
      return "out";
    case "ir":
    case "injured reserve":
      return "ir";
    default:
      return "active";
  }
}

interface LineEntry {
  line: GameLine;
  isHome: boolean;
  opponent: string;
}

function indexLines(lines: GameLine[]): Map<string, LineEntry> {
  const map = new Map<string, LineEntry>();
  for (const line of lines) {
    map.set(normTeam(line.homeTeam), {
      line,
      isHome: true,
      opponent: normTeam(line.awayTeam),
    });
    map.set(normTeam(line.awayTeam), {
      line,
      isHome: false,
      opponent: normTeam(line.homeTeam),
    });
  }
  return map;
}

function buildOdds(team: string, entry?: LineEntry): GameOdds {
  if (!entry) {
    // Bye week or unmatched team — neutral defaults.
    return {
      homeTeam: team,
      awayTeam: "BYE",
      total: 44,
      spread: 0,
      impliedTeamTotal: 21,
      isHome: true,
      weather: "clear",
    };
  }
  const { line, isHome } = entry;
  return {
    homeTeam: line.homeTeam,
    awayTeam: line.awayTeam,
    total: line.total,
    spread: isHome ? line.homeSpread : -line.homeSpread,
    impliedTeamTotal: isHome ? line.homeImpliedTotal : line.awayImpliedTotal,
    kickoff: line.kickoff,
    isHome,
    weather: "clear",
  };
}

/** Coarse matchup grade from the team's implied total (1 elite .. 5 avoid). */
function gradeFromImplied(implied: number): 1 | 2 | 3 | 4 | 5 {
  if (implied >= 26) return 1;
  if (implied >= 23) return 2;
  if (implied >= 20) return 3;
  if (implied >= 17) return 4;
  return 5;
}

interface AssembleCtx {
  players: Record<string, SleeperPlayer>;
  /** Real weekly PPR projections keyed by player id (Sleeper). */
  projByPid: Record<string, number>;
  lineByTeam: Map<string, LineEntry>;
  ecrByPos: Record<string, Map<string, { ecr: number; positionRank: string; stdDev: number }>>;
  news: NewsNote[];
}

function buildExpert(
  name: string,
  position: NflPosition,
  team: string,
  opponent: string,
  odds: GameOdds,
  ctx: AssembleCtx,
): ExpertContext {
  const ecrEntry = ctx.ecrByPos[position]?.get(normalizeName(name));
  const ecr = Number(ecrEntry?.ecr ?? 45) || 45;
  const positionRank = ecrEntry?.positionRank ?? `${position}—`;
  const ecrStdDev = Number(ecrEntry?.stdDev ?? 3.2) || 3.2;
  const matchupGrade = gradeFromImplied(odds.impliedTeamTotal);

  const lastName = name.split(" ").slice(-1)[0].toLowerCase();
  const news = ctx.news
    .filter((n) => `${n.headline} ${n.body}`.toLowerCase().includes(lastName))
    .slice(0, 3);

  const spreadText =
    odds.spread === 0
      ? "a pick'em"
      : odds.spread < 0
        ? `${Math.abs(odds.spread)}-pt favorites`
        : `${odds.spread}-pt underdogs`;

  const narrative = `${team} are ${spreadText} vs ${opponent} with a ${odds.impliedTeamTotal.toFixed(
    1,
  )}-pt implied team total (game O/U ${odds.total}). ${
    matchupGrade <= 2
      ? "Strong betting environment for fantasy production."
      : matchupGrade >= 4
        ? "Muted scoring environment — touchdown-dependent."
        : "Neutral spot; volume will decide the outcome."
  }`;

  return {
    ecr,
    positionRank,
    ecrStdDev,
    matchupTier: `${odds.isHome ? "vs" : "@"} ${opponent} · implied ${odds.impliedTeamTotal.toFixed(1)} pts`,
    matchupGrade,
    narrative,
    news,
  };
}

function assemblePlayer(
  pid: string,
  slot: "starter" | "bench",
  lineupSlot: string,
  ctx: AssembleCtx,
): Player | null {
  const sp = ctx.players[pid];
  if (!sp) return null;

  const position = normalizePos(sp);
  const team = normTeam(sp.team ?? (position === "DEF" ? pid : ""));
  const entry = ctx.lineByTeam.get(team);
  const opponent = entry?.opponent ?? "BYE";
  const odds = buildOdds(team, entry);
  const name =
    sp.full_name ??
    (position === "DEF"
      ? `${team} DST`
      : `${sp.first_name ?? ""} ${sp.last_name ?? ""}`.trim() || pid);
  const expert = buildExpert(name, position, team, opponent, odds, ctx);
  // Real platform projection only — never fabricate from team betting lines.
  const projectedPoints = ctx.projByPid[pid] ?? 0;
  // Betting context applies only to players actually projected to play.
  const hasBettingLines = entry !== undefined && projectedPoints > 0;

  const raw = {
    id: pid,
    name,
    position,
    team,
    opponent,
    slot,
    lineupSlot,
    projectedPoints,
    averagePoints: projectedPoints,
    status: mapInjury(sp.injury_status),
    odds,
    props: [],
    expert,
    impliedFantasyPoints: 0,
    hasBettingLines,
  };

  return {
    ...raw,
    avatarUrl:
      position === "DEF" ? sleeperTeamLogo(team) : sleeperHeadshot(pid),
    lineupOrder: lineupOrderFor(lineupSlot, position),
    confidence: computeStartConfidence(raw),
  };
}

/** Opponent starter projection (real platform projection only). */
function quickProjection(pid: string, ctx: AssembleCtx): number {
  return ctx.projByPid[pid] ?? 0;
}

export async function assembleSleeperRoster(
  username: string,
  rawLeagueId: string,
  week: number,
): Promise<Roster> {
  const leagueId = rawLeagueId.replace(/^sleeper-/, "");

  const [user, league, rosters, matchups, players, news] = await Promise.all([
    getSleeperUser(username),
    getSleeperLeague(leagueId),
    getSleeperRosters(leagueId),
    getSleeperMatchups(leagueId, week),
    getSleeperPlayers(),
    getNews(),
  ]);

  const myRoster = rosters.find((r) => r.owner_id === user.user_id);
  if (!myRoster) {
    throw new Error(`${username} does not own a roster in this league.`);
  }

  const [qb, rb, wr, te, lines, projections] = await Promise.all([
    getEcr("QB"),
    getEcr("RB"),
    getEcr("WR"),
    getEcr("TE"),
    getGameLines(week),
    getSleeperProjections(getSeason(), week),
  ]);

  const toMap = (list: typeof qb) => {
    const m = new Map<string, { ecr: number; positionRank: string; stdDev: number }>();
    for (const e of list)
      m.set(normalizeName(e.player), {
        ecr: e.ecr,
        positionRank: e.positionRank,
        stdDev: e.stdDev,
      });
    return m;
  };

  const ctx: AssembleCtx = {
    players,
    projByPid: projections,
    lineByTeam: indexLines(lines),
    ecrByPos: { QB: toMap(qb), RB: toMap(rb), WR: toMap(wr), TE: toMap(te) },
    news,
  };

  // Slot labels from league roster_positions (starters excludes bench/IR).
  const startingSlots = (league.roster_positions ?? []).filter(
    (s) => !["BN", "IR", "TAXI"].includes(s),
  );
  const starterIds = myRoster.starters?.filter((id) => id && id !== "0") ?? [];
  const allIds = myRoster.players ?? [];
  const benchIds = allIds.filter((id) => !starterIds.includes(id));

  const starters = starterIds
    .map((pid, i) => assemblePlayer(pid, "starter", startingSlots[i] ?? "FLEX", ctx))
    .filter((p): p is Player => p !== null);
  const bench = benchIds
    .map((pid) => assemblePlayer(pid, "bench", "BN", ctx))
    .filter((p): p is Player => p !== null);

  const allPlayers = [...starters, ...bench];

  // Matchup projections.
  const myMatchup = matchups.find((m) => m.roster_id === myRoster.roster_id);
  const oppMatchup = myMatchup
    ? matchups.find(
        (m) =>
          m.matchup_id === myMatchup.matchup_id &&
          m.roster_id !== myRoster.roster_id,
      )
    : undefined;
  const oppRoster = oppMatchup
    ? rosters.find((r) => r.roster_id === oppMatchup.roster_id)
    : undefined;

  const myProjected =
    Math.round(starters.reduce((s, p) => s + p.projectedPoints, 0) * 10) / 10;
  const oppProjected = oppMatchup
    ? Math.round(
        oppMatchup.starters.reduce((s, pid) => s + quickProjection(pid, ctx), 0) *
          10,
      ) / 10
    : Math.round(myProjected * 0.96 * 10) / 10;

  const total = myProjected + oppProjected || 1;
  const myWinProb = Math.round((myProjected / total) * 100);

  const managerName = user.display_name || user.username;
  const record = `${myRoster.settings?.wins ?? 0}-${myRoster.settings?.losses ?? 0}`;
  const oppOwner = oppRoster
    ? rosters.find((r) => r.roster_id === oppRoster.roster_id)
    : undefined;

  const matchup: Matchup = {
    week,
    home: {
      manager: { id: user.user_id, displayName: managerName, record },
      projectedTotal: myProjected,
      winProbability: myWinProb,
      starters: starters.map((p) => p.id),
    },
    away: {
      manager: {
        id: String(oppRoster?.owner_id ?? "opp"),
        displayName: "Opponent",
        record: oppOwner
          ? `${oppOwner.settings?.wins ?? 0}-${oppOwner.settings?.losses ?? 0}`
          : undefined,
      },
      projectedTotal: oppProjected,
      winProbability: 100 - myWinProb,
      starters: oppMatchup?.starters ?? [],
    },
  };

  return {
    leagueId: rawLeagueId,
    leagueName: league.name,
    platform: "sleeper",
    week,
    manager: { id: user.user_id, displayName: managerName, record },
    players: allPlayers,
    matchup,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ESPN roster assembler — reuses the same betting/ECR/news scoring engine.
// ─────────────────────────────────────────────────────────────────────────────

interface NormPlayer {
  id: string;
  name: string;
  position: NflPosition;
  team: string;
  slot: "starter" | "bench";
  lineupSlot: string;
  status: Player["status"];
  /** Real platform projection (ESPN weekly projected total), if available. */
  projection: number | null;
  avatarUrl?: string;
}

/** Score a platform-agnostic player through the shared confidence engine. */
function scoreNormPlayer(n: NormPlayer, ctx: AssembleCtx): Player {
  const entry = ctx.lineByTeam.get(n.team);
  const opponent = entry?.opponent ?? "BYE";
  const odds = buildOdds(n.team, entry);
  const expert = buildExpert(n.name, n.position, n.team, opponent, odds, ctx);
  const projectedPoints = n.projection ?? 0;
  const hasBettingLines = entry !== undefined && projectedPoints > 0;
  const raw = {
    id: n.id,
    name: n.name,
    position: n.position,
    team: n.team,
    opponent,
    slot: n.slot,
    lineupSlot: n.lineupSlot,
    projectedPoints,
    averagePoints: projectedPoints,
    status: n.status,
    odds,
    props: [],
    expert,
    impliedFantasyPoints: 0,
    hasBettingLines,
  };
  return {
    ...raw,
    avatarUrl: n.avatarUrl,
    lineupOrder: lineupOrderFor(n.lineupSlot, n.position),
    confidence: computeStartConfidence(raw),
  };
}

function espnRosterToNorm(team: EspnTeam, week: number): NormPlayer[] {
  return (team.roster?.entries ?? []).map((e) => {
    const p = e.playerPoolEntry.player;
    const position = (ESPN_POSITION[p.defaultPositionId] ?? "FLEX") as NflPosition;
    const proTeam = normTeam(ESPN_PRO_TEAM[p.proTeamId] ?? "");
    const isBench = e.lineupSlotId === 20 || e.lineupSlotId === 21;
    const projStat = (p.stats ?? []).find(
      (s) => s.scoringPeriodId === week && s.statSourceId === 1,
    );
    const projection =
      typeof projStat?.appliedTotal === "number"
        ? Math.round(projStat.appliedTotal * 10) / 10
        : null;
    return {
      id: `espn-${p.id}`,
      name: p.fullName,
      position,
      team: proTeam,
      slot: isBench ? "bench" : "starter",
      lineupSlot: isBench ? "BN" : ESPN_LINEUP_SLOT[e.lineupSlotId] ?? "FLEX",
      status: mapInjury(p.injuryStatus),
      projection,
      avatarUrl:
        position === "DEF" ? espnTeamLogo(proTeam || "nfl") : espnHeadshot(p.id),
    };
  });
}

function espnStarterProjection(team: EspnTeam, week: number): number {
  return espnRosterToNorm(team, week)
    .filter((n) => n.slot === "starter")
    .reduce((s, n) => s + (n.projection ?? 0), 0);
}

export async function assembleEspnRoster(
  creds: EspnCredentials,
  week: number,
): Promise<Roster> {
  const leagueId = creds.leagueId.replace(/^espn-/, "");
  const league = await fetchEspnLeague({ ...creds, leagueId }, [
    "mTeam",
    "mRoster",
    "mMatchup",
    "mSettings",
  ]);
  const teams = league.teams ?? [];
  const swid = normalizeSwid(creds.swid);
  const myTeam =
    teams.find((t) => (t.owners ?? []).includes(swid)) ??
    teams.find((t) => t.primaryOwner === swid);
  if (!myTeam) {
    throw new Error(
      "Couldn't find your team in this ESPN league — the SWID cookie may be wrong or you're not a member.",
    );
  }

  const [qb, rb, wr, te, lines, news] = await Promise.all([
    getEcr("QB"),
    getEcr("RB"),
    getEcr("WR"),
    getEcr("TE"),
    getGameLines(week),
    getNews(),
  ]);
  const toMap = (list: typeof qb) => {
    const m = new Map<string, { ecr: number; positionRank: string; stdDev: number }>();
    for (const e of list)
      m.set(normalizeName(e.player), {
        ecr: e.ecr,
        positionRank: e.positionRank,
        stdDev: e.stdDev,
      });
    return m;
  };
  const ctx: AssembleCtx = {
    players: {},
    projByPid: {},
    lineByTeam: indexLines(lines),
    ecrByPos: { QB: toMap(qb), RB: toMap(rb), WR: toMap(wr), TE: toMap(te) },
    news,
  };

  const players = espnRosterToNorm(myTeam, week).map((n) =>
    scoreNormPlayer(n, ctx),
  );
  const starters = players.filter((p) => p.slot === "starter");

  const sched = (league.schedule ?? []).find(
    (m) =>
      m.matchupPeriodId === week &&
      (m.home?.teamId === myTeam.id || m.away?.teamId === myTeam.id),
  );
  const oppId =
    sched?.home?.teamId === myTeam.id ? sched?.away?.teamId : sched?.home?.teamId;
  const oppTeam = teams.find((t) => t.id === oppId);

  const myProjected =
    Math.round(starters.reduce((s, p) => s + p.projectedPoints, 0) * 10) / 10;
  const oppProjected = oppTeam
    ? Math.round(espnStarterProjection(oppTeam, week) * 10) / 10
    : Math.round(myProjected * 0.96 * 10) / 10;
  const total = myProjected + oppProjected || 1;
  const myWinProb = Math.round((myProjected / total) * 100);

  const teamName = (t?: EspnTeam) =>
    t
      ? t.name ?? (`${t.location ?? ""} ${t.nickname ?? ""}`.trim() || `Team ${t.id}`)
      : "Opponent";
  const rec = (t?: EspnTeam) =>
    t?.record?.overall
      ? `${t.record.overall.wins}-${t.record.overall.losses}`
      : undefined;

  const matchup: Matchup = {
    week,
    home: {
      manager: {
        id: String(myTeam.id),
        displayName: teamName(myTeam),
        record: rec(myTeam),
      },
      projectedTotal: myProjected,
      winProbability: myWinProb,
      starters: starters.map((p) => p.id),
    },
    away: {
      manager: {
        id: String(oppTeam?.id ?? "opp"),
        displayName: teamName(oppTeam),
        record: rec(oppTeam),
      },
      projectedTotal: oppProjected,
      winProbability: 100 - myWinProb,
      starters: [],
    },
  };

  return {
    leagueId: `espn-${league.id}`,
    leagueName: league.settings?.name ?? `ESPN League ${league.id}`,
    platform: "espn",
    week,
    manager: {
      id: String(myTeam.id),
      displayName: teamName(myTeam),
      record: rec(myTeam),
    },
    players,
    matchup,
  };
}
