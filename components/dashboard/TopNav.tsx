"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Activity,
  CalendarDays,
  LogOut,
  RefreshCw,
  Settings2,
} from "lucide-react";
import type { AppMode } from "@/lib/store";
import type { LeagueRef } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface TopNavProps {
  mode: AppMode;
  sleeperUsername: string | null;
  leagues: LeagueRef[];
  selectedLeagueId: string | null;
  week: number;
  isRefreshing?: boolean;
  onLeagueChange: (id: string) => void;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onReset: () => void;
}

const PLATFORM_LABEL: Record<string, string> = {
  sleeper: "Sleeper",
  espn: "ESPN",
};

export function TopNav({
  mode,
  sleeperUsername,
  leagues,
  selectedLeagueId,
  week,
  isRefreshing = false,
  onLeagueChange,
  onRefresh,
  onOpenSettings,
  onReset,
}: TopNavProps) {
  const connected = mode !== "empty";

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-canvas/80 backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#00F59B]/25 to-transparent" />
      <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 py-3 lg:px-6">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#00F59B] to-[#00E5FF] text-[#04140d] shadow-[0_0_22px_-2px_rgba(0,245,155,0.7)]">
            <Activity className="h-5 w-5" strokeWidth={2.5} />
            <span className="absolute inset-0 rounded-xl animate-pulse-ring" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold leading-none text-slate-50">
              Roster<span className="text-[#059669]">Pulse</span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
              Start / Sit Engine
            </p>
          </div>
        </div>

        {connected && (
          <>
            {/* League selector */}
            <div className="ml-2 w-52">
              {mode === "demo" ? (
                <div className="flex h-10 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-slate-200">
                  <span className="rounded bg-[#FFB800]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#B45309]">
                    DEMO
                  </span>
                  Sample League
                </div>
              ) : (
                <Select
                  value={selectedLeagueId ?? undefined}
                  onValueChange={onLeagueChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select league" />
                  </SelectTrigger>
                  <SelectContent>
                    {leagues.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[9px] font-bold",
                              l.platform === "sleeper"
                                ? "bg-[#00F59B]/15 text-[#059669]"
                                : "bg-[#FF3366]/15 text-[#E11D48]",
                            )}
                          >
                            {PLATFORM_LABEL[l.platform]}
                          </span>
                          {l.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Current week (read-only) */}
            <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
              <CalendarDays className="h-4 w-4 text-[#059669]" />
              <span className="num text-xs font-bold text-slate-100">
                Week {week}
              </span>
              <span className="hidden text-[10px] uppercase tracking-wide text-slate-500 md:inline">
                · current
              </span>
            </div>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          {connected && sleeperUsername && (
            <span className="hidden items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 md:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00F59B] shadow-[0_0_8px_rgba(0,245,155,0.8)]" />
              {sleeperUsername}
            </span>
          )}
          {connected && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <motion.span
                animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
                transition={
                  isRefreshing
                    ? { repeat: Infinity, duration: 1, ease: "linear" }
                    : { duration: 0.2 }
                }
                className="inline-flex"
              >
                <RefreshCw className="h-4 w-4" />
              </motion.span>
              <span className="hidden md:inline">Sync</span>
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onOpenSettings}>
            <Settings2 className="h-4 w-4" />
          </Button>
          {connected && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onReset}
              title="Disconnect"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
