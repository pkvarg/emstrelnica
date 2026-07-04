const hits = new Map<string, number[]>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  let timestamps = hits.get(key) ?? [];
  timestamps = timestamps.filter((t) => t > windowStart);

  if (timestamps.length >= limit) {
    hits.set(key, timestamps);
    return { allowed: false, remaining: 0 };
  }

  timestamps.push(now);
  hits.set(key, timestamps);
  return { allowed: true, remaining: limit - timestamps.length };
}

export function getRateLimitEntries() {
  const now = Date.now();
  const entries: { key: string; hits: number; oldestAt: number; newestAt: number }[] = [];
  for (const [key, timestamps] of hits.entries()) {
    if (timestamps.length > 0) {
      entries.push({
        key,
        hits: timestamps.length,
        oldestAt: Math.min(...timestamps),
        newestAt: Math.max(...timestamps),
      });
    }
  }
  return entries.sort((a, b) => b.newestAt - a.newestAt);
}

export function clearRateLimitKey(key: string): boolean {
  return hits.delete(key);
}

export function clearAllRateLimits(): void {
  hits.clear();
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [key, timestamps] of hits.entries()) {
    const fresh = timestamps.filter((t) => t > cutoff);
    if (fresh.length === 0) {
      hits.delete(key);
    } else {
      hits.set(key, fresh);
    }
  }
}, 5 * 60 * 1000);
