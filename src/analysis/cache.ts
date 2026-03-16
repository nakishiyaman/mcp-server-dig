/**
 * TTL-based analysis result cache with LRU eviction.
 * Designed for session-level caching of expensive analysis functions
 * (e.g., analyzeHotspotsAndChurn, analyzeContributors).
 */

import { logger } from "../logger.js";

const DEFAULT_TTL_MS = 60_000;
const DEFAULT_MAX_ENTRIES = 100;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  lastAccessed: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  evictions: number;
}

export class AnalysisCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(options?: { ttlMs?: number; maxEntries?: number }) {
    this.ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
    this.maxEntries = options?.maxEntries ?? DEFAULT_MAX_ENTRIES;
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      logger.debug("cache miss", { key, reason: "not_found" });
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      logger.debug("cache miss", { key, reason: "expired" });
      return undefined;
    }

    entry.lastAccessed = Date.now();
    this.hits++;
    logger.debug("cache hit", { key });
    return entry.value as T;
  }

  set<T>(key: string, value: T): void {
    // Evict LRU if at capacity
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      this.evictLRU();
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
      lastAccessed: Date.now(),
    });
  }

  clear(): void {
    this.store.clear();
  }

  stats(): CacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.store.size,
      evictions: this.evictions,
    };
  }

  private evictLRU(): void {
    let oldestKey: string | undefined;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.store) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey !== undefined) {
      this.store.delete(oldestKey);
      this.evictions++;
    }
  }
}

/**
 * Build a stable cache key from function name and arguments.
 */
export function buildCacheKey(
  functionName: string,
  repoPath: string,
  options: Record<string, unknown>,
): string {
  // Sort option keys for deterministic key generation
  const sortedOptions = Object.keys(options)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      const value = options[key];
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {});

  return `${functionName}:${repoPath}:${JSON.stringify(sortedOptions)}`;
}
