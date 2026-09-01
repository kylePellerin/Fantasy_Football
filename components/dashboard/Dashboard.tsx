"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  LayoutGrid,
  Loader2,
  RotateCcw,
  Users,
} from "lucide-react";
import type { Player, Roster, WaiverAdd } from "@/types";
import { useRosterStore } from "@/lib/store";
import { buildMockRoster, MOCK_WAIVERS } from "@/lib/mock-data";
import { optimizeLineup } from "@/lib/optimizer";
import { sortLineup } from "@/lib/lineup";
import { TopNav } from "@/components/dashboard/TopNav";
import { MatchupHeader } from "@/components/dashboard/MatchupHeader";
import { RosterCard } from "@/components/dashboard/RosterCard";
import { ExpertPanel } from "@/components/dashboard/ExpertPanel";
import { SwapSuggestions } from "@/components/dashboard/SwapSuggestions";
import { WaiverWire } from "@/components/dashboard/WaiverWire";
import { Onboarding } from "@/components/dashboard/Onboarding";
import { PlayerDetailModal } from "@/components/Modals/PlayerDetailModal";
import { SettingsSheet } from "@/components/Modals/SettingsSheet";
import { Button } from "@/components/ui/button";

/** Celebratory particle burst for high-impact optimizer swings. */
async function fireSwapConfetti() {
  try {
    const confetti = (await import("canvas-confetti")).default;
    const colors = ["#00F59B", "#00E5FF", "#FFB800"];
    confetti({
      particleCount: 90,
      spread: 72,
      startVelocity: 42,
      ticks: 200,
      scalar: 0.9,
      origin: { y: 0.72 },
      colors,
    });
  } catch {
    /* confetti is a non-critical visual enhancement */
  }
}

/** Apply manual Start-button swaps on top of the base roster. */
function applyOverrides(
  roster: Roster,
  overrides: Record<string, { slot: "starter" | "bench"; lineupSlot: string; lineupOrder: number }>,
): Roster {
  if (Object.keys(overrides).length === 0) return roster;
  return {
    ...roster,
    players: roster.players.map((p) => {
      const o = overrides[p.id];
      return o ? { ...p, slot: o.slot, lineupSlot: o.lineupSlot, lineupOrder: o.lineupOrder } : p;
    }),
  };
}

