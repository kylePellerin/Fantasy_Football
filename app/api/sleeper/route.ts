import { NextResponse } from "next/server";
import {
  getSleeperMatchups,
  getSleeperRosters,
  listSleeperLeagueRefs,
} from "@/lib/sleeper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/sleeper?username=<name>&season=2026
//   → resolve user + list leagues
// GET /api/sleeper?leagueId=<id>&week=<n>
//   → rosters + matchups for a league
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  const season = searchParams.get("season") ?? "2026";
  const leagueId = searchParams.get("leagueId");
  const week = Number(searchParams.get("week") ?? "1");

  try {
    if (leagueId) {
      const [rosters, matchups] = await Promise.all([
        getSleeperRosters(leagueId),
        getSleeperMatchups(leagueId, week),
      ]);
      return NextResponse.json({ leagueId, week, rosters, matchups });
    }

    if (!username) {
      return NextResponse.json(
        { error: "Provide a `username` or a `leagueId`." },
        { status: 400 },
      );
    }

    const { user, leagues } = await listSleeperLeagueRefs(username, season);
    return NextResponse.json({
      user: {
        id: user.user_id,
        username: user.username,
        displayName: user.display_name,
      },
      leagues,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to reach Sleeper";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
