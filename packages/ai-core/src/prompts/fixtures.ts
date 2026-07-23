import { MemoryContext, MemoryRecord } from '@rapport/memory';

export const TRIP_PLANNING_MEMORY: MemoryRecord = {
  id: 'scen_1',
  contactId: 'friend_alice',
  type: 'PLAN',
  category: 'Plans',
  title: 'Tokyo Trip Plan',
  content: 'Planning a 2-week vacation to Tokyo and Kyoto next month.',
  importance: 'HIGH',
  importanceScore: 65,
  confidence: 0.95,
  pinned: false,
  createdAt: Date.now() - 86400000,
  updatedAt: Date.now() - 86400000,
  tags: ['japan', 'travel'],
  source: 'extracted_heuristic',
  metadata: {},
};

export const RESTAURANT_MEMORY: MemoryRecord = {
  id: 'scen_2',
  contactId: 'friend_alice',
  type: 'PREFERENCE',
  category: 'Preferences',
  title: 'Favorite Restaurant',
  content: 'Loves authentic Japanese sushi and ramen at Morimoto.',
  importance: 'NORMAL',
  importanceScore: 40,
  confidence: 0.92,
  pinned: false,
  createdAt: Date.now() - 172800000,
  updatedAt: Date.now() - 172800000,
  tags: ['food', 'sushi'],
  source: 'extracted_heuristic',
  metadata: {},
};

export const BIRTHDAY_MEMORY: MemoryRecord = {
  id: 'scen_3',
  contactId: 'friend_alice',
  type: 'EVENT',
  category: 'Important dates',
  title: 'Sister Birthday',
  content: 'Sister Sarah birthday celebration on March 15th.',
  importance: 'CRITICAL',
  importanceScore: 90,
  confidence: 0.98,
  pinned: true,
  createdAt: Date.now() - 432000000,
  updatedAt: Date.now() - 432000000,
  tags: ['birthday', 'event'],
  source: 'user_explicit',
  metadata: {},
};

export const PROMPT_INTEGRATION_TEST_CONTEXT: MemoryContext = {
  relevantMemories: [BIRTHDAY_MEMORY, TRIP_PLANNING_MEMORY, RESTAURANT_MEMORY],
  importantFacts: [BIRTHDAY_MEMORY, TRIP_PLANNING_MEMORY],
  activePlans: [TRIP_PLANNING_MEMORY],
  recurringPreferences: [RESTAURANT_MEMORY],
  recentEvents: [BIRTHDAY_MEMORY],
  retrievalMetadata: {
    totalEvaluated: 3,
    totalReturned: 3,
    queryTimestamp: Date.now(),
    executionTimeMs: 2,
  },
};
