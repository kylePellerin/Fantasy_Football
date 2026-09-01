"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const POSITION_RING: Record<string, string> = {
  QB: "ring-rose-500/40",
  RB: "ring-emerald-500/40",
  WR: "ring-sky-500/40",
  TE: "ring-orange-500/40",
  K: "ring-violet-500/40",
  DEF: "ring-slate-500/40",
  FLEX: "ring-teal-500/40",
};

interface PlayerAvatarProps {
  name: string;
  position?: string;
  src?: string;
  size?: number;
  className?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Player headshot with a graceful initials fallback on load error. */
export function PlayerAvatar({
  name,
  position = "FLEX",
  src,
  size = 44,
  className,
}: PlayerAvatarProps) {
  const [failed, setFailed] = React.useState(false);
  const showImage = src && !failed;

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e7ecf3] ring-2",
        POSITION_RING[position] ?? "ring-slate-600/40",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          width={size}
          height={size}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <span
          className="font-semibold text-slate-300"
          style={{ fontSize: size * 0.34 }}
        >
          {initials(name)}
        </span>
      )}
    </div>
  );
}
