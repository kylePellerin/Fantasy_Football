import type {
  GameOdds,
  LineupSwap,
  OptimizerResult,
  Player,
  ExpertContext,
  ScoreComponent,
  StartConfidence,
  StartStatus,
} from "@/types";
import { clamp } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Start Confidence Score — weighted 0..100 engine.
//
//   45%  Projected PPR points (platform projection)
//   30%  Betting odds (implied player pts + team scoring environment)
//   13%  Weather / spot
//   12%  Expert consensus
//
// When a player has no betting lines, that component is dropped and the rest
// are renormalized to sum to 1.
// ─────────────────────────────────────────────────────────────────────────────

const PROJ_RANGE: Record<string, [number, number]> = {
  QB: [12, 26],
  RB: [7, 22],
  WR: [7, 21],
  TE: [4, 15],
  K: [5, 11],
  DEF: [3, 12],
  FLEX: [7, 21],
};

/** Map projected PPR points onto 0..100 relative to the position's start range. */
function scoreProjection(points: number, position: string): number {
  const [lo, hi] = PROJ_RANGE[position] ?? [7, 21];
  return clamp(((points - lo) / (hi - lo)) * 100, 0, 100);
}

/** Reasonable NFL implied-team-total range mapped onto 0..100. */
function scoreBettingImplied(odds: GameOdds): number {
  const lo = 14;
  const hi = 34;
  const spread = clamp(((odds.impliedTeamTotal - lo) / (hi - lo)) * 100, 0, 100);
  const spreadBump = clamp(50 - odds.spread * 3.2, 0, 100);
  return clamp(spread * 0.78 + spreadBump * 0.22);
}

/** Expert consensus rank vs position depth; disagreement softens the score. */
function scoreEcr(expert: ExpertContext, position: string): number {
  const startableDepth: Record<string, number> = {
    QB: 24,
    RB: 40,
    WR: 48,
    TE: 20,
    K: 20,
    DEF: 20,
    FLEX: 48,
  };
  const depth = startableDepth[position] ?? 40;
  const base = clamp((1 - (expert.ecr - 1) / depth) * 100, 0, 100);
  const uncertaintyPenalty = clamp(expert.ecrStdDev * 2.5, 0, 22);
  return clamp(base - uncertaintyPenalty);
}

/** Environmental factors: home-field edge, weather, and matchup grade. */
function scoreEnvironment(odds: GameOdds, expert: ExpertContext): number {
  let score = 55;
  score += odds.isHome ? 8 : -4;
  const weatherAdj: Record<string, number> = {
    dome: 10,
    clear: 4,
    wind: -8,
    rain: -10,
    snow: -14,
  };
  score += weatherAdj[odds.weather ?? "clear"] ?? 0;
  score += (3 - expert.matchupGrade) * 9;
  return clamp(score);
}

export function statusForScore(score: number): StartStatus {
  if (score >= 55) return "must-start";
  if (score >= 32) return "toss-up";
  return "sit";
}

/** Compute the weighted Start Confidence breakdown, renormalizing when a
 *  player has no betting lines. */
export function computeStartConfidence(
  player: Pick<
    Player,
    "odds" | "expert" | "position" | "projectedPoints" | "hasBettingLines"
  >,
): StartConfidence {
  const pos = player.position;
  const active: Array<{
    key: ScoreComponent["key"];
    label: string;
    raw: number;
    weight: number;
  }> = [
    {
      key: "projection",
      label: "Projected Points",
      raw: scoreProjection(player.projectedPoints, pos),
      weight: 0.55,
    },
  ];

  if (player.hasBettingLines) {
    active.push({
      key: "bettingImplied",
      label: "Betting Odds",
      raw: scoreBettingImplied(player.odds),
      weight: 0.16,
    });
  }

  active.push({
    key: "environment",
    label: "Weather / Spot",
    raw: scoreEnvironment(player.odds, player.expert),
    weight: 0.14,
  });
  active.push({
    key: "ecr",
    label: "Expert Consensus",
    raw: scoreEcr(player.expert, pos),
    weight: 0.15,
  });

  const totalW = active.reduce((s, c) => s + c.weight, 0);
  const components: ScoreComponent[] = active.map((c) => {
    const weight = c.weight / totalW;
    return { key: c.key, label: c.label, raw: c.raw, weight, weighted: c.raw * weight };
  });

  const score = Math.round(
    clamp(components.reduce((sum, c) => sum + c.weighted, 0)),
  );

  return { score, status: statusForScore(score), components };
}

