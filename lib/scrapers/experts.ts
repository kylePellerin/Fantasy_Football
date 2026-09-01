import axios from "axios";
import * as cheerio from "cheerio";
import { cached } from "@/lib/cache";
import type { NewsNote } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Expert Consensus Rankings (ECR) + player news — free web-scraping.
//
// Primary source:  FantasyPros public ECR pages (Cheerio parse).
// News source:     ESPN's public news feed (no key).
// Fallback:        deterministic ranks so the optimizer always has ECR input.
// ─────────────────────────────────────────────────────────────────────────────

export interface EcrEntry {
  player: string;
  team: string;
  position: string;
  ecr: number;
  positionRank: string;
  stdDev: number;
}

const FANTASYPROS_ECR: Record<string, string> = {
  QB: "https://www.fantasypros.com/nfl/rankings/qb.php",
  RB: "https://www.fantasypros.com/nfl/rankings/ppr-rb.php",
  WR: "https://www.fantasypros.com/nfl/rankings/ppr-wr.php",
  TE: "https://www.fantasypros.com/nfl/rankings/ppr-te.php",
};

/** Coerce a possibly-string scraped value into a finite number. */
function toNum(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Scrape FantasyPros ECR for a position. The page embeds ranking data in an
 * `ecrData` JS object; we parse that when present and fall back to table rows.
 */
export async function scrapeFantasyProsEcr(
  position: keyof typeof FANTASYPROS_ECR,
): Promise<EcrEntry[]> {
  const url = FANTASYPROS_ECR[position];
  const { data: html } = await axios.get<string>(url, {
    timeout: 12_000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; RosterPulse/1.0; +local)",
      Accept: "text/html",
    },
  });

  // Preferred: embedded JSON blob.
  const jsonMatch = html.match(/var\s+ecrData\s*=\s*(\{[\s\S]*?\});/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]) as {
        players?: Array<{
          player_name: string;
          player_team_id: string;
          pos_rank: string;
          rank_ecr: number | string;
          rank_std?: number | string;
        }>;
      };
      const players = parsed.players ?? [];
      if (players.length) {
        return players.map((p, i) => ({
          player: p.player_name,
          team: p.player_team_id,
          position,
          ecr: toNum(p.rank_ecr, i + 1),
          positionRank: p.pos_rank,
          stdDev: toNum(p.rank_std, 1.5),
        }));
      }
    } catch {
      // fall through to table parse
    }
  }

  // Fallback: parse the ranking table rows.
  const $ = cheerio.load(html);
  const entries: EcrEntry[] = [];
  $("table#ranking-table tbody tr, table.player-table tbody tr").each(
    (i, el) => {
      const name = $(el).find(".player-cell a, .player-name a").first().text().trim();
      if (!name) return;
      entries.push({
        player: name,
        team: $(el).find(".player-cell small").first().text().trim(),
        position,
        ecr: i + 1,
        positionRank: `${position}${i + 1}`,
        stdDev: 1.5,
      });
    },
  );
  if (!entries.length) throw new Error(`No ECR rows parsed for ${position}`);
  return entries;
}

interface EspnNewsFeed {
  articles?: Array<{
    headline: string;
    description?: string;
    published?: string;
    links?: { web?: { href?: string } };
  }>;
}

/** Pull recent NFL news headlines from ESPN's public feed. */
export async function scrapeEspnNews(limit = 12): Promise<NewsNote[]> {
  const { data } = await axios.get<EspnNewsFeed>(
    "https://site.api.espn.com/apis/site/v2/sports/football/nfl/news",
    { timeout: 10_000, headers: { Accept: "application/json" } },
  );
  return (data.articles ?? []).slice(0, limit).map((a) => ({
    headline: a.headline,
    body: a.description ?? "",
    source: "ESPN",
    timestamp: a.published ?? new Date().toISOString(),
    sentiment: inferSentiment(`${a.headline} ${a.description ?? ""}`),
  }));
}

function inferSentiment(text: string): NewsNote["sentiment"] {
  const t = text.toLowerCase();
  if (/(out|injur|doubtful|questionable|ruled out|hamstring|concussion)/.test(t))
    return "negative";
  if (/(return|activated|cleared|breakout|career-high|full go|upgrade)/.test(t))
    return "positive";
  return "neutral";
}

function generateFallbackEcr(
  position: keyof typeof FANTASYPROS_ECR,
): EcrEntry[] {
  return Array.from({ length: 30 }, (_, i) => ({
    player: `${position} Player ${i + 1}`,
    team: "FA",
    position,
    ecr: i + 1,
    positionRank: `${position}${i + 1}`,
    stdDev: 1 + (i % 4) * 0.6,
  }));
}

/** Cached ECR for a position, resilient to scrape failures. */
export async function getEcr(
  position: keyof typeof FANTASYPROS_ECR,
): Promise<EcrEntry[]> {
  return cached(
    `ecr_${position}`,
    async () => {
      try {
        return await scrapeFantasyProsEcr(position);
      } catch {
        return generateFallbackEcr(position);
      }
    },
    3 * 60 * 60 * 1000, // 3h TTL
  );
}

/** Cached news feed. */
export async function getNews(): Promise<NewsNote[]> {
  return cached(
    "espn_news",
    async () => {
      try {
        return await scrapeEspnNews();
      } catch {
        return [];
      }
    },
    20 * 60 * 1000, // 20 min TTL
  );
}
