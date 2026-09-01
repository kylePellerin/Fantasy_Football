import type {
  LeagueRef,
  Manager,
  Matchup,
  Player,
  Roster,
  WaiverAdd,
} from "@/types";
import { computeStartConfidence, optimizeLineup } from "@/lib/optimizer";
import { impliedFantasyPoints } from "@/lib/fantasy-points";
import { lineupOrderFor } from "@/lib/lineup";
import { sleeperHeadshot, sleeperTeamLogo } from "@/lib/sleeper-assets";

// Raw player shape before the engine computes derived fields.
type RawPlayer = Omit<
  Player,
  | "confidence"
  | "impliedFantasyPoints"
  | "hasBettingLines"
  | "lineupOrder"
  | "avatarUrl"
>;

// Internal id → real Sleeper headshot id, so the demo shows real faces.
const HEADSHOT_ID: Record<string, string> = {
  p_jefferson: "6794",
  p_lamb: "6786",
  p_hall: "8155",
  p_pollard: "5967",
  p_allen: "4984",
  p_laporta: "10859",
  p_flex_addison: "9756",
  p_bench_mcbride: "8130",
  p_bench_mixon: "4018",
  p_bench_pickens: "8137",
  p_bench_njoku: "4033",
};

function avatarFor(raw: RawPlayer): string {
  if (raw.position === "DEF") return sleeperTeamLogo(raw.team);
  const id = HEADSHOT_ID[raw.id];
  return id ? sleeperHeadshot(id) : "";
}

