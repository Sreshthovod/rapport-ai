import { MemoryContext } from '../types/MemoryTypes.js';

export class RetrievalCache {
  private static instance: RetrievalCache | null = null;
  private readonly cache: Map<string, { context: MemoryContext; timestamp: number }> = new Map();
  private readonly maxEntries = 50;
  private readonly ttlMs = 3 * 60 * 1000; // 3 minutes TTL

  public static getInstance(): RetrievalCache {
    if (!RetrievalCache.instance) {
      RetrievalCache.instance = new RetrievalCache();
    }
    return RetrievalCache.instance;
  }

  public get(key: string): MemoryContext | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry.context;
  }

  public set(key: string, context: MemoryContext): void {
    if (this.cache.size >= this.maxEntries) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, { context, timestamp: Date.now() });
  }

  public invalidate(): void {
    this.cache.clear();
  }
}
