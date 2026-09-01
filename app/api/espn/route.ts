import { NextResponse } from "next/server";
import { espnLeagueRef, fetchEspnLeague, listEspnLeagues } from "@/lib/espn";
import type { EspnCredentials } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/espn  { leagueId, espnS2?, swid?, season? }
//   → league summary + teams (private leagues need cookies)
export async function POST(request: Request) {
  let body: Partial<EspnCredentials> & { action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Account-wide discovery: list every ESPN league from the SWID cookie — no
  // league IDs required.
  if (body.action === "leagues") {
    try {
      const leagues = await listEspnLeagues({
        leagueId: "",
        espnS2: body.espnS2,
        swid: body.swid,
        season: body.season ?? "2026",
      });
      return NextResponse.json({ leagues });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to reach ESPN";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  if (!body.leagueId) {
    return NextResponse.json(
      { error: "`leagueId` is required." },
      { status: 400 },
    );
  }

  const creds: EspnCredentials = {
    leagueId: body.leagueId,
    espnS2: body.espnS2,
    swid: body.swid,
    season: body.season ?? "2026",
  };

  try {
    const league = await fetchEspnLeague(creds);
    return NextResponse.json({
      league: espnLeagueRef(league),
      currentWeek: league.status?.currentMatchupPeriod ?? 1,
      teams: (league.teams ?? []).map((t) => ({
        id: t.id,
        name: t.name ?? `${t.location ?? ""} ${t.nickname ?? ""}`.trim(),
        abbrev: t.abbrev,
        record: t.record?.overall,
        rosterSize: t.roster?.entries?.length ?? 0,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reach ESPN";
    const status = message.includes("private") ? 401 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

// Allow a simple GET for public leagues via query params.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get("leagueId");
  const season = searchParams.get("season") ?? "2026";
  if (!leagueId) {
    return NextResponse.json(
      { error: "`leagueId` query param is required." },
      { status: 400 },
    );
  }
  try {
    const league = await fetchEspnLeague({ leagueId, season });
    return NextResponse.json({
      league: espnLeagueRef(league),
      currentWeek: league.status?.currentMatchupPeriod ?? 1,
      teamCount: league.teams?.length ?? 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reach ESPN";
    const status = message.includes("private") ? 401 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
