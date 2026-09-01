"use client";

import * as React from "react";
import {
  Check,
  ClipboardPaste,
  HelpCircle,
  Link2,
  Loader2,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRosterStore } from "@/lib/store";
import { getSeason } from "@/lib/schedule";
import type { LeagueRef } from "@/types";
import { cn } from "@/lib/utils";

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected?: (message: string) => void;
}

export function SettingsSheet({
  open,
  onOpenChange,
  onConnected,
}: SettingsSheetProps) {
  const connectSleeperStore = useRosterStore((s) => s.connectSleeper);
  const connectEspnStore = useRosterStore((s) => s.connectEspn);
  const leagues = useRosterStore((s) => s.leagues);

  const [sleeperUser, setSleeperUser] = React.useState("");
  const [espnS2, setEspnS2] = React.useState("");
  const [swid, setSwid] = React.useState("");
  const [espnLeague, setEspnLeague] = React.useState("");
  const [loading, setLoading] = React.useState<
    null | "sleeper" | "espn" | "espn-id"
  >(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pasteBlob, setPasteBlob] = React.useState("");

  // Callback ref sets the javascript: bookmarklet href when the anchor mounts
  // (it lives inside the ESPN tab, which mounts lazily).
  const setBookmarkletHref = React.useCallback(
    (el: HTMLAnchorElement | null) => {
      el?.setAttribute("href", ESPN_BOOKMARKLET);
    },
    [],
  );

  function applyPastedCookies(text: string) {
    setPasteBlob(text);
    const parsed = parseEspnCookies(text);
    if (parsed.espnS2) setEspnS2(parsed.espnS2);
    if (parsed.swid) setSwid(parsed.swid);
  }

  async function pasteFromClipboard() {
    try {
      const t = await navigator.clipboard.readText();
      if (t) {
        applyPastedCookies(t);
        setError(null);
      }
    } catch {
      setError(
        "Couldn't read the clipboard — paste into the box with Ctrl+V instead.",
      );
    }
  }

  const sleeperCount = leagues.filter((l) => l.platform === "sleeper").length;
  const espnCount = leagues.filter((l) => l.platform === "espn").length;

  function espnCreds() {
    return {
      espnS2: espnS2 || undefined,
      swid: swid || undefined,
      season: getSeason(),
    };
  }

  async function connectSleeper() {
    setError(null);
    setLoading("sleeper");
    try {
      const res = await fetch(
        `/api/sleeper?username=${encodeURIComponent(sleeperUser)}&season=${getSeason()}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to sync Sleeper");
      if (!data.leagues?.length) {
        throw new Error(
          `No ${getSeason()} NFL leagues found for "${sleeperUser}".`,
        );
      }
      connectSleeperStore(sleeperUser, data.leagues);
      onConnected?.(
        `Linked ${data.leagues.length} Sleeper league(s) for ${sleeperUser}.`,
      );
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setLoading(null);
    }
  }

  async function findEspnLeagues() {
    setError(null);
    setLoading("espn");
    try {
      const res = await fetch("/api/espn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leagues", ...espnCreds() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to reach ESPN");
      const found = (data.leagues ?? []) as LeagueRef[];
      if (!found.length) {
        throw new Error(
          "No ESPN football leagues found for those cookies — you can add one by League ID below.",
        );
      }
      connectEspnStore(found, espnCreds());
      onConnected?.(`Linked ${found.length} ESPN league(s).`);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setLoading(null);
    }
  }

  async function addEspnById() {
    setError(null);
    setLoading("espn-id");
    try {
      const res = await fetch("/api/espn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueId: espnLeague, ...espnCreds() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to sync ESPN");
      const league = data.league as LeagueRef;
      connectEspnStore([league], espnCreds());
      onConnected?.(`Linked ESPN league ${league.name}.`);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="scrollbar-thin overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#00F59B]/10 text-[#059669]">
              <Link2 className="h-4 w-4" />
            </div>
            <div>
              <SheetTitle>Connect your accounts</SheetTitle>
              <SheetDescription>
                Link an account once and every league loads automatically — no
                league IDs to hunt down.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="px-6 pb-6">
          <Tabs defaultValue="sleeper">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sleeper">
                Sleeper{sleeperCount ? ` · ${sleeperCount}` : ""}
              </TabsTrigger>
              <TabsTrigger value="espn">
                ESPN{espnCount ? ` · ${espnCount}` : ""}
              </TabsTrigger>
            </TabsList>

            {/* Sleeper */}
            <TabsContent value="sleeper" className="space-y-4">
              <p className="flex items-start gap-2 rounded-lg border border-[#00F59B]/20 bg-[#00F59B]/[0.05] p-2.5 text-[11px] leading-relaxed text-slate-600">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#059669]" />
                Just your public username — we pull every league on your account.
                No password or token.
              </p>
              <Field
                label="Sleeper Username"
                hint="Case-sensitive, e.g. gridironguru."
              >
                <input
                  value={sleeperUser}
                  onChange={(e) => setSleeperUser(e.target.value)}
                  placeholder="e.g. gridironguru"
                  className={inputClass}
                />
              </Field>
              <Button
                className="w-full"
                onClick={connectSleeper}
                disabled={!sleeperUser || loading === "sleeper"}
              >
                {loading === "sleeper" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                Sync all Sleeper leagues
              </Button>
            </TabsContent>

            {/* ESPN */}
            <TabsContent value="espn" className="space-y-4">
              <p className="flex items-start gap-2 rounded-lg border border-[#00E5FF]/20 bg-[#00E5FF]/[0.05] p-2.5 text-[11px] leading-relaxed text-slate-600">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0891B2]" />
                Grab your ESPN cookies with one click — no dev tools — then we
                auto-discover every league you&apos;re in.
              </p>

              {/* Step 1 — bookmarklet */}
              <div className="space-y-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <Zap className="h-3.5 w-3.5 text-[#0891B2]" /> 1-click cookie
                  grabber
                </div>
                <a
                  ref={setBookmarkletHref}
                  href="#"
                  draggable
                  onClick={(e) => e.preventDefault()}
                  className="inline-flex cursor-grab items-center gap-1.5 rounded-lg border border-[#0891B2]/40 bg-[#00E5FF]/10 px-3 py-1.5 text-xs font-semibold text-[#0891B2] active:cursor-grabbing"
                >
                  <Zap className="h-3.5 w-3.5" /> Grab ESPN cookies
                </a>
                <ol className="list-decimal space-y-1 pl-4 text-[10px] leading-relaxed text-slate-500">
                  <li>
                    <span className="font-semibold text-slate-700">Drag</span> the
                    button above onto your browser&apos;s bookmarks bar.
                  </li>
                  <li>
                    Open{" "}
                    <span className="font-semibold text-slate-700">
                      fantasy.espn.com
                    </span>{" "}
                    and make sure you&apos;re signed in.
                  </li>
                  <li>Click the new bookmark — it copies your cookies.</li>
                  <li>Come back here and click Paste from clipboard below.</li>
                </ol>
              </div>

              {/* Step 2 — paste */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">
                    Paste your ESPN cookies
                  </span>
                  <button
                    type="button"
                    onClick={pasteFromClipboard}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0891B2] transition-colors hover:underline"
                  >
                    <ClipboardPaste className="h-3 w-3" /> Paste from clipboard
                  </button>
                </div>
                <textarea
                  value={pasteBlob}
                  onChange={(e) => applyPastedCookies(e.target.value)}
                  placeholder="espn_s2=...; SWID={...}"
                  className={cn(inputClass, "h-16 resize-none py-2")}
                />
                <div className="flex items-center gap-3 text-[10px] font-medium">
                  <CookiePip label="espn_s2" ok={!!espnS2} />
                  <CookiePip label="SWID" ok={!!swid} />
                </div>
              </div>

              <Button
                className="w-full"
                onClick={findEspnLeagues}
                disabled={!swid || loading === "espn"}
              >
                {loading === "espn" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                Find all my ESPN leagues
              </Button>

              {/* Advanced */}
              <details className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                <summary className="cursor-pointer list-none text-[11px] font-medium text-slate-500 transition-colors hover:text-slate-700">
                  Advanced: enter cookies manually or add by league ID
                </summary>
                <div className="mt-3 space-y-3">
                  <Field label="espn_s2">
                    <input
                      value={espnS2}
                      onChange={(e) => setEspnS2(e.target.value)}
                      placeholder="AEB..."
                      className={inputClass}
                    />
                  </Field>
                  <Field label="SWID">
                    <input
                      value={swid}
                      onChange={(e) => setSwid(e.target.value)}
                      placeholder="{XXXXXXXX-...}"
                      className={inputClass}
                    />
                  </Field>
                  <CookieGuide />
                  <div className="border-t border-white/[0.06] pt-3">
                    <Field
                      label="Or add one league by ID"
                      hint="From your league URL (leagueId=...)."
                    >
                      <input
                        value={espnLeague}
                        onChange={(e) => setEspnLeague(e.target.value)}
                        placeholder="e.g. 778812"
                        className={inputClass}
                      />
                    </Field>
                    <Button
                      variant="outline"
                      className="mt-2 w-full"
                      onClick={addEspnById}
                      disabled={!espnLeague || loading === "espn-id"}
                    >
                      {loading === "espn-id" && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      Add this league
                    </Button>
                  </div>
                </div>
              </details>

              <p className="text-[10px] leading-relaxed text-slate-500">
                Cookies are stored locally on this device only.
              </p>
            </TabsContent>
          </Tabs>

          {error && (
            <p className="mt-4 rounded-lg border border-[#FF3366]/30 bg-[#FF3366]/10 px-3 py-2 text-xs text-[#E11D48]">
              {error}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CookieGuide() {
  return (
    <details className="mt-2">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[10px] font-medium text-[#0891B2]">
        <HelpCircle className="h-3 w-3" /> How to find these in 3 clicks
      </summary>
      <ol className="mt-2 list-decimal space-y-1 pl-4 text-[10px] leading-relaxed text-slate-500">
        <li>Sign in at fantasy.espn.com in your browser.</li>
        <li>Open DevTools (F12) → Application → Cookies → espn.com.</li>
        <li>
          Copy the{" "}
          <span className="font-semibold text-slate-700">espn_s2</span> and{" "}
          <span className="font-semibold text-slate-700">SWID</span> values.
        </li>
      </ol>
    </details>
  );
}

// One-click bookmarklet: copies espn_s2 + SWID from ESPN to the clipboard.
const ESPN_BOOKMARKLET =
  "javascript:(function(){function g(n){var m=document.cookie.match(new RegExp('(^|; )'+n+'=([^;]+)'));return m?m[2]:''}var s=g('espn_s2'),w=g('SWID');if(!s||!w){alert('Sign in at fantasy.espn.com first, then click this again.');return}var t='espn_s2='+s+'; SWID='+w;if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){alert('ESPN cookies copied! Go back to RosterPulse and paste.')},function(){prompt('Copy these cookies:',t)})}else{prompt('Copy these cookies:',t)}})();";

function parseEspnCookies(text: string): { espnS2?: string; swid?: string } {
  const espnS2 = text.match(/espn_s2\s*[=:]\s*"?([^";,\s}]+)"?/i)?.[1];
  const swid =
    text.match(/SWID\s*[=:]\s*"?(\{[^}"]+\})"?/i)?.[1] ??
    text.match(/(\{[0-9A-Fa-f]{8}-[0-9A-Fa-f-]+\})/)?.[1];
  return { espnS2, swid };
}

function CookiePip({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1",
        ok ? "text-[#059669]" : "text-slate-400",
      )}
    >
      {ok ? (
        <Check className="h-3 w-3" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-[#cbd5e1]" />
      )}
      {label}
    </span>
  );
}

const inputClass = cn(
  "h-10 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#00F59B]/40",
);

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-700">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[10px] text-slate-500">{hint}</span>}
    </label>
  );
}
