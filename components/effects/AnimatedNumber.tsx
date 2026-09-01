"use client";

import * as React from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * Spring-physics numeric counter. Animates 0 → value on mount and re-springs
 * whenever `value` changes, giving the "live feed" ticker feel used across
 * projections, confidence scores, and betting readouts.
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: AnimatedNumberProps) {
  const spring = useSpring(0, { stiffness: 120, damping: 26, mass: 0.8 });
  const text = useTransform(
    spring,
    (v) => `${prefix}${v.toFixed(decimals)}${suffix}`,
  );

  React.useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span className={className}>{text}</motion.span>;
}
