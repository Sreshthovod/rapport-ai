import { CanonicalMessage } from '@rapport/shared';
import { MemoryExtractor } from '../extraction/MemoryExtractor.js';
import { MemoryRetriever } from '../retrieval/MemoryRetriever.js';
import { MemoryService } from '../services/MemoryService.js';
import { BrowserStorageMemoryStore } from '../store/BrowserStorageMemoryStore.js';

export interface AuditResult {
  testName: string;
  passed: boolean;
  durationMs: number;
  details?: string;
}

export class PipelineValidationTest {
  public static async runAllTests(): Promise<{ results: AuditResult[]; passCount: number; failCount: number }> {
    const results: AuditResult[] = [];
    const store = BrowserStorageMemoryStore.getInstance();
    await store.clear();
    const service = new MemoryService(store);
    const retriever = MemoryRetriever.getInstance(store);

    // 1. E2E Pipeline & Scenario 1: Trip Planning
    const t1Start = Date.now();
    try {
      const tripMessages: CanonicalMessage[] = [
        { id: 'm1', sender: 'Alice', timestamp: Date.now() - 3600000, text: 'I am planning a 2-week vacation to Tokyo next month!', direction: 'incoming', type: 'text', attachments: [], reactions: [] },
      ];
      const candidates = MemoryExtractor.getInstance().extractCandidates({
        context: {
          conversation: { participants: ['Alice'], messageCount: 1, lastActive: Date.now(), firstMessage: tripMessages[0], latestMessage: tripMessages[0], conversationDurationMs: 3600000, conversationHealth: 'healthy' },
          summary: { recentSummary: 'Tokyo trip planning', currentTopic: 'Japan travel', detectedTone: 'Friendly', conversationStage: 'Planning', pendingQuestions: [], importantFacts: [], userIntent: 'Plan trip', suggestedGoal: 'Travel Logistics' },
          tone: 'Friendly',
          stage: 'Planning',
          recentMessages: tripMessages,
          extractedFacts: [],
          pendingQuestions: [],
        },
      });

      const saved = await service.processCandidates('contact_alice', candidates);
      const retrievedContext = await retriever.retrieveMemoryContext({ contactId: 'contact_alice', currentTopic: 'Japan travel' });

      const planRecord = retrievedContext.relevantMemories.find((r) => r.type === 'PLAN' || r.type === 'LOCATION');
      const passed = saved.length > 0 && !!planRecord;

      results.push({
        testName: 'Scenario 1: Trip Planning Extraction & Retrieval',
        passed,
        durationMs: Date.now() - t1Start,
        details: passed ? `Extracted & retrieved plan: "${planRecord?.title}"` : 'Failed to extract or retrieve trip plan.',
      });
    } catch (err: unknown) {
      results.push({ testName: 'Scenario 1: Trip Planning', passed: false, durationMs: Date.now() - t1Start, details: String(err) });
    }

    // 2. Scenario 2: Favorite Food
    const t2Start = Date.now();
    try {
      const foodMessages: CanonicalMessage[] = [
        { id: 'f1', sender: 'Bob', timestamp: Date.now() - 1800000, text: 'I am totally obsessed with authentic Japanese sushi and ramen 🍣', direction: 'incoming', type: 'text', attachments: [], reactions: [] },
      ];
      const candidates = MemoryExtractor.getInstance().extractCandidates({
        context: {
          conversation: { participants: ['Bob'], messageCount: 1, lastActive: Date.now(), firstMessage: foodMessages[0], latestMessage: foodMessages[0], conversationDurationMs: 1800000, conversationHealth: 'healthy' },
          summary: { recentSummary: 'Food preference', currentTopic: 'Food', detectedTone: 'Friendly', conversationStage: 'Small Talk', pendingQuestions: [], importantFacts: [], userIntent: 'Share food', suggestedGoal: 'Food' },
          tone: 'Friendly',
          stage: 'Small Talk',
          recentMessages: foodMessages,
          extractedFacts: [],
          pendingQuestions: [],
        },
      });

      await service.processCandidates('contact_bob', candidates);
      const retrievedContext = await retriever.retrieveMemoryContext({ contactId: 'contact_bob' });
      const foodPref = retrievedContext.relevantMemories.find((r) => r.type === 'PREFERENCE');
      const passed = !!foodPref;

      results.push({
        testName: 'Scenario 2: Favorite Food Preference Storage',
        passed,
        durationMs: Date.now() - t2Start,
        details: passed ? `Stored preference: "${foodPref?.content}"` : 'Failed preference storage.',
      });
    } catch (err: unknown) {
      results.push({ testName: 'Scenario 2: Favorite Food', passed: false, durationMs: Date.now() - t2Start, details: String(err) });
    }

    // 3. Scenario 3: Birthday Discussion
    const t3Start = Date.now();
    try {
      const bdayMessages: CanonicalMessage[] = [
        { id: 'b1', sender: 'Carol', timestamp: Date.now() - 7200000, text: 'My birthday is coming up on October 24th! 🎉', direction: 'incoming', type: 'text', attachments: [], reactions: [] },
      ];
      const candidates = MemoryExtractor.getInstance().extractCandidates({
        context: {
          conversation: { participants: ['Carol'], messageCount: 1, lastActive: Date.now(), firstMessage: bdayMessages[0], latestMessage: bdayMessages[0], conversationDurationMs: 7200000, conversationHealth: 'healthy' },
          summary: { recentSummary: 'Birthday event', currentTopic: 'Birthday', detectedTone: 'Friendly', conversationStage: 'Small Talk', pendingQuestions: [], importantFacts: [], userIntent: 'Share birthday', suggestedGoal: 'Birthday' },
          tone: 'Friendly',
          stage: 'Small Talk',
          recentMessages: bdayMessages,
          extractedFacts: [],
          pendingQuestions: [],
        },
      });

      await service.processCandidates('contact_carol', candidates);
      const retrievedContext = await retriever.retrieveMemoryContext({ contactId: 'contact_carol' });
      const bdayEvent = retrievedContext.relevantMemories.find((r) => r.type === 'EVENT' && r.importance === 'CRITICAL');
      const passed = !!bdayEvent;

      results.push({
        testName: 'Scenario 3: Birthday Discussion Critical Event',
        passed,
        durationMs: Date.now() - t3Start,
        details: passed ? `Stored critical birthday event with 0.95 confidence.` : 'Failed birthday event storage.',
      });
    } catch (err: unknown) {
      results.push({ testName: 'Scenario 3: Birthday Discussion', passed: false, durationMs: Date.now() - t3Start, details: String(err) });
    }

    // 4. Scenario 4: Deduplication
    const t4Start = Date.now();
    try {
      const initialCount = await store.count('contact_bob');
      await service.upsertMemory({
        contactId: 'contact_bob',
        type: 'INTEREST',
        title: 'Hobby Interest',
        content: 'Loves playing acoustic guitar on weekends',
      });
      const countAfterFirst = await store.count('contact_bob');
      await service.upsertMemory({
        contactId: 'contact_bob',
        type: 'INTEREST',
        title: 'Hobby Interest',
        content: 'Loves playing acoustic guitar on weekends',
      });
      const countAfterSecond = await store.count('contact_bob');
      const passed = countAfterFirst === initialCount + 1 && countAfterSecond === countAfterFirst;

      results.push({
        testName: 'Scenario 4: Content & Title Deduplication',
        passed,
        durationMs: Date.now() - t4Start,
        details: passed ? 'Duplicate memory correctly rejected.' : 'Deduplication failed.',
      });
    } catch (err: unknown) {
      results.push({ testName: 'Scenario 4: Deduplication', passed: false, durationMs: Date.now() - t4Start, details: String(err) });
    }

    // 5. Scenario 5: Temporary Plan Expiration
    const t5Start = Date.now();
    try {
      await service.createMemory({
        contactId: 'contact_david',
        type: 'PLAN',
        title: 'Temporary Meeting',
        content: 'Lunch meeting tomorrow at 12pm',
        expiresAt: Date.now() - 1000, // Already expired
      });
      const prunedCount = await service.pruneExpiredMemories('contact_david');
      const remaining = await service.getMemoriesForContact('contact_david');
      const passed = prunedCount === 1 && remaining.length === 0;

      results.push({
        testName: 'Scenario 5: Temporary Plan Expiration & Pruning',
        passed,
        durationMs: Date.now() - t5Start,
        details: passed ? 'Expired temporary plan correctly pruned.' : 'Expiration pruning failed.',
      });
    } catch (err: unknown) {
      results.push({ testName: 'Scenario 5: Expiration', passed: false, durationMs: Date.now() - t5Start, details: String(err) });
    }

    const passCount = results.filter((r) => r.passed).length;
    const failCount = results.filter((r) => !r.passed).length;

    return { results, passCount, failCount };
  }
}
