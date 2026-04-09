/**
 * Simple client-side cache for API responses.
 * Avoids re-fetching the same data when navigating between pages.
 * Cache entries expire after `ttl` milliseconds (default 60s).
 */

type CacheEntry = {
  data: unknown;
  timestamp: number;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

const DEFAULT_TTL = 60_000; // 60 seconds

export async function cachedFetch<T>(
  url: string,
  options?: { ttl?: number; bust?: boolean }
): Promise<T> {
  const ttl = options?.ttl ?? DEFAULT_TTL;

  // Return cached if fresh
  if (!options?.bust) {
    const cached = cache.get(url);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data as T;
    }
  }

  // Deduplicate in-flight requests
  const existing = inflight.get(url);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      return res.json();
    })
    .then((data) => {
      cache.set(url, { data, timestamp: Date.now() });
      inflight.delete(url);
      return data as T;
    })
    .catch((err) => {
      inflight.delete(url);
      throw err;
    });

  inflight.set(url, promise);
  return promise;
}

/** Invalidate a specific URL or all entries */
export function invalidateCache(url?: string) {
  if (url) {
    cache.delete(url);
  } else {
    cache.clear();
  }
}

/** Invalidate all entries matching a prefix */
export function invalidateCachePrefix(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}
