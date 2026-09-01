import type { StartStatus } from "@/types";

export interface StatusMeta {
  label: string;
  short: string;
  text: string;
  bg: string;
  border: string;
  ring: string;
  dot: string;
  hex: string;
  badge: "start" | "tossup" | "sit";
}

export const STATUS_META: Record<StartStatus, StatusMeta> = {
  "must-start": {
    label: "Must Start",
    short: "START",
    text: "text-[#059669]",
    bg: "bg-[#00F59B]/10",
    border: "border-[#00F59B]/30",
    ring: "ring-[#00F59B]/40",
    dot: "bg-[#00F59B]",
    hex: "#00F59B",
    badge: "start",
  },
  "toss-up": {
    label: "Toss-Up",
    short: "TOSS-UP",
    text: "text-[#B45309]",
    bg: "bg-[#FFB800]/10",
    border: "border-[#FFB800]/30",
    ring: "ring-[#FFB800]/40",
    dot: "bg-[#FFB800]",
    hex: "#FFB800",
    badge: "tossup",
  },
  sit: {
    label: "Sit",
    short: "SIT",
    text: "text-[#E11D48]",
    bg: "bg-[#FF3366]/10",
    border: "border-[#FF3366]/30",
    ring: "ring-[#FF3366]/40",
    dot: "bg-[#FF3366]",
    hex: "#FF3366",
    badge: "sit",
  },
};

export const BET_ACCENT = "#00E5FF";

export const NFL_WEEKS = Array.from({ length: 18 }, (_, i) => i + 1);

export const CURRENT_SEASON = "2026";
