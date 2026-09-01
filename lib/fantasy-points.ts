import type { GameOdds, NflPosition, PlayerProp } from "@/types";
import { oddsToImpliedProb } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Betting-line implied fantasy points (PPR).
//
// Converts a player's sportsbook props (yardage lines + Anytime-TD odds) into an
// expected PPR fantasy score — the market's own projection for the player.
// ─────────────────────────────────────────────────────────────────────────────

function findLine(props: PlayerProp[], needle: string): number | null {
  const p = props.find((x) => x.label.toLowerCase().includes(needle));
  return p && p.line !== null ? p.line : null;
}

/** Expected PPR points implied by the betting market for a single player. */
export function impliedFantasyPoints(
  position: NflPosition,
  props: PlayerProp[],
  odds: GameOdds,
): number {
  let pts = 0;

  const recYds = findLine(props, "receiving yards");
  const rushYds = findLine(props, "rushing yards");
  const passYds = findLine(props, "passing yards");
  const receptions = findLine(props, "reception");

  if (recYds !== null) pts += recYds * 0.1;
  if (rushYds !== null) pts += rushYds * 0.1;
  if (passYds !== null) pts += passYds * 0.04;
  if (receptions !== null) pts += receptions * 1; // full PPR

  // Anytime-TD market → expected rushing/receiving TD points.
  const td = props.find((x) => x.line === null && /td/i.test(x.label));
  if (td) pts += oddsToImpliedProb(td.odds) * 6;

  // QBs: add an estimate for passing TDs from the team's implied total.
  if (position === "QB") {
    const impliedTeamTds = odds.impliedTeamTotal / 7;
    const passTds = impliedTeamTds * 0.62;
    pts += passTds * 4;
  }

  // Team defenses: derive from implied points allowed (lower = better).
  if (position === "DEF") {
    const pointsAllowed = odds.total - odds.impliedTeamTotal;
    pts = Math.max(2, 12 - (pointsAllowed - 17) * 0.6);
  }

  return Math.round(pts * 10) / 10;
}
