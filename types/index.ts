// ─────────────────────────────────────────────────────────────────────────────
// RosterPulse — Core domain types
// ─────────────────────────────────────────────────────────────────────────────

export type Platform = "sleeper" | "espn";

export type NflPosition = "QB" | "RB" | "WR" | "TE" | "K" | "DEF" | "FLEX";

export type StartStatus = "must-start" | "toss-up" | "sit";

export type RosterSlot = "starter" | "bench";

// ── Betting / odds ───────────────────────────────────────────────────────────

export interface PlayerProp {
  /** e.g. "Receiving Yards", "Rushing Yards", "Anytime TD" */
  label: string;
  /** The prop line, e.g. 67.5. Null for markets like Anytime TD. */
  line: number | null;
  /** American odds for the over / primary side, e.g. -110, +140 */
  odds: number;
  /** Optional over/under indicator for yardage props */
  side?: "over" | "under";
}

export interface GameOdds {
  /** Home team abbreviation, e.g. "KC" */
  homeTeam: string;
  /** Away team abbreviation, e.g. "BUF" */
  awayTeam: string;
  /** Over/under total for the full game */
  total: number;
  /** Point spread from the player's team perspective (negative = favored) */
  spread: number;
  /** Implied points for the player's own team */
  impliedTeamTotal: number;
  /** Kickoff ISO timestamp */
  kickoff?: string;
  /** Whether the player's team is at home */
  isHome: boolean;
  /** Coarse weather descriptor used by the optimizer */
  weather?: "dome" | "clear" | "wind" | "rain" | "snow";
}

// ── Expert context ───────────────────────────────────────────────────────────

export interface ExpertContext {
  /** Expert Consensus Rank across the position, e.g. 14 */
  ecr: number;
  /** Position rank, e.g. "WR14" */
  positionRank: string;
  /** Standard deviation of expert ranks — higher = more disagreement */
  ecrStdDev: number;
  /** Matchup difficulty tier text, e.g. "Opponent ranks #28 vs Perimeter WRs" */
  matchupTier: string;
  /** 1 (elite matchup) .. 5 (avoid) */
  matchupGrade: 1 | 2 | 3 | 4 | 5;
  /** Short betting narrative summary */
  narrative: string;
  /** Scraped news notes */
  news: NewsNote[];
}

export interface NewsNote {
  headline: string;
  body: string;
  source: string;
  timestamp: string;
  sentiment: "positive" | "neutral" | "negative";
}

// ── Score breakdown from the optimizer ───────────────────────────────────────

export interface ScoreComponent {
  key: "projection" | "bettingImplied" | "ecr" | "playerProps" | "environment";
  label: string;
  /** 0..100 sub-score before weighting */
  raw: number;
  /** Fractional weight, e.g. 0.4 */
  weight: number;
  /** raw * weight */
  weighted: number;
}

export interface StartConfidence {
  /** Final 0..100 score */
  score: number;
  status: StartStatus;
  components: ScoreComponent[];
}

// ── Player ───────────────────────────────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  position: NflPosition;
  team: string;
  opponent: string;
  slot: RosterSlot;
  /** Fantasy roster slot label, e.g. "WR", "FLEX", "BN" */
  lineupSlot: string;
  /** Projected PPR points */
  projectedPoints: number;
  /** Season average PPR points */
  averagePoints: number;
  /** Fantasy points implied purely by the betting market (props + TD odds). */
  impliedFantasyPoints: number;
  /** Whether the player's game has real sportsbook lines (drives betting UI). */
  hasBettingLines: boolean;
  /** Canonical lineup ordering weight for ESPN-style display. */
  lineupOrder: number;
  status?: "active" | "questionable" | "doubtful" | "out" | "ir";
  avatarUrl?: string;
  odds: GameOdds;
  props: PlayerProp[];
  expert: ExpertContext;
  confidence: StartConfidence;
}

// ── Roster / league / matchup ────────────────────────────────────────────────

export interface Manager {
  id: string;
  displayName: string;
  avatarUrl?: string;
  record?: string;
}

export interface MatchupSide {
  manager: Manager;
  projectedTotal: number;
  /** 0..100 win probability */
  winProbability: number;
  starters: string[]; // player ids
}

export interface Matchup {
  week: number;
  home: MatchupSide;
  away: MatchupSide;
}

export interface Roster {
  leagueId: string;
  leagueName: string;
  platform: Platform;
  week: number;
  manager: Manager;
  players: Player[];
  matchup: Matchup;
}

export interface LeagueRef {
  id: string;
  name: string;
  platform: Platform;
  season: string;
  avatarUrl?: string;
}

// ── Optimizer output ─────────────────────────────────────────────────────────

export interface LineupSwap {
  benchPlayer: Player;
  starter: Player;
  /** Confidence gain from making the swap (0..100 delta) */
  confidenceDelta: number;
  /** Projected point delta */
  pointsDelta: number;
  reasoning: string[];
}

export interface OptimizerResult {
  swaps: LineupSwap[];
  optimalStarters: string[]; // ordered player ids
  projectedGain: number;
}

// ── Waiver wire ──────────────────────────────────────────────────────────────

export interface WaiverAdd {
  id: string;
  name: string;
  position: NflPosition;
  team: string;
  avatarUrl?: string;
  /** How many leagues added this player recently (Sleeper trending). */
  addCount: number;
  /** 0..100 long-term upside score. */
  upside: number;
  /** Short reason / tag, e.g. "Ascending role", "Rookie breakout". */
  tag: string;
  rosteredPct?: number;
}

// ── API credential / settings types ──────────────────────────────────────────

export interface EspnCredentials {
  leagueId: string;
  espnS2?: string;
  swid?: string;
  season: string;
}

export interface SleeperCredentials {
  username: string;
  season: string;
}
