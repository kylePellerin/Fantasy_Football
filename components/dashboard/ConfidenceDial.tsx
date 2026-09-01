"use client";

import * as React from "react";
import { motion } from "framer-motion";
import type { StartStatus } from "@/types";
import { STATUS_META } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ConfidenceDialProps {
  score: number;
  status: StartStatus;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  className?: string;
}

export function ConfidenceDial({
  score,
  status,
  size = 64,
  strokeWidth = 6,
  showLabel = true,
  className,
}: ConfidenceDialProps) {
  const meta = STATUS_META[status];
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-white/[0.08]"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={meta.hex}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 4px ${meta.hex}66)` }}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("num text-lg font-bold leading-none", meta.text)}>
            {score}
          </span>
          <span className="mt-0.5 text-[8px] font-medium uppercase tracking-wider text-slate-500">
            conf
          </span>
        </div>
      )}
    </div>
  );
}
