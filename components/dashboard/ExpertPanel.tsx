"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Brain,
  Gauge,
  Newspaper,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
import type { Player } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STATUS_META } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ExpertPanelProps {
  players: Player[];
  onSelectPlayer?: (player: Player) => void;
}

export function ExpertPanel({ players, onSelectPlayer }: ExpertPanelProps) {
  const news = React.useMemo(
    () =>
      players
        .flatMap((p) =>
          p.expert.news.map((n) => ({ player: p, note: n })),
        )
        .sort(
          (a, b) =>
            new Date(b.note.timestamp).getTime() -
            new Date(a.note.timestamp).getTime(),
        ),
    [players],
  );

  const ranked = React.useMemo(
    () =>
      [...players]
        .filter((p) => p.slot === "starter")
        .sort((a, b) => a.expert.ecr - b.expert.ecr),
    [players],
  );

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-panel/70 shadow-panel backdrop-blur-xl">
      <div className="flex items-center gap-2 border-b border-white/[0.06] p-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00F59B]/10 text-[#059669]">
          <Brain className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Expert Context & Insights
          </h2>
          <p className="text-[11px] text-slate-500">
            Scraped news · ECR · AI matchup synthesis
          </p>
        </div>
      </div>

      <Tabs defaultValue="insights" className="flex flex-1 flex-col">
        <div className="px-4 pt-3">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="insights">
              <Sparkles className="mr-1 h-3.5 w-3.5" /> Insights
            </TabsTrigger>
            <TabsTrigger value="rankings">
              <Trophy className="mr-1 h-3.5 w-3.5" /> ECR
            </TabsTrigger>
            <TabsTrigger value="news">
              <Newspaper className="mr-1 h-3.5 w-3.5" /> News
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto px-4 pb-4">
          <TabsContent value="insights" className="space-y-2.5">
            {ranked.slice(0, 6).map((p, i) => (
              <motion.button
                key={p.id}
                type="button"
                onClick={() => onSelectPlayer?.(p)}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30, delay: i * 0.05 }}
                className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-left transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-100">
                    {p.name}
                  </span>
                  <span
                    className={cn(
                      "num text-[11px] font-bold",
                      STATUS_META[p.confidence.status].text,
                    )}
                  >
                    {p.confidence.score}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                  {p.expert.narrative}
                </p>
              </motion.button>
            ))}
          </TabsContent>

          <TabsContent value="rankings" className="space-y-1.5">
            {ranked.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPlayer?.(p)}
                className="flex w-full items-center gap-3 rounded-lg border border-transparent px-2 py-2 text-left transition-colors hover:border-white/[0.08] hover:bg-white/[0.03]"
              >
                <span className="num w-6 text-center text-xs font-bold text-slate-500">
                  {i + 1}
                </span>
                <MatchupGradePip grade={p.expert.matchupGrade} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-slate-200">
                    {p.name}
                  </div>
                  <div className="num text-[10px] text-slate-500">
                    {p.expert.positionRank} · σ {p.expert.ecrStdDev.toFixed(1)}
                  </div>
                </div>
                <span className="num rounded border border-white/[0.06] bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
                  ECR {p.expert.ecr}
                </span>
              </button>
            ))}
          </TabsContent>

          <TabsContent value="news" className="space-y-2.5">
            {news.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-500">
                No fresh notes scraped for this roster.
              </p>
            )}
            {news.map(({ player, note }, i) => (
              <motion.button
                key={`${player.id}-${i}`}
                type="button"
                onClick={() => onSelectPlayer?.(player)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30, delay: i * 0.04 }}
                className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-left transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]"
              >
                <div className="mb-1 flex items-center gap-2">
                  <SentimentIcon sentiment={note.sentiment} />
                  <span className="text-[11px] font-semibold text-slate-200">
                    {player.name}
                  </span>
                  <span className="ml-auto text-[10px] text-slate-500">
                    {note.source}
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-300">
                  {note.headline}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                  {note.body}
                </p>
              </motion.button>
            ))}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function MatchupGradePip({ grade }: { grade: number }) {
  const color =
    grade <= 1
      ? "text-[#059669]"
      : grade === 2
        ? "text-teal-600"
        : grade === 3
          ? "text-[#B45309]"
          : grade === 4
            ? "text-orange-600"
            : "text-[#E11D48]";
  return (
    <span className="inline-flex items-center" title={`Matchup grade ${grade}/5`}>
      <Gauge className={cn("h-3.5 w-3.5", color)} />
    </span>
  );
}

function SentimentIcon({ sentiment }: { sentiment: string }) {
  if (sentiment === "positive")
    return <TrendingUp className="h-3.5 w-3.5 text-[#059669]" />;
  if (sentiment === "negative")
    return <TrendingDown className="h-3.5 w-3.5 text-[#E11D48]" />;
  return <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />;
}
