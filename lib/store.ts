"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { LeagueRef, Player } from "@/types";
import { getCurrentNflWeek } from "@/lib/schedule";

export type AppMode = "empty" | "demo" | "live";

interface EspnCreds {
  espnS2?: string;
  swid?: string;
  season: string;
}

/** Merge league lists from multiple connects, de-duped by id. */
function mergeLeagues(
  existing: LeagueRef[],
  incoming: LeagueRef[],
): LeagueRef[] {
  const map = new Map(existing.map((l) => [l.id, l]));
  for (const l of incoming) map.set(l.id, l);
  return [...map.values()];
}

interface LineupOverride {
  slot: "starter" | "bench";
  lineupSlot: string;
  lineupOrder: number;
}

interface RosterPulseState {
  mode: AppMode;
  sleeperUsername: string | null;
  espnCreds: EspnCreds | null;
  leagues: LeagueRef[];
  selectedLeagueId: string | null;
  week: number;
  selectedPlayer: Player | null;
  isSettingsOpen: boolean;
  /** Manual lineup edits applied on top of the base roster (Start button). */
  lineupOverrides: Record<string, LineupOverride>;
  /** True once persisted state has rehydrated from localStorage. */
  hasHydrated: boolean;

  loadDemo: () => void;
  connectSleeper: (username: string, leagues: LeagueRef[]) => void;
  connectEspn: (leagues: LeagueRef[], creds: EspnCreds) => void;
  setSelectedLeagueId: (id: string) => void;
  setSelectedPlayer: (player: Player | null) => void;
  setSettingsOpen: (open: boolean) => void;
  applySwap: (incoming: Player, outgoing: Player) => void;
  resetOverrides: () => void;
  reset: () => void;
  setHasHydrated: (v: boolean) => void;
}

export const useRosterStore = create<RosterPulseState>()(
  persist(
    (set) => ({
      mode: "empty",
      sleeperUsername: null,
      espnCreds: null,
      leagues: [],
      selectedLeagueId: null,
      week: getCurrentNflWeek(),
      selectedPlayer: null,
      isSettingsOpen: false,
      lineupOverrides: {},
      hasHydrated: false,

      setHasHydrated: (v) => set({ hasHydrated: v }),

      loadDemo: () =>
        set({ mode: "demo", selectedLeagueId: "demo", lineupOverrides: {} }),

      connectSleeper: (username, leagues) =>
        set((state) => {
          const merged = mergeLeagues(state.leagues, leagues);
          return {
            mode: "live",
            sleeperUsername: username,
            leagues: merged,
            selectedLeagueId: state.selectedLeagueId ?? merged[0]?.id ?? null,
            lineupOverrides: {},
            isSettingsOpen: false,
          };
        }),

      connectEspn: (leagues, creds) =>
        set((state) => {
          const merged = mergeLeagues(state.leagues, leagues);
          return {
            mode: "live",
            espnCreds: creds,
            leagues: merged,
            selectedLeagueId: state.selectedLeagueId ?? merged[0]?.id ?? null,
            lineupOverrides: {},
            isSettingsOpen: false,
          };
        }),

      setSelectedLeagueId: (selectedLeagueId) =>
        set({ selectedLeagueId, lineupOverrides: {} }),
      setSelectedPlayer: (selectedPlayer) => set({ selectedPlayer }),
      setSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),

      applySwap: (incoming, outgoing) =>
        set((state) => ({
          lineupOverrides: {
            ...state.lineupOverrides,
            [incoming.id]: {
              slot: "starter",
              lineupSlot: outgoing.lineupSlot,
              lineupOrder: outgoing.lineupOrder,
            },
            [outgoing.id]: { slot: "bench", lineupSlot: "BN", lineupOrder: 900 },
          },
        })),

      resetOverrides: () => set({ lineupOverrides: {} }),

      reset: () =>
        set({
          mode: "empty",
          sleeperUsername: null,
          espnCreds: null,
          leagues: [],
          selectedLeagueId: null,
          lineupOverrides: {},
        }),
    }),
    {
      name: "rosterpulse-store",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Persist only the linked-account essentials, not transient UI/overrides.
      partialize: (s) => ({
        mode: s.mode,
        sleeperUsername: s.sleeperUsername,
        espnCreds: s.espnCreds,
        leagues: s.leagues,
        selectedLeagueId: s.selectedLeagueId,
      }),
      // Rehydrate manually on the client so SSR and first render stay in sync.
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