function withConfidence(raw: RawPlayer): Player {
  const enriched = {
    ...raw,
    avatarUrl: avatarFor(raw),
    impliedFantasyPoints: impliedFantasyPoints(
      raw.position,
      raw.props,
      raw.odds,
    ),
    hasBettingLines: true,
    lineupOrder: lineupOrderFor(raw.lineupSlot, raw.position),
  };
  return { ...enriched, confidence: computeStartConfidence(enriched) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Leagues available in the dropdown selector
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_LEAGUES: LeagueRef[] = [
  {
    id: "sleeper-1024",
    name: "Dynasty Degenerates",
    platform: "sleeper",
    season: "2026",
  },
  {
    id: "sleeper-2048",
    name: "The Gridiron Guild",
    platform: "sleeper",
    season: "2026",
  },
  {
    id: "espn-778812",
    name: "Office League PPR",
    platform: "espn",
    season: "2026",
  },
];

const ME: Manager = {
  id: "u_me",
  displayName: "You",
  record: "6-2",
};

const OPPONENT: Manager = {
  id: "u_opp",
  displayName: "TouchdownTycoon",
  record: "5-3",
};

// ─────────────────────────────────────────────────────────────────────────────
// Roster
// ─────────────────────────────────────────────────────────────────────────────

const RAW_PLAYERS: RawPlayer[] = [
  {
    id: "p_jefferson",
    name: "Justin Jefferson",
    position: "WR",
    team: "MIN",
    opponent: "CHI",
    slot: "starter",
    lineupSlot: "WR",
    projectedPoints: 19.4,
    averagePoints: 20.1,
    status: "active",
    odds: {
      homeTeam: "MIN",
      awayTeam: "CHI",
      total: 45.5,
      spread: -6.5,
      impliedTeamTotal: 26,
      isHome: true,
      weather: "dome",
    },
    props: [
      { label: "Receiving Yards", line: 92.5, odds: -114, side: "over" },
      { label: "Receptions", line: 6.5, odds: -120, side: "over" },
      { label: "Anytime TD", line: null, odds: 125 },
    ],
    expert: {
      ecr: 3,
      positionRank: "WR3",
      ecrStdDev: 1.1,
      matchupTier: "Opponent ranks #29 vs Perimeter WRs",
      matchupGrade: 1,
      narrative:
        "Elite target share in a dome with a soft perimeter matchup. Smash play.",
      news: [
        {
          headline: "Jefferson full go, no injury designation",
          body: "Practiced fully all week and carries no injury tag into Sunday.",
          source: "RotoBaller",
          timestamp: "2026-08-30T14:20:00Z",
          sentiment: "positive",
        },
      ],
    },
  },
  {
    id: "p_lamb",
    name: "CeeDee Lamb",
    position: "WR",
    team: "DAL",
    opponent: "PHI",
    slot: "starter",
    lineupSlot: "WR",
    projectedPoints: 17.1,
    averagePoints: 16.4,
    status: "active",
    odds: {
      homeTeam: "PHI",
      awayTeam: "DAL",
      total: 48.5,
      spread: 2.5,
      impliedTeamTotal: 23,
      isHome: false,
      weather: "clear",
    },
    props: [
      { label: "Receiving Yards", line: 84.5, odds: -110, side: "over" },
      { label: "Receptions", line: 6.5, odds: -135, side: "over" },
      { label: "Anytime TD", line: null, odds: 140 },
    ],
    expert: {
      ecr: 6,
      positionRank: "WR6",
      ecrStdDev: 1.8,
      matchupTier: "Opponent ranks #12 vs Slot WRs",
      matchupGrade: 3,
      narrative:
        "High-total division game, but Philadelphia's slot coverage limits ceiling.",
      news: [
        {
          headline: "Lamb sees 11 targets in Week 8",
          body: "Volume remains elite even against tougher coverage.",
          source: "FantasyPros",
          timestamp: "2026-08-29T18:00:00Z",
          sentiment: "positive",
        },
      ],
    },
  },
  {
    id: "p_hall",
    name: "Breece Hall",
    position: "RB",
    team: "NYJ",
    opponent: "NE",
    slot: "starter",
    lineupSlot: "RB",
    projectedPoints: 15.8,
    averagePoints: 14.9,
    status: "active",
    odds: {
      homeTeam: "NYJ",
      awayTeam: "NE",
      total: 39.5,
      spread: -3,
      impliedTeamTotal: 21.25,
      isHome: true,
      weather: "wind",
    },
    props: [
      { label: "Rushing Yards", line: 68.5, odds: -115, side: "over" },
      { label: "Receiving Yards", line: 24.5, odds: -110, side: "over" },
      { label: "Anytime TD", line: null, odds: 105 },
    ],
    expert: {
      ecr: 8,
      positionRank: "RB8",
      ecrStdDev: 2.2,
      matchupTier: "Opponent ranks #21 vs RB receptions",
      matchupGrade: 2,
      narrative:
        "Workhorse role with pass-game usage; wind slightly caps the game total.",
      news: [
        {
          headline: "Hall handles 78% snap share",
          body: "Bellcow usage locked in with goal-line work.",
          source: "RotoBaller",
          timestamp: "2026-08-30T12:00:00Z",
          sentiment: "positive",
        },
      ],
    },
  },
  {
    id: "p_pollard",
    name: "Tony Pollard",
    position: "RB",
    team: "TEN",
    opponent: "HOU",
    slot: "starter",
    lineupSlot: "RB",
    projectedPoints: 11.2,
    averagePoints: 11.8,
    status: "questionable",
    odds: {
      homeTeam: "HOU",
      awayTeam: "TEN",
      total: 41.5,
      spread: 6.5,
      impliedTeamTotal: 17.5,
      isHome: false,
      weather: "dome",
    },
    props: [
      { label: "Rushing Yards", line: 52.5, odds: -108, side: "over" },
      { label: "Anytime TD", line: null, odds: 175 },
    ],
    expert: {
      ecr: 26,
      positionRank: "RB26",
      ecrStdDev: 3.6,
      matchupTier: "Opponent ranks #6 vs RB rushing",
      matchupGrade: 4,
      narrative:
        "Big underdog with a low implied total against a stout front. Touchdown-dependent.",
      news: [
        {
          headline: "Pollard limited Wednesday (ankle)",
          body: "Tagged questionable; monitor pregame reports.",
          source: "FantasyPros",
          timestamp: "2026-08-31T09:30:00Z",
          sentiment: "negative",
        },
      ],
    },
  },
  {
    id: "p_allen",
    name: "Josh Allen",
    position: "QB",
    team: "BUF",
    opponent: "MIA",
    slot: "starter",
    lineupSlot: "QB",
    projectedPoints: 23.6,
    averagePoints: 24.2,
    status: "active",
    odds: {
      homeTeam: "BUF",
      awayTeam: "MIA",
      total: 49.5,
      spread: -4.5,
      impliedTeamTotal: 27,
      isHome: true,
      weather: "clear",
    },
    props: [
      { label: "Passing Yards", line: 254.5, odds: -112, side: "over" },
      { label: "Rushing Yards", line: 34.5, odds: -118, side: "over" },
      { label: "Anytime TD", line: null, odds: -140 },
    ],
    expert: {
      ecr: 1,
      positionRank: "QB1",
      ecrStdDev: 0.4,
      matchupTier: "Opponent ranks #24 vs QB rushing",
      matchupGrade: 1,
      narrative: "Top implied total in the slate with rushing floor. Elite start.",
      news: [
        {
          headline: "Allen dominant in prime-time spots",
          body: "Dual-threat ceiling intact against a leaky secondary.",
          source: "RotoBaller",
          timestamp: "2026-08-30T20:00:00Z",
          sentiment: "positive",
        },
      ],
    },
  },
  {
    id: "p_laporta",
    name: "Sam LaPorta",
    position: "TE",
    team: "DET",
    opponent: "GB",
    slot: "starter",
    lineupSlot: "TE",
    projectedPoints: 12.9,
    averagePoints: 11.6,
    status: "active",
    odds: {
      homeTeam: "DET",
      awayTeam: "GB",
      total: 51.5,
      spread: -3.5,
      impliedTeamTotal: 27.5,
      isHome: true,
      weather: "dome",
    },
    props: [
      { label: "Receiving Yards", line: 48.5, odds: -115, side: "over" },
      { label: "Receptions", line: 4.5, odds: -125, side: "over" },
      { label: "Anytime TD", line: null, odds: 150 },
    ],
    expert: {
      ecr: 2,
      positionRank: "TE2",
      ecrStdDev: 0.9,
      matchupTier: "Opponent ranks #27 vs TEs",
      matchupGrade: 1,
      narrative: "Red-zone hog in a shootout dome game. Premium TE spot.",
      news: [
        {
          headline: "LaPorta leads team in red-zone targets",
          body: "Consistent goal-line role boosts touchdown equity.",
          source: "FantasyPros",
          timestamp: "2026-08-29T15:30:00Z",
          sentiment: "positive",
        },
      ],
    },
  },
  {
    id: "p_flex_addison",
    name: "Jordan Addison",
    position: "WR",
    team: "MIN",
    opponent: "CHI",
    slot: "starter",
    lineupSlot: "FLEX",
    projectedPoints: 13.1,
    averagePoints: 12.4,
    status: "active",
    odds: {
      homeTeam: "MIN",
      awayTeam: "CHI",
      total: 45.5,
      spread: -6.5,
      impliedTeamTotal: 26,
      isHome: true,
      weather: "dome",
    },
    props: [
      { label: "Receiving Yards", line: 58.5, odds: -110, side: "over" },
      { label: "Anytime TD", line: null, odds: 160 },
    ],
    expert: {
      ecr: 22,
      positionRank: "WR22",
      ecrStdDev: 2.9,
      matchupTier: "Opponent ranks #29 vs Perimeter WRs",
      matchupGrade: 2,
      narrative:
        "Benefits from the same soft matchup; secondary option behind Jefferson.",
      news: [
        {
          headline: "Addison sees uptick in deep targets",
          body: "Air-yard share trending up over the last three weeks.",
          source: "RotoBaller",
          timestamp: "2026-08-30T11:10:00Z",
          sentiment: "positive",
        },
      ],
    },
  },
  {
    id: "p_kelce_def",
    name: "Baltimore Ravens",
    position: "DEF",
    team: "BAL",
    opponent: "CLE",
    slot: "starter",
    lineupSlot: "DEF",
    projectedPoints: 8.4,
    averagePoints: 7.9,
    status: "active",
    odds: {
      homeTeam: "BAL",
      awayTeam: "CLE",
      total: 42.5,
      spread: -7,
      impliedTeamTotal: 24.75,
      isHome: true,
      weather: "clear",
    },
    props: [{ label: "Team Sacks", line: 2.5, odds: -105, side: "over" }],
    expert: {
      ecr: 3,
      positionRank: "DEF3",
      ecrStdDev: 2.0,
      matchupTier: "Opponent allows 3rd-most sacks",
      matchupGrade: 1,
      narrative: "Big favorite at home against a turnover-prone offense.",
      news: [],
    },
  },
  // ── Bench ──────────────────────────────────────────────────────────────────
  {
    id: "p_bench_mcbride",
    name: "Trey McBride",
    position: "TE",
    team: "ARI",
    opponent: "SEA",
    slot: "bench",
    lineupSlot: "BN",
    projectedPoints: 11.8,
    averagePoints: 12.1,
    status: "active",
    odds: {
      homeTeam: "ARI",
      awayTeam: "SEA",
      total: 47.5,
      spread: -1.5,
      impliedTeamTotal: 24.5,
      isHome: true,
      weather: "clear",
    },
    props: [
      { label: "Receiving Yards", line: 55.5, odds: -118, side: "over" },
      { label: "Receptions", line: 5.5, odds: -130, side: "over" },
      { label: "Anytime TD", line: null, odds: 165 },
    ],
    expert: {
      ecr: 5,
      positionRank: "TE5",
      ecrStdDev: 1.4,
      matchupTier: "Opponent ranks #18 vs TEs",
      matchupGrade: 2,
      narrative: "Target monster in a near even game total; strong TE2 floor.",
      news: [
        {
          headline: "McBride paces team in targets again",
          body: "Every-down role keeps a high reception floor.",
          source: "FantasyPros",
          timestamp: "2026-08-30T16:45:00Z",
          sentiment: "positive",
        },
      ],
    },
  },
  {
    id: "p_bench_mixon",
    name: "Joe Mixon",
    position: "RB",
    team: "HOU",
    opponent: "TEN",
    slot: "bench",
    lineupSlot: "BN",
    projectedPoints: 15.2,
    averagePoints: 14.1,
    status: "active",
    odds: {
      homeTeam: "HOU",
      awayTeam: "TEN",
      total: 41.5,
      spread: -6.5,
      impliedTeamTotal: 24,
      isHome: true,
      weather: "dome",
    },
    props: [
      { label: "Rushing Yards", line: 74.5, odds: -120, side: "over" },
      { label: "Receiving Yards", line: 18.5, odds: -110, side: "over" },
      { label: "Anytime TD", line: null, odds: -105 },
    ],
    expert: {
      ecr: 11,
      positionRank: "RB11",
      ecrStdDev: 1.9,
      matchupTier: "Opponent ranks #25 vs RB rushing",
      matchupGrade: 1,
      narrative:
        "Home favorite with goal-line role vs a bottom-tier run defense. Great spot.",
      news: [
        {
          headline: "Mixon owns backfield touches",
          body: "Leads the team in carries and red-zone opportunities.",
          source: "RotoBaller",
          timestamp: "2026-08-30T13:15:00Z",
          sentiment: "positive",
        },
      ],
    },
  },
  {
    id: "p_bench_pickens",
    name: "George Pickens",
    position: "WR",
    team: "PIT",
    opponent: "CIN",
    slot: "bench",
    lineupSlot: "BN",
    projectedPoints: 12.6,
    averagePoints: 11.9,
    status: "active",
    odds: {
      homeTeam: "CIN",
      awayTeam: "PIT",
      total: 43.5,
      spread: 3,
      impliedTeamTotal: 20.25,
      isHome: false,
      weather: "clear",
    },
    props: [
      { label: "Receiving Yards", line: 62.5, odds: -112, side: "over" },
      { label: "Anytime TD", line: null, odds: 190 },
    ],
    expert: {
      ecr: 28,
      positionRank: "WR28",
      ecrStdDev: 4.1,
      matchupTier: "Opponent ranks #14 vs Perimeter WRs",
      matchupGrade: 3,
      narrative: "Boom/bust deep threat; road underdog caps the floor.",
      news: [
        {
          headline: "Pickens boom-or-bust profile continues",
          body: "Air-yards leader but target volume fluctuates weekly.",
          source: "FantasyPros",
          timestamp: "2026-08-29T20:20:00Z",
          sentiment: "neutral",
        },
      ],
    },
  },
  {
    id: "p_bench_njoku",
    name: "David Njoku",
    position: "TE",
    team: "CLE",
    opponent: "BAL",
    slot: "bench",
    lineupSlot: "BN",
    projectedPoints: 9.1,
    averagePoints: 9.6,
    status: "questionable",
    odds: {
      homeTeam: "BAL",
      awayTeam: "CLE",
      total: 42.5,
      spread: 7,
      impliedTeamTotal: 17.75,
      isHome: false,
      weather: "clear",
    },
    props: [
      { label: "Receiving Yards", line: 41.5, odds: -108, side: "over" },
      { label: "Anytime TD", line: null, odds: 220 },
    ],
    expert: {
      ecr: 12,
      positionRank: "TE12",
      ecrStdDev: 2.7,
      matchupTier: "Opponent ranks #4 vs TEs",
      matchupGrade: 4,
      narrative: "Road underdog into a tough defense with a low team total.",
      news: [
        {
          headline: "Njoku dealing with knee soreness",
          body: "Practiced limited midweek; game-time watch.",
          source: "RotoBaller",
          timestamp: "2026-08-31T10:05:00Z",
          sentiment: "negative",
        },
      ],
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Assembled roster + matchup
// ─────────────────────────────────────────────────────────────────────────────

export function buildMockRoster(
  league: LeagueRef = MOCK_LEAGUES[0],
  week = 9,
): Roster {
  const players = RAW_PLAYERS.map(withConfidence);
  const starters = players.filter((p) => p.slot === "starter");
  const myProjected =
    Math.round(starters.reduce((s, p) => s + p.projectedPoints, 0) * 10) / 10;
  const oppProjected = 118.6;

  const total = myProjected + oppProjected;
  const myWinProb = Math.round((myProjected / total) * 100);

  const matchup: Matchup = {
    week,
    home: {
      manager: ME,
      projectedTotal: myProjected,
      winProbability: myWinProb,
      starters: starters.map((p) => p.id),
    },
    away: {
      manager: OPPONENT,
      projectedTotal: oppProjected,
      winProbability: 100 - myWinProb,
      starters: [],
    },
  };

  return {
    leagueId: league.id,
    leagueName: league.name,
    platform: league.platform,
    week,
    manager: ME,
    players,
    matchup,
  };
}

export function mockOptimizerResult(roster: Roster) {
  return optimizeLineup(roster.players);
}

// ─────────────────────────────────────────────────────────────────────────────
// Demo waiver-wire recommendations (long-term upside focus)
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_WAIVERS: WaiverAdd[] = [
  {
    id: "w_odunze",
    name: "Rome Odunze",
    position: "WR",
    team: "CHI",
    addCount: 41250,
    upside: 92,
    tag: "Rookie breakout",
  },
  {
    id: "w_spears",
    name: "Tyjae Spears",
    position: "RB",
    team: "TEN",
    addCount: 33800,
    upside: 84,
    tag: "Ascending role",
  },
  {
    id: "w_warren",
    name: "Jaylen Warren",
    position: "RB",
    team: "PIT",
    addCount: 28100,
    upside: 79,
    tag: "Long-term upside",
  },
  {
    id: "w_jennings",
    name: "Jauan Jennings",
    position: "WR",
    team: "SF",
    addCount: 24600,
    upside: 71,
    tag: "Trending add",
  },
  {
    id: "w_otton",
    name: "Cade Otton",
    position: "TE",
    team: "TB",
    addCount: 19900,
    upside: 66,
    tag: "Ascending role",
  },
  {
    id: "w_polk",
    name: "Ja'Lynn Polk",
    position: "WR",
    team: "NE",
    addCount: 15400,
    upside: 74,
    tag: "Rookie breakout",
  },
];