/** Attach freshly-computed confidence to a batch of players. */
export function scorePlayers(players: Player[]): Player[] {
  return players.map((p) => ({ ...p, confidence: computeStartConfidence(p) }));
}

// ── Lineup optimizer ─────────────────────────────────────────────────────────

const FLEX_ELIGIBLE = new Set(["RB", "WR", "TE"]);

function slotsAreInterchangeable(a: Player, b: Player): boolean {
  if (a.position === b.position) return true;
  const aFlex = a.lineupSlot === "FLEX" || FLEX_ELIGIBLE.has(a.position);
  const bFlex = b.lineupSlot === "FLEX" || FLEX_ELIGIBLE.has(b.position);
  const aIsFlexSlot = a.lineupSlot === "FLEX";
  const bIsFlexSlot = b.lineupSlot === "FLEX";
  return (aIsFlexSlot && bFlex) || (bIsFlexSlot && aFlex);
}

/** Reasoning centered on projected points + betting; position rank only when
 *  comparing the same position. Confidence is framed as a safety margin. */
function buildReasoning(bench: Player, starter: Player): string[] {
  const reasons: string[] = [];
  const dPts = bench.projectedPoints - starter.projectedPoints;
  reasons.push(
    `Projects ${dPts.toFixed(1)} more PPR (${bench.projectedPoints.toFixed(
      1,
    )} vs ${starter.projectedPoints.toFixed(1)}).`,
  );

  if (
    bench.hasBettingLines &&
    starter.hasBettingLines &&
    bench.odds.impliedTeamTotal > starter.odds.impliedTeamTotal + 1
  ) {
    reasons.push(
      `Better scoring spot — team total ${bench.odds.impliedTeamTotal.toFixed(
        1,
      )} vs ${starter.odds.impliedTeamTotal.toFixed(1)}.`,
    );
  }

  // Position rank only within the same position (never TE27 vs RB35).
  if (
    bench.position === starter.position &&
    bench.expert.ecr < starter.expert.ecr
  ) {
    reasons.push(
      `Ranked higher at ${bench.position} (${bench.expert.positionRank} vs ${starter.expert.positionRank}).`,
    );
  }

  const dConf = bench.confidence.score - starter.confidence.score;
  reasons.push(
    dConf >= 0
      ? `Confidence margin +${dConf} (${bench.confidence.score} vs ${starter.confidence.score}).`
      : `Higher ceiling, thinner margin (${dConf} confidence).`,
  );
  return reasons;
}

/**
 * Points-first optimizer: recommend a bench player over an interchangeable
 * starter when they project meaningfully more points. Confidence is used only
 * as a safety margin (surfaced in the reasoning), never as the trigger.
 */
export function optimizeLineup(players: Player[]): OptimizerResult {
  const POINTS_THRESHOLD = 0.75;
  const starters = players.filter((p) => p.slot === "starter");
  const bench = players.filter((p) => p.slot === "bench");
  const swaps: LineupSwap[] = [];
  const usedStarters = new Set<string>();

  // Highest-projected bench players first.
  const rankedBench = [...bench].sort(
    (a, b) => b.projectedPoints - a.projectedPoints,
  );

  for (const b of rankedBench) {
    const candidates = starters
      .filter(
        (s) =>
          !usedStarters.has(s.id) &&
          slotsAreInterchangeable(b, s) &&
          b.projectedPoints - s.projectedPoints >= POINTS_THRESHOLD,
      )
      // Replace the weakest-projected starter this bench player beats.
      .sort((s1, s2) => s1.projectedPoints - s2.projectedPoints);

    const target = candidates[0];
    if (!target) continue;

    usedStarters.add(target.id);
    swaps.push({
      benchPlayer: b,
      starter: target,
      confidenceDelta: b.confidence.score - target.confidence.score,
      pointsDelta:
        Math.round((b.projectedPoints - target.projectedPoints) * 10) / 10,
      reasoning: buildReasoning(b, target),
    });
  }

  // Rank recommendations by the point gain they unlock.
  swaps.sort((a, b) => b.pointsDelta - a.pointsDelta);

  const swappedOut = new Set(swaps.map((s) => s.starter.id));
  const swappedIn = swaps.map((s) => s.benchPlayer.id);
  const optimalStarters = [
    ...starters.filter((s) => !swappedOut.has(s.id)).map((s) => s.id),
    ...swappedIn,
  ];

  const projectedGain =
    Math.round(swaps.reduce((sum, s) => sum + Math.max(s.pointsDelta, 0), 0) * 10) /
    10;

  return { swaps, optimalStarters, projectedGain };
}
