"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ChevronRight,
  CloudRain,
  Coins,
  Home,
  Plane,
  Radio,
  Snowflake,
  Target,
  TrendingUp,
  Wind,
} from "lucide-react";
import type { Player } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PlayerAvatar } from "@/components/dashboard/PlayerAvatar";
import { AnimatedNumber } from "@/components/effects/AnimatedNumber";
import { STATUS_META, BET_ACCENT } from "@/lib/constants";
import { cn, formatOdds, formatPoints, formatSpread } from "@/lib/utils";

const POSITION_COLORS: Record<string, string> = {
  QB: "text-rose-700 bg-rose-500/10 border-rose-500/20",
  RB: "text-[#047857] bg-[#00F59B]/12 border-[#00F59B]/25",
  WR: "text-sky-700 bg-sky-500/10 border-sky-500/20",
  TE: "text-orange-700 bg-orange-500/10 border-orange-500/20",
  K: "text-violet-700 bg-violet-500/10 border-violet-500/20",
  DEF: "text-slate-600 bg-slate-500/10 border-slate-500/20",
  FLEX: "text-teal-700 bg-teal-500/10 border-teal-500/20",
};

const STATUS_TAG: Record<string, string> = {
  questionable: "text-[#B45309]",
  doubtful: "text-orange-600",
  out: "text-[#E11D48]",
  ir: "text-[#E11D48]",
};

function WeatherIcon({ weather }: { weather?: string }) {
  const cls = "h-3.5 w-3.5 text-slate-500";
  switch (weather) {
    case "wind":
      return <Wind className={cls} />;
    case "rain":
      return <CloudRain className={cls} />;
    case "snow":
      return <Snowflake className={cls} />;
    default:
      return null;
  }
}

interface RosterCardProps {
  player: Player;
  onSelect?: (player: Player) => void;
  /** Badge shown when the optimizer flags this as a recommended swap-in. */
  recommended?: boolean;
  /** ESPN-style lineup slot label rendered in the left gutter (QB, FLEX, BN…). */
  slotLabel?: string;
  index?: number;
}

