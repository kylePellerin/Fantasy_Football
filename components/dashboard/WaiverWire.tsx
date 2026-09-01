"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { PlusCircle, Sprout, TrendingUp } from "lucide-react";
import type { WaiverAdd } from "@/types";
import { PlayerAvatar } from "@/components/dashboard/PlayerAvatar";
import { cn } from "@/lib/utils";

interface WaiverWireProps {
  waivers: WaiverAdd[];
  loading?: boolean;
}

function formatAdds(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function upsideTone(upside: number): string {
  if (upside >= 80) return "text-[#047857] border-[#00F59B]/30 bg-[#00F59B]/12";
  if (upside >= 65) return "text-teal-700 border-teal-500/30 bg-teal-500/10";
  return "text-[#B45309] border-[#FFB800]/30 bg-[#FFB800]/12";
}

export function WaiverWire({ waivers, loading = false }: WaiverWireProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-panel/70 p-4 shadow-panel backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00F59B]/10 text-[#059669]">
            <Sprout className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              Waiver Wire Targets
            </h2>
            <p className="text-[11px] text-slate-500">
              Trending adds ranked by long-term upside
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]"
            />
          ))}
        </div>
      ) : waivers.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-500">
          No trending waiver adds available right now.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {waivers.map((w, i) => (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30, delay: i * 0.05 }}
              className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition-colors hover:border-white/[0.12]"
            >
              <PlayerAvatar
                name={w.name}
                position={w.position}
                src={w.avatarUrl}
                size={40}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold text-slate-100">
                    {w.name}
                  </span>
                  <span className="num text-[10px] font-medium text-slate-500">
                    {w.position} · {w.team}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full border px-1.5 py-0.5 text-[9px] font-semibold",
                      upsideTone(w.upside),
                    )}
                  >
                    {w.tag}
                  </span>
                  <span className="num inline-flex items-center gap-0.5 text-[10px] text-slate-500">
                    <TrendingUp className="h-3 w-3" />
                    {formatAdds(w.addCount)} adds
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <span className="num text-sm font-bold text-[#059669]">
                  {w.upside}
                </span>
                <span className="text-[8px] uppercase tracking-wide text-slate-500">
                  upside
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