export function Dashboard() {
  const {
    mode,
    sleeperUsername,
    espnCreds,
    leagues,
    selectedLeagueId,
    week,
    selectedPlayer,
    isSettingsOpen,
    lineupOverrides,
    hasHydrated,
    loadDemo,
    setSelectedLeagueId,
    setSelectedPlayer,
    setSettingsOpen,
    applySwap,
    resetOverrides,
    reset,
  } = useRosterStore();

  const [toast, setToast] = React.useState<string | null>(null);

  function showToast(msg: string, ms = 2600) {
    setToast(msg);
    window.setTimeout(() => setToast(null), ms);
  }

  // Restore linked accounts/leagues from localStorage after mount.
  React.useEffect(() => {
    useRosterStore.persist.rehydrate();
  }, []);

  // ── Live roster (real Sleeper / ESPN data) ─────────────────────────────────
  const selectedLeague =
    leagues.find((l) => l.id === selectedLeagueId) ?? null;
  const platform = selectedLeague?.platform ?? "sleeper";

  const rosterQuery = useQuery({
    queryKey: ["roster", platform, sleeperUsername, selectedLeagueId, week],
    enabled:
      mode === "live" &&
      !!selectedLeagueId &&
      (platform === "espn" ? !!espnCreds : !!sleeperUsername),
    queryFn: async () => {
      let res: Response;
      if (platform === "espn") {
        res = await fetch("/api/roster", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platform: "espn",
            leagueId: selectedLeagueId,
            espnS2: espnCreds?.espnS2,
            swid: espnCreds?.swid,
            season: espnCreds?.season,
            week,
          }),
        });
      } else {
        const params = new URLSearchParams({
          platform: "sleeper",
          username: sleeperUsername ?? "",
          leagueId: selectedLeagueId ?? "",
          week: String(week),
        });
        res = await fetch(`/api/roster?${params.toString()}`);
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load roster");
      return data.roster as Roster;
    },
  });

  const waiverQuery = useQuery({
    queryKey: ["waivers", platform, sleeperUsername, selectedLeagueId],
    enabled: mode === "live" && platform === "sleeper",
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sleeperUsername) params.set("username", sleeperUsername);
      if (selectedLeagueId) params.set("leagueId", selectedLeagueId);
      const res = await fetch(`/api/waivers?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load waivers");
      return data.waivers as WaiverAdd[];
    },
  });

  const baseRoster: Roster | null =
    mode === "demo" ? buildMockRoster(undefined, week) : rosterQuery.data ?? null;

  const roster = baseRoster ? applyOverrides(baseRoster, lineupOverrides) : null;
  const optimizer = roster ? optimizeLineup(roster.players) : null;
  const waivers = mode === "demo" ? MOCK_WAIVERS : waiverQuery.data ?? [];

  const recommendedIds = React.useMemo(
    () => new Set(optimizer?.swaps.map((s) => s.benchPlayer.id) ?? []),
    [optimizer],
  );
  const appliedIds = React.useMemo(
    () =>
      new Set(
        Object.entries(lineupOverrides)
          .filter(([, o]) => o.slot === "starter")
          .map(([id]) => id),
      ),
    [lineupOverrides],
  );

  // Hold rendering until persisted state rehydrates (prevents an SSR flash).
  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#059669]" />
      </div>
    );
  }

  function selectById(id: string) {
    const p = roster?.players.find((pl) => pl.id === id);
    if (p) setSelectedPlayer(p);
  }

  function handleApplySwap(incoming: Player, outgoing: Player) {
    applySwap(incoming, outgoing);
    const swap = optimizer?.swaps.find((s) => s.benchPlayer.id === incoming.id);
    const gain = swap?.pointsDelta ?? 0;
    if (gain >= 2.5) fireSwapConfetti();
    showToast(
      `Started ${incoming.name} over ${outgoing.name}.` +
        (gain >= 2.5 ? ` +${gain.toFixed(1)} projected pts` : ""),
    );
  }

  function handleRefresh() {
    if (mode === "live") {
      rosterQuery.refetch();
      waiverQuery.refetch();
    }
    showToast("Re-syncing rosters, betting lines & ECR…");
  }

  const commonNav = (
    <TopNav
      mode={mode}
      sleeperUsername={sleeperUsername}
      leagues={leagues}
      selectedLeagueId={selectedLeagueId}
      week={week}
      isRefreshing={rosterQuery.isFetching}
      onLeagueChange={setSelectedLeagueId}
      onRefresh={handleRefresh}
      onOpenSettings={() => setSettingsOpen(true)}
      onReset={reset}
    />
  );

  const settingsAndModals = (
    <>
      <PlayerDetailModal
        player={selectedPlayer}
        open={selectedPlayer !== null}
        onOpenChange={(open) => !open && setSelectedPlayer(null)}
      />
      <SettingsSheet
        open={isSettingsOpen}
        onOpenChange={setSettingsOpen}
        onConnected={(msg) => showToast(msg, 3200)}
      />
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-white/[0.1] bg-panel/90 px-4 py-2 text-xs font-medium text-slate-200 shadow-[0_8px_40px_-8px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  // ── Empty / onboarding ─────────────────────────────────────────────────────
  if (mode === "empty") {
    return (
      <div className="min-h-screen">
        {commonNav}
        <Onboarding
          onConnect={() => setSettingsOpen(true)}
          onDemo={loadDemo}
        />
        {settingsAndModals}
      </div>
    );
  }

  // ── Live loading / error ───────────────────────────────────────────────────
  if (mode === "live" && rosterQuery.isLoading) {
    return (
      <div className="min-h-screen">
        {commonNav}
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-[#059669]" />
          <p className="text-sm">Assembling roster from live odds &amp; ECR…</p>
        </div>
        {settingsAndModals}
      </div>
    );
  }

  if (mode === "live" && rosterQuery.isError) {
    return (
      <div className="min-h-screen">
        {commonNav}
        <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FF3366]/10 text-[#E11D48]">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">
              Couldn&apos;t load this roster
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {(rosterQuery.error as Error)?.message}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => rosterQuery.refetch()}>
              Retry
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSettingsOpen(true)}>
              Change league
            </Button>
          </div>
        </div>
        {settingsAndModals}
      </div>
    );
  }

  if (!roster || !optimizer) {
    return (
      <div className="min-h-screen">
        {commonNav}
        {settingsAndModals}
      </div>
    );
  }

  const lineup = sortLineup(roster.players);
  const starters = lineup.filter((p) => p.slot === "starter");
  const bench = lineup.filter((p) => p.slot === "bench");
  const hasEdits = appliedIds.size > 0;

  return (
    <div className="min-h-screen">
      {commonNav}

      <main className="mx-auto max-w-[1400px] px-4 py-6 lg:px-6">
        <MatchupHeader
          matchup={roster.matchup}
          projectedGain={optimizer.projectedGain}
        />

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: lineup + optimizer + waivers (2/3) */}
          <div className="space-y-6 lg:col-span-2">
            <SwapSuggestions
              swaps={optimizer.swaps}
              projectedGain={optimizer.projectedGain}
              onSelectPlayer={selectById}
              onApplySwap={handleApplySwap}
              appliedIds={appliedIds}
            />

            {/* Starting lineup */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <LayoutGrid className="h-4 w-4 text-[#059669]" />
                  Starting Lineup
                  <span className="num rounded-full border border-white/[0.06] bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium text-slate-400">
                    {starters.length}
                  </span>
                </h2>
                {hasEdits && (
                  <button
                    type="button"
                    onClick={resetOverrides}
                    className="flex items-center gap-1 text-[11px] font-medium text-slate-400 transition-colors hover:text-[#059669]"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Undo edits
                  </button>
                )}
              </div>
              <div className="space-y-2.5">
                {starters.map((p, i) => (
                  <RosterCard
                    key={p.id}
                    player={p}
                    index={i}
                    slotLabel={p.lineupSlot}
                    onSelect={setSelectedPlayer}
                    recommended={recommendedIds.has(p.id)}
                  />
                ))}
              </div>
            </section>

            {/* Bench */}
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Users className="h-4 w-4 text-slate-400" />
                Bench
                <span className="num rounded-full border border-white/[0.06] bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium text-slate-400">
                  {bench.length}
                </span>
              </h2>
              <div className="space-y-2.5">
                {bench.map((p, i) => (
                  <RosterCard
                    key={p.id}
                    player={p}
                    index={i}
                    slotLabel="BN"
                    onSelect={setSelectedPlayer}
                    recommended={recommendedIds.has(p.id)}
                  />
                ))}
              </div>
            </section>

            {platform === "sleeper" && (
              <WaiverWire
                waivers={waivers}
                loading={mode === "live" && waiverQuery.isLoading}
              />
            )}
          </div>

          {/* Right: expert context + player news (1/3) */}
          <div className="lg:sticky lg:top-[76px] lg:h-[calc(100vh-100px)]">
            <ExpertPanel
              players={roster.players}
              onSelectPlayer={setSelectedPlayer}
            />
          </div>
        </div>
      </main>

      {settingsAndModals}
    </div>
  );
}
