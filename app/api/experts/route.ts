import { NextResponse } from "next/server";
import { getEcr, getNews } from "@/lib/scrapers/experts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_POSITIONS = ["QB", "RB", "WR", "TE"] as const;
type ValidPosition = (typeof VALID_POSITIONS)[number];

// GET /api/experts?position=WR   → ECR for a position
// GET /api/experts?news=1        → recent scraped news
// GET /api/experts               → ECR for all positions + news
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const position = searchParams.get("position")?.toUpperCase();
  const newsOnly = searchParams.get("news");

  try {
    if (newsOnly) {
      return NextResponse.json({ news: await getNews() });
    }

    if (position) {
      if (!VALID_POSITIONS.includes(position as ValidPosition)) {
        return NextResponse.json(
          { error: `position must be one of ${VALID_POSITIONS.join(", ")}` },
          { status: 400 },
        );
      }
      const ecr = await getEcr(position as ValidPosition);
      return NextResponse.json({ position, ecr });
    }

    const [qb, rb, wr, te, news] = await Promise.all([
      getEcr("QB"),
      getEcr("RB"),
      getEcr("WR"),
      getEcr("TE"),
      getNews(),
    ]);
    return NextResponse.json({ ecr: { QB: qb, RB: rb, WR: wr, TE: te }, news });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load expert data";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
