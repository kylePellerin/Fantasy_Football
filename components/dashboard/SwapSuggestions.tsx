"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ArrowLeftRight,
  ArrowRight,
  Check,
  Sparkles,
  Zap,
} from "lucide-react";
import type { LineupSwap, Player } from "@/types";
import { Button } from "@/components/ui/button";
import { cn, formatPoints } from "@/lib/utils";

interface SwapSuggestionsProps {
  swaps: LineupSwap[];
  projectedGain: number;
  onSelectPlayer?: (playerId: string) => void;
  onApplySwap?: (incoming: Player, outgoing: Player) => void;
  /** Ids of bench players already moved into the lineup. */
  appliedIds?: Set<string>;
}

export function SwapSuggestions({
  swaps,
  projectedGain,
  onSelectPlayer,
  onApplySwap,
  appliedIds,
}: SwapSuggestionsProps) {
  if (!swaps.length) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-[#00F59B]/25 bg-[#00F59B]/[0.05] p-4 shadow-glow-start">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#00F59B]/15 text-[#059669]">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#059669]">
            Lineup is already optimal
          </p>
          <p className="text-[11px] text-slate-400">
            No confidence-positive swaps found for this week.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-panel/70 p-4 shadow-panel backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#FFB800]/40 to-transparent" />
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFB800]/10 text-[#B45309] shadow-glow-tossup">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              Tactical Swap Recommender
            </h2>
            <p className="text-[11px] text-slate-500">
              {swaps.length} data-backed move{swaps.length > 1 ? "s" : ""} found
            </p>
          </div>
        </div>
        <span className="num rounded-full border border-[#00F59B]/30 bg-[#00F59B]/10 px-3 py-1 text-xs font-bold text-[#059669]">
          +{formatPoints(projectedGain)} proj pts
        </span>
      </div>

      <div className="space-y-3">
        {swaps.map((swap, i) => (
          <motion.div
            key={`${swap.benchPlayer.id}-${swap.starter.id}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30, delay: i * 0.06 }}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
          >
            <div className="flex items-center gap-3">
              <PlayerPill
                name={swap.benchPlayer.name}
                sub={`${swap.benchPlayer.position} · Conf ${swap.benchPlayer.confidence.score}`}
                tone="in"
                onClick={() => onSelectPlayer?.(swap.benchPlayer.id)}
              />
              <ArrowLeftRight className="h-4 w-4 shrink-0 text-slate-500" />
              <PlayerPill
                name={swap.starter.name}
                sub={`${swap.starter.position} · Conf ${swap.starter.confidence.score}`}
                tone="out"
                onClick={() => onSelectPlayer?.(swap.starter.id)}
              />
              <div className="ml-auto text-right">
                <div className="num text-sm font-bold text-[#059669]">
                  +{formatPoints(swap.pointsDelta)}
                </div>
                <div className="text-[9px] uppercase tracking-wide text-slate-500">
                  proj pts
                </div>
              </div>
            </div>

            <ul className="mt-2.5 space-y-1">
              {swap.reasoning.map((reason, r) => (
                <li
                  key={r}
                  className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-400"
                >
                  <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-[#00F59B]/70" />
                  {reason}
                </li>
              ))}
            </ul>

            <div className="mt-3 flex items-center gap-2">
              {appliedIds?.has(swap.benchPlayer.id) ? (
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 text-[11px]"
                  disabled
                >
                  <Check className="h-3.5 w-3.5" />
                  Started
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={() =>
                    onApplySwap?.(swap.benchPlayer, swap.starter)
                  }
                >
                  <Zap className="h-3.5 w-3.5" />
                  Start {swap.benchPlayer.name.split(" ").slice(-1)[0]}
                </Button>
              )}
              <span className="num text-[11px] text-slate-500">
                {swap.confidenceDelta >= 0 ? "+" : ""}
                {swap.confidenceDelta} confidence margin
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function PlayerPill({
  name,
  sub,
  tone,
  onClick,
}: {
  name: string;
  sub: string;
  tone: "in" | "out";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-w-0 rounded-lg border px-2.5 py-1.5 text-left transition-colors",
        tone === "in"
          ? "border-[#00F59B]/30 bg-[#00F59B]/[0.06] hover:border-[#00F59B]/50"
          : "border-[#FF3366]/25 bg-[#FF3366]/[0.05] hover:border-[#FF3366]/45",
      )}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "text-[9px] font-bold uppercase",
            tone === "in" ? "text-[#059669]" : "text-[#E11D48]",
          )}
        >
          {tone === "in" ? "Start" : "Sit"}
        </span>
      </div>
      <div className="truncate text-xs font-semibold text-slate-100">{name}</div>
      <div className="num truncate text-[10px] text-slate-500">{sub}</div>
    </button>
  );
}
