import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// Local file-system cache manager
//
// Zero-config JSON cache used to avoid hammering free public endpoints
// (Sleeper players DB, betting scrapes, ECR pages). Files live in `.cache/`
// locally, but fall back to the OS temp dir on read-only serverless hosts
// (e.g. Vercel, where only /tmp is writable) so deploys don't crash on write.
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_DIR = process.env.CACHE_DIR
  ? path.resolve(process.env.CACHE_DIR)
  : process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
    ? path.join(os.tmpdir(), "rosterpulse-cache")
    : path.join(process.cwd(), ".cache");

interface CacheEnvelope<T> {
  createdAt: number;
  ttlMs: number;
  data: T;
}

async function ensureDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

function keyToFile(key: string): string {
  const safe = key.replace(/[^a-z0-9_-]/gi, "_");
  return path.join(CACHE_DIR, `${safe}.json`);
}

/** Read a cached value if present and not expired. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(keyToFile(key), "utf8");
    const env = JSON.parse(raw) as CacheEnvelope<T>;
    if (Date.now() - env.createdAt > env.ttlMs) return null;
    return env.data;
  } catch {
    return null;
  }
}

/** Write a value to the cache with a TTL (default 1 hour). */
export async function cacheSet<T>(
  key: string,
  data: T,
  ttlMs = 60 * 60 * 1000,
): Promise<void> {
  await ensureDir();
  const env: CacheEnvelope<T> = { createdAt: Date.now(), ttlMs, data };
  await fs.writeFile(keyToFile(key), JSON.stringify(env), "utf8");
}

/**
 * Return the cached value, or compute + persist it on a miss.
 * Falls back to stale cache if the loader throws (best-effort resilience).
 */
export async function cached<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs = 60 * 60 * 1000,
): Promise<T> {
  const hit = await cacheGet<T>(key);
  if (hit !== null) return hit;

  try {
    const fresh = await loader();
    await cacheSet(key, fresh, ttlMs);
    return fresh;
  } catch (err) {
    // On failure, serve stale data if any exists rather than hard-failing.
    const stale = await readStale<T>(key);
    if (stale !== null) return stale;
    throw err;
  }
}

async function readStale<T>(key: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(keyToFile(key), "utf8");
    return (JSON.parse(raw) as CacheEnvelope<T>).data;
  } catch {
    return null;
  }
}

export async function cacheClear(key?: string): Promise<void> {
  if (key) {
    await fs.rm(keyToFile(key), { force: true });
    return;
  }
  await fs.rm(CACHE_DIR, { recursive: true, force: true });
}
