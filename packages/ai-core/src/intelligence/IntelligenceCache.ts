import { ConversationIntelligence } from '@rapport/shared';

export class IntelligenceCache {
  private static instance: IntelligenceCache | null = null;
  private readonly cache: Map<string, { data: ConversationIntelligence; timestamp: number }> = new Map();
  private readonly maxEntries = 50;

  public static getInstance(): IntelligenceCache {
    if (!IntelligenceCache.instance) {
      IntelligenceCache.instance = new IntelligenceCache();
    }
    return IntelligenceCache.instance;
  }

  public get(key: string): ConversationIntelligence | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Cache expires after 5 minutes
    if (Date.now() - entry.timestamp > 5 * 60 * 1000) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  public set(key: string, data: ConversationIntelligence): void {
    if (this.cache.size >= this.maxEntries) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  public clear(): void {
    this.cache.clear();
  }
}
