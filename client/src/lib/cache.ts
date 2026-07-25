/**
 * Caching layer for product data
 * Uses in-memory cache with invalidation support
 * Can be swapped for Redis later with same API
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // TTL in milliseconds
}

class CacheManager {
  private cache = new Map<string, CacheItem<any>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup job every 5 minutes
    if (typeof window === 'undefined') {
      // Server-side only
      this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  /**
   * Set value in cache with TTL
   */
  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    });
  }

  /**
   * Delete specific key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Delete all keys matching pattern
   */
  deletePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalidate all products cache
   */
  invalidateProducts(): void {
    this.deletePattern(/^products:/);
  }

  /**
   * Invalidate all categories cache
   */
  invalidateCategories(): void {
    this.deletePattern(/^categories:/);
  }

  /**
   * Cleanup expired items
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  stats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Cleanup on exit
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// ── Dev HMR-safe singleton ────────────────────────────────────────────────
// Without this, Next.js creates a NEW CacheManager (and a NEW setInterval)
// on every hot-reload. Old instances are never GC'd → memory/CPU spiral.
const _global = globalThis as typeof globalThis & { __nyvaraCacheManager?: CacheManager };
if (!_global.__nyvaraCacheManager) {
  _global.__nyvaraCacheManager = new CacheManager();
}
export const cacheManager = _global.__nyvaraCacheManager;

/**
 * Helper to cache async operations
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 300,
): Promise<T> {
  // Try cache first
  const cached = cacheManager.get<T>(key);
  if (cached) return cached;

  // Fetch and cache
  const data = await fetcher();
  cacheManager.set(key, data, ttlSeconds);
  return data;
}
