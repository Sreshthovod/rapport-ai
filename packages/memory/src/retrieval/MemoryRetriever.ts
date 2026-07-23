import { BrowserStorageMemoryStore } from '../store/BrowserStorageMemoryStore.js';
import { IMemoryStore } from '../store/MemoryStore.js';
import { MemoryContext, MemoryRecord, MemoryRetrievalQuery } from '../types/MemoryTypes.js';
import { MemoryFilter } from './MemoryFilter.js';
import { MemoryRanker } from './MemoryRanker.js';
import { RetrievalCache } from './RetrievalCache.js';

const DEFAULT_MAX_PROMPT_CHARS = 1600;

export class MemoryRetriever {
  private static instance: MemoryRetriever | null = null;
  private readonly store: IMemoryStore;
  private readonly cache = RetrievalCache.getInstance();

  constructor(store?: IMemoryStore) {
    this.store = store || BrowserStorageMemoryStore.getInstance();
  }

  public static getInstance(store?: IMemoryStore): MemoryRetriever {
    if (!MemoryRetriever.instance) {
      MemoryRetriever.instance = new MemoryRetriever(store);
    }
    return MemoryRetriever.instance;
  }

  public async retrieveMemoryContext(query: MemoryRetrievalQuery): Promise<MemoryContext> {
    const startTime = Date.now();
    const maxResults = query.maximumResults || 10;
    const maxPromptChars = query.maxPromptChars ?? DEFAULT_MAX_PROMPT_CHARS;
    const cacheKey = `${query.contactId}_${query.currentTopic || 'all'}_${maxResults}`;

    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const rawRecords = await this.store.findByContact(query.contactId);
    const totalEvaluated = rawRecords.length;

    // Filter candidate records
    const filtered = MemoryFilter.filterMemories(rawRecords, query);

    // Rank candidate records — pinned first, then by score
    const ranked = MemoryRanker.rankMemories(filtered, query);

    // Apply token budget cap: stop adding memories once budget is exhausted
    const topRecords: MemoryRecord[] = [];
    let charCount = 0;

    // Always include pinned memories first (they bypass regular budget)
    const pinnedRecords = ranked.filter((r) => r.record.pinned);
    const regularRecords = ranked.filter((r) => !r.record.pinned);

    for (const { record } of pinnedRecords) {
      const recordChars = record.content.length + record.title.length;
      if (charCount + recordChars <= maxPromptChars) {
        topRecords.push(record);
        charCount += recordChars;
      }
    }

    for (const { record } of regularRecords) {
      if (topRecords.length >= maxResults) break;
      const recordChars = record.content.length + record.title.length;
      if (charCount + recordChars <= maxPromptChars) {
        topRecords.push(record);
        charCount += recordChars;
      }
    }

    // Categorize for provider-independent consumption
    const importantFacts = topRecords.filter((r) => r.importance === 'CRITICAL' || r.importance === 'HIGH');
    const activePlans = topRecords.filter((r) => r.type === 'PLAN' || r.type === 'PROMISE');
    const recurringPreferences = topRecords.filter((r) => r.type === 'PREFERENCE' || r.type === 'INTEREST');
    const recentEvents = topRecords.filter((r) => r.type === 'EVENT' || r.type === 'DATE');

    const context: MemoryContext = {
      relevantMemories: topRecords,
      importantFacts,
      activePlans,
      recurringPreferences,
      recentEvents,
      retrievalMetadata: {
        totalEvaluated,
        totalReturned: topRecords.length,
        queryTimestamp: Date.now(),
        executionTimeMs: Date.now() - startTime,
      },
    };

    this.cache.set(cacheKey, context);
    return context;
  }
}
