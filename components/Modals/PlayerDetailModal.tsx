"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle2,
  Coins,
  Flame,
  Home,
  Lightbulb,
  Minus,
  Newspaper,
  Plane,
  Target,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { Player, ScoreComponent } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ConfidenceDial } from "@/components/dashboard/ConfidenceDial";
import { PlayerAvatar } from "@/components/dashboard/PlayerAvatar";
import { STATUS_META, BET_ACCENT } from "@/lib/constants";
import {
  cn,
  formatOdds,
  formatPoints,
  formatSpread,
} from "@/lib/utils";

interface PlayerDetailModalProps {
  player: Player | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COMPONENT_COLORS: Record<string, string> = {
  projection: "#059669",
  bettingImplied: "#0891B2",
  ecr: "#7C3AED",
  playerProps: "#FFB800",
  environment: "#D97706",
};

// ── Plain-English insight engine (derived only from real component scores) ────

type Tone = "up" | "down" | "neutral";

const TONE: Record<Tone, { color: string; Icon: LucideIcon }> = {
  up: { color: "#059669", Icon: TrendingUp },
  down: { color: "#E11D48", Icon: TrendingDown },
  neutral: { color: "#B45309", Icon: Minus },
};

const VERDICT_ICON: Record<Tone, LucideIcon> = {
  up: CheckCircle2,
  down: AlertTriangle,
  neutral: Minus,
};

function quality(raw: number): { word: string; tone: Tone } {
  if (raw >= 75) return { word: "elite", tone: "up" };
  if (raw >= 60) return { word: "strong", tone: "up" };
  if (raw >= 45) return { word: "solid", tone: "neutral" };
  if (raw >= 30) return { word: "shaky", tone: "down" };
  return { word: "weak", tone: "down" };
}

function spreadPhrase(spread: number): string {
  if (spread === 0) return "pick'em";
  return spread < 0
    ? `${Math.abs(spread)}-pt favorite`
    : `${spread}-pt underdog`;
}

const article = (word: string) =>
  /^[aeiou]/i.test(word) ? "an" : "a";

interface Insight {
  text: string;
  tone: Tone;
}

/** Turn each weighted confidence component into a readable, sourced insight. */
function buildInsights(player: Player): Insight[] {
  const out: Insight[] = [];
  for (const c of player.confidence.components) {
    const q = quality(c.raw);
    let text: string;
    switch (c.key) {
      case "projection":
        text = `${formatPoints(player.projectedPoints)} projected PPR — ${q.word} output for a ${player.position}.`;
        break;
      case "bettingImplied":
        text = `Vegas implies ${formatPoints(player.odds.impliedTeamTotal)} team points as a ${spreadPhrase(player.odds.spread)} — ${article(q.word)} ${q.word} scoring spot.`;
        break;
      case "environment": {
        const place = player.odds.isHome
          ? "at home"
          : `on the road at ${player.opponent}`;
        text = `Playing ${place}; matchup grades ${player.expert.matchupGrade}/5 — ${article(q.word)} ${q.word} situation.`;
        break;
      }
      case "ecr": {
        const disagree =
          player.expert.ecrStdDev >= 6
            ? ", though rankers disagree widely"
            : player.expert.ecrStdDev <= 2.5
              ? " with strong agreement"
              : "";
        text = `Experts slot him ${player.expert.positionRank}${disagree} — ${q.word} consensus.`;
        break;
      }
      default:
        text = `${c.label}: ${q.word}.`;
    }
    out.push({ text, tone: q.tone });
  }
  if (player.status && player.status !== "active") {
    out.push({
      text: `Listed ${player.status.toUpperCase()} — confirm he's active before lineups lock.`,
      tone: "down",
    });
  }
  return out;
}

function driverPhrase(c: ScoreComponent): string {
  switch (c.key) {
    case "projection":
      return "a healthy points projection";
    case "bettingImplied":
      return "a favorable betting environment";
    case "environment":
      return "the game spot and matchup";
    case "ecr":
      return "expert consensus";
    default:
      return c.label.toLowerCase();
  }
}

/** One-line recommendation combining status, top driver, and biggest concern. */
function getVerdict(player: Player): {
  headline: string;
  detail: string;
  tone: Tone;
} {
  const first = player.name.split(" ")[0];
  if (player.status === "out" || player.status === "ir") {
    return {
      headline: "Ruled out — don't start",
      detail: `${first} is tagged ${player.status.toUpperCase()}. Slot in an active replacement.`,
      tone: "down",
    };
  }
  const comps = player.confidence.components;
  const driver = comps.reduce((a, b) => (b.weighted > a.weighted ? b : a));
  const weakest = comps.reduce((a, b) => (b.raw < a.raw ? b : a));
  const base =
    player.confidence.status === "must-start"
      ? { headline: "Start with confidence", tone: "up" as Tone }
      : player.confidence.status === "toss-up"
        ? { headline: "Genuine toss-up", tone: "neutral" as Tone }
        : { headline: "Lean to the bench", tone: "down" as Tone };
  const concern =
    weakest.raw < 45
      ? ` Keep an eye on ${weakest.label.toLowerCase()} (${Math.round(weakest.raw)}/100).`
      : "";
  return {
    ...base,
    detail: `${player.confidence.score}/100 confidence, led by ${driverPhrase(driver)}.${concern}`,
  };
}

export function PlayerDetailModal({
  player,
  open,
  onOpenChange,
}: PlayerDetailModalProps) {
  if (!player) return null;
  const meta = STATUS_META[player.confidence.status];

  const chartData = player.confidence.components.map((c) => ({
    name: c.label,
    key: c.key,
    raw: Math.round(c.raw),
    weightPct: Math.round(c.weight * 100),
    contribution: Math.round(c.weighted),
  }));

  const insights = buildInsights(player);
  const verdict = getVerdict(player);
  const VerdictLucide = VERDICT_ICON[verdict.tone];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-hidden p-0">
        <div className="scrollbar-thin max-h-[88vh] overflow-y-auto">
          {/* Hero */}
          <div className="relative border-b border-slate-800 p-6">
            <div
              className="pointer-events-none absolute inset-0 opacity-70"
              style={{
                background: `radial-gradient(420px circle at 82% 0%, ${meta.hex}22, transparent 55%)`,
              }}
            />
            <DialogHeader className="relative">
              <div className="flex items-start gap-4">
                <div className="relative">
                  <PlayerAvatar
                    name={player.name}
                    position={player.position}
                    src={player.avatarUrl}
                    size={64}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{player.position}</Badge>
                    <Badge variant={meta.badge}>{meta.label}</Badge>
                    {player.status && player.status !== "active" && (
                      <Badge variant="sit" className="uppercase">
                        {player.status}
                      </Badge>
                    )}
                  </div>
                  <DialogTitle className="mt-1.5 text-xl">
                    {player.name}
                  </DialogTitle>
                  <DialogDescription className="flex items-center gap-1.5">
                    {player.odds.isHome ? (
                      <Home className="h-3.5 w-3.5" />
                    ) : (
                      <Plane className="h-3.5 w-3.5" />
                    )}
                    {player.team} vs {player.opponent} ·{" "}
                    {player.expert.positionRank}
                  </DialogDescription>
                </div>
                <ConfidenceDial
                  score={player.confidence.score}
                  status={player.confidence.status}
                  size={72}
                  strokeWidth={7}
                />
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2">
                <StatTile
                  label="Projected"
                  value={formatPoints(player.projectedPoints)}
                  sub="PPR"
                />
                <StatTile
                  label="Betting"
                  value={
                    player.impliedFantasyPoints > 0
                      ? formatPoints(player.impliedFantasyPoints)
                      : "—"
                  }
                  sub={player.impliedFantasyPoints > 0 ? "implied" : "no line"}
                  accentClass="text-[#0891B2]"
                />
                <StatTile
                  label="ECR"
                  value={player.expert.positionRank}
                  sub="rank"
                  small
                />
                <StatTile
                  label="Confidence"
                  value={`${player.confidence.score}`}
                  sub="/ 100"
                  accentClass={meta.text}
                />
              </div>
            </DialogHeader>
          </div>

          {/* Two-column body */}
          <div className="grid gap-6 p-6 md:grid-cols-2">
            {/* Verdict — plain-English call, full width */}
            <section className="md:col-span-2">
              <div
                className="flex items-start gap-3 rounded-xl border p-3.5"
                style={{
                  borderColor: `${TONE[verdict.tone].color}33`,
                  background: `${TONE[verdict.tone].color}0d`,
                }}
              >
                <VerdictLucide
                  className="mt-0.5 h-5 w-5 shrink-0"
                  style={{ color: TONE[verdict.tone].color }}
                />
                <div>
                  <div
                    className="text-sm font-bold"
                    style={{ color: TONE[verdict.tone].color }}
                  >
                    {verdict.headline}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                    {verdict.detail}
                  </p>
                </div>
              </div>
            </section>

            {/* Left: confidence breakdown */}
            <section>
              <SectionTitle icon={<Target className="h-4 w-4" />}>
                Start Confidence Breakdown
              </SectionTitle>
              <div className="mt-3 h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={chartData}
                    margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
                  >
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Bar dataKey="raw" radius={[0, 6, 6, 0]} barSize={16}>
                      {chartData.map((entry) => (
                        <Cell
                          key={entry.key}
                          fill={COMPONENT_COLORS[entry.key] ?? "#64748b"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-1 space-y-1">
                {chartData.map((c) => (
                  <div
                    key={c.key}
                    className="flex items-center justify-between text-[11px]"
                  >
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: COMPONENT_COLORS[c.key] }}
                      />
                      {c.name}
                      <span className="text-slate-600">({c.weightPct}%)</span>
                    </span>
                    <span className="font-medium text-slate-300">
                      {c.raw} → +{c.contribution}
                    </span>
                  </div>
                ))}
                <p className="mt-2 rounded-lg bg-white/[0.03] px-2.5 py-2 text-[10px] leading-relaxed text-slate-500">
                  Weighted blend → final score{" "}
                  <span className={cn("num font-bold", meta.text)}>
                    {player.confidence.score}
                  </span>
                  . ≥55 = Must Start, 32–54 = Toss-Up, &lt;32 = Sit.
                </p>
              </div>

              {/* What's driving this call */}
              <div className="mt-4">
                <SectionTitle
                  icon={<Lightbulb className="h-4 w-4 text-[#D97706]" />}
                >
                  What&apos;s driving this
                </SectionTitle>
                <ul className="mt-2 space-y-1.5">
                  {insights.map((ins, i) => {
                    const tone = TONE[ins.tone];
                    return (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-[11px] leading-relaxed"
                      >
                        <tone.Icon
                          className="mt-0.5 h-3.5 w-3.5 shrink-0"
                          style={{ color: tone.color }}
                        />
                        <span className="text-slate-300">{ins.text}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>

            {/* Right: betting market */}
            <section>
              <SectionTitle icon={<Flame className="h-4 w-4 text-[#D97706]" />}>
                Betting Market
              </SectionTitle>
              {player.hasBettingLines ? (
                <>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    <StatTile
                      label="Implied"
                      value={formatPoints(player.odds.impliedTeamTotal)}
                      accentClass="text-[#0891B2]"
                    />
                    <StatTile
                      label="Spread"
                      value={formatSpread(player.odds.spread)}
                    />
                    <StatTile label="Total" value={formatPoints(player.odds.total)} />
                    <StatTile
                      label="Weather"
                      value={player.odds.weather ?? "—"}
                      small
                    />
                  </div>

                  {player.impliedFantasyPoints > 0 && (
                    <div className="mt-3 flex items-center justify-between rounded-lg border border-[#00E5FF]/20 bg-[#00E5FF]/[0.05] px-3 py-2">
                      <span className="flex items-center gap-2 text-xs text-[#0e7490]">
                        <Coins className="h-3.5 w-3.5" />
                        Betting-implied fantasy points
                      </span>
                      <span className="num text-sm font-bold text-[#0891B2]">
                        {formatPoints(player.impliedFantasyPoints)}
                      </span>
                    </div>
                  )}

                  <div className="mt-3 space-y-1.5">
                    {player.props.map((prop, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                      >
                        <span className="flex items-center gap-2 text-xs text-slate-300">
                          <Target
                            className="h-3.5 w-3.5"
                            style={{ color: BET_ACCENT }}
                          />
                          {prop.label}
                        </span>
                        <span className="num text-xs font-semibold text-slate-100">
                          {prop.line !== null && (
                            <span className="text-slate-400">
                              {prop.side === "over" ? "O " : "U "}
                              {prop.line}{" "}
                            </span>
                          )}
                          <span className="text-[#059669]">
                            {formatOdds(prop.odds)}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-4 text-center text-xs text-slate-500">
                  No sportsbook lines for this game yet — confidence is based on
                  the projection, matchup, and expert consensus.
                </p>
              )}
            </section>

            {/* Matchup narrative — full width */}
            <section className="md:col-span-2">
              <SectionTitle icon={<TrendingUp className="h-4 w-4" />}>
                Matchup & Narrative
              </SectionTitle>
              <div className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="bet">
                    Grade {player.expert.matchupGrade}/5
                  </Badge>
                  <span className="text-[11px] text-slate-400">
                    {player.expert.matchupTier}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-300">
                  {player.expert.narrative}
                </p>
              </div>
            </section>

            {/* News — full width */}
            <section className="md:col-span-2">
              <SectionTitle icon={<Newspaper className="h-4 w-4" />}>
                Scraped Buzz
              </SectionTitle>
              <div className="mt-3 space-y-2">
                {player.expert.news.length === 0 && (
                  <p className="text-xs text-slate-500">
                    No recent notes for {player.name}.
                  </p>
                )}
                {player.expert.news.map((note, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      {note.sentiment === "positive" ? (
                        <TrendingUp className="h-3.5 w-3.5 text-[#059669]" />
                      ) : note.sentiment === "negative" ? (
                        <TrendingDown className="h-3.5 w-3.5 text-[#E11D48]" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                      )}
                      <span className="text-xs font-semibold text-slate-200">
                        {note.headline}
                      </span>
                      <span className="ml-auto text-[10px] text-slate-500">
                        {note.source}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-400">
                      {note.body}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SectionTitle({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
      {icon}
      {children}
    </h3>
  );
}

function StatTile({
  label,
  value,
  sub,
  trend,
  accentClass,
  small,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: number;
  accentClass?: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div
        className={cn(
          "num mt-0.5 font-bold text-slate-100",
          small ? "text-sm capitalize" : "text-lg",
          accentClass,
        )}
      >
        {value}
        {sub && (
          <span className="ml-1 text-[10px] font-normal text-slate-500">
            {sub}
          </span>
        )}
      </div>
      {trend !== undefined && (
        <div
          className={cn(
            "num flex items-center gap-0.5 text-[10px] font-medium",
            trend >= 0 ? "text-[#059669]" : "text-[#E11D48]",
          )}
        >
          {trend >= 0 ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {formatPoints(Math.abs(trend))}
        </div>
      )}
    </div>
  );
}
