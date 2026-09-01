import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Home, Plane, TrendingUp } from "lucide-react";
import { getEcr } from "@/lib/scrapers/experts";
import { getGameLines } from "@/lib/scrapers/odds";
import { getCurrentNflWeek, getSeason } from "@/lib/schedule";
import { espnHeadshot, getEspnPlayerIndex } from "@/lib/espn";
import { cn } from "@/lib/utils";

// Regenerate at most every 30 min so crawlers get fresh, static-fast HTML.
export const revalidate = 1800;

const POSITIONS = [
  { key: "QB", label: "Quarterback" },
  { key: "RB", label: "Running Back" },
  { key: "WR", label: "Wide Receiver" },
  { key: "TE", label: "Tight End" },
] as const;

const TOP_N = 20;

const ALIAS: Record<string, string> = {
  WSH: "WAS",
  JAC: "JAX",
  LA: "LAR",
  OAK: "LV",
  SD: "LAC",
  STL: "LAR",
  ARZ: "ARI",
};
const norm = (t?: string) => {
  const u = (t ?? "").toUpperCase();
  return ALIAS[u] ?? u;
};

const normName = (s: string) =>
  s
    .toLowerCase()
    .replace(/[.'`]/g, "")
    .replace(/\s+(jr|sr|ii|iii|iv|v)$/i, "")
    .trim();

interface MatchupCtx {
  opp: string;
  isHome: boolean;
  implied: number;
  spread: number;
  total: number;
}

export async function generateMetadata(): Promise<Metadata> {
  const week = getCurrentNflWeek();
  const title = `Week ${week} Fantasy Football Rankings (PPR Start/Sit)`;
  const description = `Free Week ${week} PPR fantasy football rankings for QB, RB, WR and TE — the top 20 at each position with ESPN headshots and this week's game lines (spread, total, implied team points).`;
  return {
    title,
    description,
    alternates: { canonical: "/rankings" },
    openGraph: { title, description, url: "/rankings" },
    twitter: { title, description },
  };
}

function impliedTone(implied: number): string {
  if (implied >= 25) return "text-[#059669]";
  if (implied >= 21) return "text-[#B45309]";
  return "text-[#E11D48]";
}

function fmtSpread(spread: number): string {
  if (spread === 0) return "PK";
  return spread > 0 ? `+${spread}` : `${spread}`;
}

function Face({ id, name }: { id?: number; name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (!id) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-500">
        {initials}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={espnHeadshot(id)}
      alt={name}
      loading="lazy"
      width={36}
      height={36}
      className="h-9 w-9 shrink-0 rounded-full bg-slate-100 object-cover ring-1 ring-black/5"
    />
  );
}

export default async function RankingsPage() {
  const week = getCurrentNflWeek();
  const season = getSeason();
  const [qb, rb, wr, te, lines, espnIndex] = await Promise.all([
    getEcr("QB"),
    getEcr("RB"),
    getEcr("WR"),
    getEcr("TE"),
    getGameLines(week),
    getEspnPlayerIndex(season),
  ]);
  const byPos: Record<string, typeof qb> = { QB: qb, RB: rb, WR: wr, TE: te };

  const ctx = new Map<string, MatchupCtx>();
  for (const l of lines) {
    ctx.set(norm(l.homeTeam), {
      opp: norm(l.awayTeam),
      isHome: true,
      implied: l.homeImpliedTotal,
      spread: l.homeSpread,
      total: l.total,
    });
    ctx.set(norm(l.awayTeam), {
      opp: norm(l.homeTeam),
      isHome: false,
      implied: l.awayImpliedTotal,
      spread: -l.homeSpread,
      total: l.total,
    });
  }

  const updated = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#059669] text-sm font-extrabold text-white">
            R
          </span>
          <span className="text-lg font-bold text-slate-900">
            Roster<span className="text-[#059669]">Pulse</span>
          </span>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#059669] px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#047857]"
        >
          Open the app
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Hero */}
      <header className="mt-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#059669]">
          Week {week} · {updated}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Week {week} Fantasy Football Rankings
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
          Free PPR rankings — the top 20 at every position (QB, RB, WR, TE) with
          player headshots and this week&apos;s game lines from ESPN: spread,
          over/under, and implied team total (a strong proxy for scoring upside).
          Want start/sit calls for <em>your</em> exact roster?{" "}
          <Link href="/" className="font-semibold text-[#059669] underline">
            Connect your Sleeper or ESPN league
          </Link>
          .
        </p>

        {/* Position quick-nav */}
        <nav className="mt-6 flex flex-wrap gap-2">
          {POSITIONS.map((p) => (
            <a
              key={p.key}
              href={`#${p.key.toLowerCase()}`}
              className="rounded-full border border-white/[0.08] bg-panel px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-panel transition-colors hover:border-[#059669]/40 hover:text-[#059669]"
            >
              {p.key} Rankings
            </a>
          ))}
        </nav>
      </header>

      {/* Ranking tables */}
      <div className="mt-10 space-y-12">
        {POSITIONS.map((pos) => {
          const rows = byPos[pos.key]
            .filter((e) => e.team && e.team !== "FA")
            .slice(0, TOP_N);

          return (
            <section key={pos.key} id={pos.key.toLowerCase()} className="scroll-mt-6">
              <h2 className="text-xl font-bold text-slate-900">
                Week {week} {pos.label} ({pos.key}) Rankings — Top {TOP_N}
              </h2>
              {rows.length === 0 ? (
                <p className="mt-3 rounded-xl border border-white/[0.06] bg-panel p-4 text-sm text-slate-500 shadow-panel">
                  Rankings are refreshing — check back in a few minutes.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.06] bg-panel shadow-panel">
                  <table className="w-full min-w-[600px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wide text-slate-500">
                        <th className="w-10 px-3 py-3 font-semibold">#</th>
                        <th className="px-3 py-3 font-semibold">Player</th>
                        <th className="px-3 py-3 font-semibold">Matchup</th>
                        <th className="px-3 py-3 text-center font-semibold">
                          Spread
                        </th>
                        <th className="px-3 py-3 text-center font-semibold">
                          O/U
                        </th>
                        <th className="px-3 py-3 text-right font-semibold">
                          Team Tot
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((e, i) => {
                        const m = ctx.get(norm(e.team));
                        const espn = espnIndex[normName(e.player)];
                        return (
                          <tr
                            key={`${e.player}-${i}`}
                            className="border-b border-white/[0.04] last:border-0 transition-colors hover:bg-white/[0.02]"
                          >
                            <td className="num px-3 py-2.5 font-bold text-slate-400">
                              {i + 1}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-3">
                                <Face id={espn?.id} name={e.player} />
                                <div className="min-w-0">
                                  <div className="truncate font-semibold text-slate-900">
                                    {e.player}
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    {e.team} · {e.positionRank}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              {m ? (
                                <span className="inline-flex items-center gap-1.5 text-slate-600">
                                  {m.isHome ? (
                                    <Home className="h-3.5 w-3.5 text-slate-400" />
                                  ) : (
                                    <Plane className="h-3.5 w-3.5 text-slate-400" />
                                  )}
                                  {m.isHome ? "vs" : "@"} {m.opp}
                                </span>
                              ) : (
                                <span className="text-slate-400">BYE</span>
                              )}
                            </td>
                            <td className="num px-3 py-2.5 text-center text-slate-600">
                              {m ? fmtSpread(m.spread) : "—"}
                            </td>
                            <td className="num px-3 py-2.5 text-center text-slate-600">
                              {m ? m.total.toFixed(1) : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {m ? (
                                <span
                                  className={cn(
                                    "num font-bold",
                                    impliedTone(m.implied),
                                  )}
                                >
                                  {m.implied.toFixed(1)}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <section className="mt-14 overflow-hidden rounded-2xl border border-[#059669]/20 bg-[#059669]/[0.06] p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <TrendingUp className="mt-0.5 h-6 w-6 shrink-0 text-[#059669]" />
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Get start/sit calls for your actual roster
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">
              RosterPulse pulls your live Sleeper or ESPN lineup and scores every
              player 0–100 using projections, betting lines, and expert
              consensus — then flags the exact swaps that raise your projected
              total. Free, and your leagues stay linked.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#059669] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#047857]"
            >
              Connect your league
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-10 border-t border-white/[0.06] pt-6 text-xs leading-relaxed text-slate-500">
        Player order reflects live expert consensus; headshots and game lines
        (spread, over/under, and implied team total) come from ESPN&apos;s public
        feeds. Implied team total is the points a team is projected to score from
        the spread and game total — higher signals a better scoring spot. No
        betting props or point projections are invented. Not affiliated with the
        NFL, ESPN, or Sleeper.
      </footer>
    </main>
  );
}
