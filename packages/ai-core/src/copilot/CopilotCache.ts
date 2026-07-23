import { CopilotDecision } from '@rapport/shared';

export class CopilotCache {
  private static instance: CopilotCache | null = null;
  private readonly cache: Map<string, { decision: CopilotDecision; timestamp: number }> = new Map();
  private readonly maxEntries = 50;

  public static getInstance(): CopilotCache {
    if (!CopilotCache.instance) {
      CopilotCache.instance = new CopilotCache();
    }
    return CopilotCache.instance;
  }

  public get(key: string): CopilotDecision | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > 5 * 60 * 1000) {
      this.cache.delete(key);
      return null;
    }

    return entry.decision;
  }

  public set(key: string, decision: CopilotDecision): void {
    if (this.cache.size >= this.maxEntries) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, { decision, timestamp: Date.now() });
  }

  public clear(): void {
    this.cache.clear();
  }
}
