import type { Player } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// ESPN-style lineup ordering.
//
// Starters are shown in canonical slot order (QB → RB → WR → TE → FLEX → D/ST →
// K), with the bench grouped beneath. `lineupOrder` is a sortable weight.
// ─────────────────────────────────────────────────────────────────────────────

const SLOT_WEIGHT: Record<string, number> = {
  QB: 0,
  RB: 10,
  WR: 20,
  TE: 30,
  FLEX: 40,
  "W/R/T": 40,
  "REC FLEX": 42,
  "SUPER FLEX": 5,
  DEF: 50,
  "D/ST": 50,
  DST: 50,
  K: 60,
  BN: 900,
  BE: 900,
  IR: 950,
};

const POSITION_FALLBACK: Record<string, number> = {
  QB: 0,
  RB: 10,
  WR: 20,
  TE: 30,
  K: 60,
  DEF: 50,
  FLEX: 40,
};

/** Canonical sort weight for a lineup slot / position. */
export function lineupOrderFor(lineupSlot: string, position: string): number {
  const key = lineupSlot.toUpperCase();
  if (key in SLOT_WEIGHT) return SLOT_WEIGHT[key];
  return POSITION_FALLBACK[position] ?? 500;
}

/** Sort starters into ESPN slot order, then bench by projection. */
export function sortLineup(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    if (a.slot !== b.slot) return a.slot === "starter" ? -1 : 1;
    if (a.slot === "starter") {
      if (a.lineupOrder !== b.lineupOrder) return a.lineupOrder - b.lineupOrder;
      return b.projectedPoints - a.projectedPoints;
    }
    return b.projectedPoints - a.projectedPoints;
  });
}