export function RosterCard({
  player,
  onSelect,
  recommended = false,
  slotLabel,
  index = 0,
}: RosterCardProps) {
  const meta = STATUS_META[player.confidence.status];
  const topProp = player.props.find((p) => p.line !== null);
  const cardRef = React.useRef<HTMLButtonElement>(null);

  const handleMove = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const el = cardRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
      el.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
    },
    [],
  );

  return (
    <div className="flex items-stretch gap-2">
      {slotLabel && (
        <div className="flex w-9 shrink-0 items-center justify-center">
          <span
            className={cn(
              "num rounded-md px-1.5 py-1 text-[10px] font-bold uppercase tracking-wide",
              slotLabel === "BN"
                ? "bg-white/[0.03] text-slate-500"
                : "border border-white/[0.06] bg-white/[0.05] text-slate-300",
            )}
          >
            {slotLabel}
          </span>
        </div>
      )}

      <motion.button
        ref={cardRef}
        type="button"
        onClick={() => onSelect?.(player)}
        onMouseMove={handleMove}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30, delay: index * 0.03 }}
        whileHover={{ y: -3 }}
        style={{ ["--spot-tint" as string]: `${meta.hex}40` }}
        className={cn(
          "group relative w-full overflow-hidden rounded-2xl border bg-panel/70 p-4 pl-5 text-left backdrop-blur-xl transition-colors",
          "border-white/[0.06] hover:border-white/[0.12]",
          recommended &&
            "border-[#00F59B]/30 shadow-[0_0_28px_-8px_rgba(0,245,155,0.4)]",
        )}
      >
        {/* Cursor spotlight overlays */}
        <span
          aria-hidden
          className="spotlight-layer pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
        <span
          aria-hidden
          className="spotlight-ring pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 mix-blend-screen transition-opacity duration-500 group-hover:opacity-100"
        />

        {/* Neon status accent bar */}
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ background: meta.hex, boxShadow: `0 0 12px ${meta.hex}` }}
        />

        {recommended && (
          <div className="relative mb-2.5 flex">
            <span className="inline-flex items-center gap-1 rounded-full border border-[#00F59B]/30 bg-[#00F59B]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#059669]">
              <TrendingUp className="h-3 w-3" /> Optimizer pick
            </span>
          </div>
        )}

        {/* Identity row */}
        <div className="relative flex items-center gap-3">
          <div
            className="shrink-0 rounded-full p-[2px]"
            style={{
              background: `conic-gradient(from 140deg, ${meta.hex}, transparent 55%, ${meta.hex}55)`,
            }}
          >
            <PlayerAvatar
              name={player.name}
              position={player.position}
              src={player.avatarUrl}
              size={44}
              className="ring-0"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "num rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wide",
                  POSITION_COLORS[player.position] ?? POSITION_COLORS.DEF,
                )}
              >
                {player.position}
              </span>
              <h3 className="truncate text-sm font-semibold text-slate-100">
                {player.name}
              </h3>
              {player.status && player.status !== "active" && (
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase",
                    STATUS_TAG[player.status],
                  )}
                >
                  {player.status.slice(0, 1)}
                </span>
              )}
            </div>

            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
              <span className="font-medium text-slate-300">{player.team}</span>
              {player.odds.isHome ? (
                <Home className="h-3 w-3 text-slate-500" />
              ) : (
                <Plane className="h-3 w-3 text-slate-500" />
              )}
              <span>{player.opponent}</span>
              <WeatherIcon weather={player.odds.weather} />
              <span className="text-slate-600">·</span>
              <span className="num text-slate-500">{player.expert.positionRank}</span>
            </div>
          </div>

          {/* Projection (platform) + betting-based sub-value */}
          <div className="flex flex-col items-end">
            <AnimatedNumber
              value={player.projectedPoints}
              decimals={1}
              className="num text-[1.35rem] font-bold leading-none text-slate-900"
            />
            <span className="mt-0.5 text-[9px] uppercase tracking-[0.14em] text-slate-500">
              proj PPR
            </span>
            {player.impliedFantasyPoints > 0 && (
              <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-[#0891B2]">
                <Coins className="h-3 w-3" />
                <span className="num">
                  {formatPoints(player.impliedFantasyPoints)}
                </span>
                <span className="text-[9px] uppercase text-slate-500">bet</span>
              </div>
            )}
          </div>
        </div>

        {/* Confidence bar */}
        <div className="relative mt-3 flex items-center gap-2.5">
          <Badge variant={meta.badge} className="shrink-0">
            {meta.label}
          </Badge>
          <Progress
            value={player.confidence.score}
            className="h-1.5"
            indicatorClassName={meta.dot}
          />
          <span className={cn("num shrink-0 text-xs font-bold", meta.text)}>
            {player.confidence.score}
          </span>
        </div>

        {/* Vegas live feed strip — only when the game has real betting lines */}
        {player.hasBettingLines && (
          <div className="relative mt-3 overflow-hidden rounded-xl border border-[#00E5FF]/15 bg-[#00E5FF]/[0.03]">
            <div className="flex items-center justify-between border-b border-white/[0.05] px-2.5 py-1">
              <span className="inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#0891B2]">
                <Radio className="h-3 w-3 animate-glow-breathe" /> Vegas Live Feed
              </span>
              <span className="num text-[9px] text-slate-500">
                {player.team} {formatSpread(player.odds.spread)}
              </span>
            </div>
            <div className="grid grid-cols-3 divide-x divide-white/[0.05]">
              <BetCell
                label="Team Tot"
                value={formatPoints(player.odds.impliedTeamTotal)}
                accent
              />
              <BetCell label="Spread" value={formatSpread(player.odds.spread)} />
              <BetCell label="Game O/U" value={formatPoints(player.odds.total)} />
            </div>
          </div>
        )}

        {/* Prop highlight + hover-reveal analyze action */}
        <div className="relative mt-2.5 flex items-center justify-between text-[11px]">
          {topProp ? (
            <span className="inline-flex items-center gap-1.5 text-slate-400">
              <Target className="h-3 w-3" style={{ color: BET_ACCENT }} />
              {topProp.label}
              <span className="num font-medium text-slate-200">
                {topProp.side === "over" ? "O" : "U"} {topProp.line}
                <span className="ml-1 text-slate-500">
                  ({formatOdds(topProp.odds)})
                </span>
              </span>
            </span>
          ) : (
            <span />
          )}
          <span className="inline-flex items-center font-medium text-slate-500 transition-colors group-hover:text-[#059669]">
            <span className="hidden group-hover:inline">Analyze matchup</span>
            <span className="group-hover:hidden">Details</span>
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </motion.button>
    </div>
  );
}

function BetCell({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-1.5 py-1.5">
      <span className="text-[8px] uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <span
        className={cn(
          "num mt-0.5 inline-flex items-center gap-0.5 text-xs font-semibold",
          accent ? "text-[#0891B2]" : "text-slate-200",
        )}
      >
        {icon}
        {value}
      </span>
    </div>
  );
}
