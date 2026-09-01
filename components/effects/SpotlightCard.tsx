"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface SpotlightCardProps extends HTMLMotionProps<"div"> {
  /** Colored edge-glow tint that tracks the cursor (rgba string). */
  tint?: string;
  /** Lift the card on hover with spring physics. */
  lift?: boolean;
  children: React.ReactNode;
}

/**
 * Cursor-following radial spotlight wrapper. Tracks pointer position via CSS
 * custom properties (no re-render) and reveals a white inner glow plus a
 * semantic tint ring on hover. Spring physics per the RosterPulse motion spec.
 */
export function SpotlightCard({
  tint = "rgba(0,245,155,0.35)",
  lift = true,
  className,
  style,
  children,
  ...props
}: SpotlightCardProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  const handleMove = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
      el.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
    },
    [],
  );

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      whileHover={lift ? { y: -3 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{ ["--spot-tint" as string]: tint, ...style }}
      className={cn("group relative overflow-hidden", className)}
      {...props}
    >
      <span
        aria-hidden
        className="spotlight-layer pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      <span
        aria-hidden
        className="spotlight-ring pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 mix-blend-screen transition-opacity duration-500 group-hover:opacity-100"
      />
      {children}
    </motion.div>
  );
}
