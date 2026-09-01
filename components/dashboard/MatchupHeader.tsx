"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Shield, Swords, TrendingUp, Trophy } from "lucide-react";
import type { Matchup } from "@/types";
import { AnimatedNumber } from "@/components/effects/AnimatedNumber";
import { cn, formatPoints } from "@/lib/utils";

interface MatchupHeaderProps {
  matchup: Matchup;
  /** Projected point gain if the optimizer's suggested swaps are applied. */
  projectedGain?: number;
}

export function MatchupHeader({ matchup, projectedGain = 0 }: MatchupHeaderProps) {
  const { home, away, week } = matchup;
  const favored = home.winProbability >= away.winProbability;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-panel/70 p-6 shadow-panel backdrop-blur-xl">
      {/* ambient gradient */}
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(520px circle at 10% 0%, rgba(0,245,155,0.12), transparent 46%), radial-gradient(520px circle at 90% 0%, rgba(255,51,102,0.10), transparent 46%)",
        }}
      />
      {/* top hairline sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="relative flex items-center justify-between">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs font-medium text-slate-300">
          <Swords className="h-3.5 w-3.5 text-[#059669]" />
          Week {week} Matchup
        </div>
        {projectedGain > 0 && (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#00F59B]/30 bg-[#00F59B]/10 px-3 py-1 text-xs font-semibold text-[#059669] shadow-glow-start">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="num">+{formatPoints(projectedGain)}</span> pts available
          </div>
        )}
      </div>

      <div className="relative mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        {/* Home / you */}
        <TeamBlock
          name={home.manager.displayName}
          record={home.manager.record}
          projected={home.projectedTotal}
          favored={favored}
          tone="you"
          align="left"
        />

        {/* Center VS + win prob */}
        <div className="flex flex-col items-center px-2">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.1] bg-canvas text-sm font-bold text-slate-300">
            <span className="num">VS</span>
            <span className="absolute inset-0 rounded-full animate-pulse-ring" />
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-slate-500">
            <Trophy className="h-3 w-3 text-[#FFB800]" />
            <span className="num">
              {Math.max(home.winProbability, away.winProbability)}%
            </span>{" "}
            favorite
          </div>
        </div>

        {/* Away / opponent */}
        <TeamBlock
          name={away.manager.displayName}
          record={away.manager.record}
          projected={away.projectedTotal}
          favored={!favored}
          tone="opp"
          align="right"
        />
      </div>

      {/* Win probability meter */}
      <div className="relative mt-6">
        <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
          <span className="num text-[#059669]">{home.winProbability}%</span>
          <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
            Win Probability
          </span>
          <span className="num text-[#E11D48]">{away.winProbability}%</span>
        </div>
        <div className="relative flex h-3 overflow-hidden rounded-full border border-white/[0.08] bg-canvas">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${home.winProbability}%` }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="h-full bg-gradient-to-r from-[#00b374] to-[#00F59B] shadow-[0_0_16px_rgba(0,245,155,0.5)]"
          />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${away.winProbability}%` }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="h-full bg-gradient-to-r from-[#FF3366] to-[#c41f47]"
          />
          {/* glowing split knob */}
          <motion.span
            aria-hidden
            initial={{ left: "0%" }}
            animate={{ left: `${home.winProbability}%` }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-1/2 h-4 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0f172a] shadow-[0_0_8px_rgba(15,23,42,0.45)]"
          />
        </div>
      </div>
    </div>
  );
}

function TeamBlock({
  name,
  record,
  projected,
  favored,
  tone,
  align,
}: {
  name: string;
  record?: string;
  projected: number;
  favored: boolean;
  tone: "you" | "opp";
  align: "left" | "right";
}) {
  const accent = tone === "you" ? "#00F59B" : "#FF3366";
  return (
    <div
      className={cn(
        "flex items-center gap-3",
        align === "right" && "flex-row-reverse text-right",
      )}
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border"
        style={{
          borderColor: favored ? `${accent}66` : "rgba(255,255,255,0.08)",
          background: favored ? `${accent}1a` : "rgba(255,255,255,0.02)",
          color: favored ? accent : "#94a3b8",
          boxShadow: favored ? `0 0 18px -6px ${accent}` : undefined,
        }}
      >
        <Shield className="h-6 w-6" />
      </div>
      <div className={cn(align === "right" && "items-end")}>
        <div className="flex items-center gap-2">
          <h2 className="truncate text-sm font-semibold text-slate-100">
            {name}
          </h2>
          {favored && (
            <span
              className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
              style={{ background: `${accent}26`, color: accent }}
            >
              Fav
            </span>
          )}
        </div>
        {record && <span className="num text-[11px] text-slate-500">{record}</span>}
        <AnimatedNumber
          value={projected}
          decimals={1}
          className="num mt-0.5 block text-2xl font-bold text-slate-50"
        />
      </div>
    </div>
  );
}
