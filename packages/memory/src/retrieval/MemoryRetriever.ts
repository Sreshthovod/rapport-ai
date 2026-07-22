import { BrowserStorageMemoryStore } from '../store/BrowserStorageMemoryStore.js';
import { IMemoryStore } from '../store/MemoryStore.js';
import { MemoryContext, MemoryRecord, MemoryRetrievalQuery } from '../types/MemoryTypes.js';
import { MemoryFilter } from './MemoryFilter.js';
import { MemoryRanker } from './MemoryRanker.js';
import { RetrievalCache } from './RetrievalCache.js';

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
    const cacheKey = `${query.contactId}_${query.currentTopic || 'all'}_${maxResults}`;

    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    // Retrieve records via IMemoryStore interface (never accessing browser storage directly)
    const rawRecords = await this.store.findByContact(query.contactId);
    const totalEvaluated = rawRecords.length;

    // Filter candidate records
    const filtered = MemoryFilter.filterMemories(rawRecords, query);

    // Rank candidate records
    const ranked = MemoryRanker.rankMemories(filtered, query);
    const topRecords: MemoryRecord[] = ranked.slice(0, maxResults).map((r) => r.record);

    // Categorize records for provider-independent consumption
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
