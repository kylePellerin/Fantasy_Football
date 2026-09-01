import { NextResponse } from "next/server";
import {
  assembleEspnRoster,
  assembleSleeperRoster,
} from "@/lib/roster-assembler";
import { getCurrentNflWeek } from "@/lib/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/roster?platform=sleeper&username=<name>&leagueId=<id>&week=<n>
//   → fully-assembled, scored roster (real Sleeper data + live odds/ECR/news)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform") ?? "sleeper";
  const username = searchParams.get("username");
  const leagueId = searchParams.get("leagueId");
  const week = Number(searchParams.get("week") ?? String(getCurrentNflWeek()));

  if (platform !== "sleeper") {
    return NextResponse.json(
      { error: "Only the Sleeper roster pipeline is wired up for now." },
      { status: 400 },
    );
  }
  if (!username || !leagueId) {
    return NextResponse.json(
      { error: "`username` and `leagueId` are required." },
      { status: 400 },
    );
  }

  try {
    const roster = await assembleSleeperRoster(username, leagueId, week);
    return NextResponse.json({ roster });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to assemble roster";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

// POST /api/roster  { platform:"espn", leagueId, espnS2, swid, season?, week? }
//   → ESPN roster (cookies sent in the body, never the query string)
export async function POST(request: Request) {
  let body: {
    platform?: string;
    leagueId?: string;
    espnS2?: string;
    swid?: string;
    season?: string;
    week?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const week = Number(body.week ?? getCurrentNflWeek());

  if ((body.platform ?? "espn") !== "espn") {
    return NextResponse.json(
      { error: "POST /api/roster only handles the ESPN pipeline." },
      { status: 400 },
    );
  }
  if (!body.leagueId) {
    return NextResponse.json({ error: "`leagueId` is required." }, { status: 400 });
  }

  try {
    const roster = await assembleEspnRoster(
      {
        leagueId: body.leagueId,
        espnS2: body.espnS2,
        swid: body.swid,
        season: body.season ?? "2026",
      },
      week,
    );
    return NextResponse.json({ roster });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to assemble roster";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
