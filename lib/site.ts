// ─────────────────────────────────────────────────────────────────────────────
// Canonical site identity — used by metadata, robots.txt, sitemap, and OG image.
//
// Resolution order:
//   1. NEXT_PUBLIC_SITE_URL   — set this in Vercel once you pick a domain.
//   2. VERCEL_PROJECT_PRODUCTION_URL — auto-set by Vercel to your prod domain.
//   3. localhost fallback for local dev.
// ─────────────────────────────────────────────────────────────────────────────

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");

export const SITE_NAME = "RosterPulse";

export const SITE_TITLE =
  "RosterPulse — Fantasy Football Start/Sit Optimizer";

export const SITE_DESCRIPTION =
  "Free fantasy football start/sit optimizer. Connect your Sleeper or ESPN league for weekly lineup advice powered by real projections, betting lines, and expert consensus.";
