import { NextResponse } from "next/server";
import { getWaiverRecommendations } from "@/lib/waivers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/waivers?username=<name>&leagueId=<id>
//   → trending waiver adds weighted toward long-term upside
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username") ?? undefined;
  const leagueId = searchParams.get("leagueId") ?? undefined;
  const limit = Number(searchParams.get("limit") ?? "6");

  try {
    const waivers = await getWaiverRecommendations({
      username,
      leagueId,
      limit,
    });
    return NextResponse.json({ waivers });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load waiver adds";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
