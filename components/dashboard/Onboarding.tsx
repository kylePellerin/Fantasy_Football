"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Coins,
  Link2,
  Newspaper,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingProps {
  onConnect: () => void;
  onDemo: () => void;
}

const FEATURES = [
  {
    icon: BarChart3,
    title: "Start Confidence Engine",
    body: "Weighted 0–100 score from betting lines, expert consensus, props & environment.",
  },
  {
    icon: Coins,
    title: "Betting-Implied Points",
    body: "Every player's projection is derived from live sportsbook markets.",
  },
  {
    icon: Sparkles,
    title: "Lineup Optimizer",
    body: "One-click swaps with data-backed reasoning for your exact matchup.",
  },
  {
    icon: Newspaper,
    title: "Scraped Buzz",
    body: "Fresh player news and matchup context pulled from public feeds.",
  },
];

export function Onboarding({ onConnect, onDemo }: OnboardingProps) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-3xl flex-col items-center justify-center px-4 py-12 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00F59B] to-[#00E5FF] text-[#04140d] shadow-[0_0_44px_-4px_rgba(0,245,155,0.7)]"
      >
        <Activity className="h-8 w-8" strokeWidth={2.5} />
        <span className="absolute inset-0 rounded-2xl animate-pulse-ring" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-6 text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl"
      >
        Roster<span className="text-[#059669]">Pulse</span>
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-3 max-w-xl text-sm leading-relaxed text-slate-400"
      >
        Connect your Sleeper or ESPN account to pull every league&apos;s live
        roster, then get betting-backed start/sit calls, a lineup optimizer, and
        waiver targets — all local, all free. No fake data until you link a team.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
      >
        <Button size="lg" onClick={onConnect}>
          <Link2 className="h-4 w-4" />
          Connect Sleeper or ESPN
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button size="lg" variant="outline" onClick={onDemo}>
          <PlayCircle className="h-4 w-4" />
          Explore demo data
        </Button>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.24 }}
        className="mt-4 text-xs text-slate-500"
      >
        No account yet?{" "}
        <Link
          href="/rankings"
          className="font-semibold text-[#059669] underline underline-offset-2"
        >
          Browse this week&apos;s free fantasy rankings
        </Link>
      </motion.p>

      <div className="mt-12 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.06 }}
            className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left backdrop-blur-md transition-colors hover:border-white/[0.12]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#00F59B]/10 text-[#059669]">
              <f.icon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                {f.title}
              </h3>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                {f.body}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
