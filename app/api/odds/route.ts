import { NextResponse } from "next/server";
import { getGameLines, getPlayerProps } from "@/lib/scrapers/odds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/odds?week=<n>
//   → game lines (spreads, totals, implied team totals) + player props
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const week = Number(searchParams.get("week") ?? "1");

  if (!Number.isFinite(week) || week < 1 || week > 18) {
    return NextResponse.json(
      { error: "`week` must be between 1 and 18." },
      { status: 400 },
    );
  }

  try {
    const [lines, props] = await Promise.all([
      getGameLines(week),
      getPlayerProps(week),
    ]);
    return NextResponse.json({ week, lines, props });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load odds";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
