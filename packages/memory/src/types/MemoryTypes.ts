export type MemoryType =
  | 'PERSON'
  | 'PREFERENCE'
  | 'EVENT'
  | 'PLAN'
  | 'PROMISE'
  | 'DATE'
  | 'LOCATION'
  | 'INTEREST'
  | 'GOAL'
  | 'CUSTOM';

export type MemoryImportance = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export type MemorySource = 'user_explicit' | 'extracted_heuristic' | 'system';

export interface MemoryMetadata {
  extractedFromMessageId?: string;
  categoryTag?: string;
  sourceContext?: string;
  customProperties?: Record<string, unknown>;
}

export interface MemoryCandidate {
  type: MemoryType;
  title: string;
  content: string;
  importance: MemoryImportance;
  confidence: number;
  reason: string;
  tags: string[];
  source: MemorySource;
  expiresAt?: number;
  metadata?: MemoryMetadata;
}

export interface MemoryRecord {
  id: string;
  contactId: string;
  type: MemoryType;
  title: string;
  content: string;
  importance: MemoryImportance;
  confidence: number;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
  tags: string[];
  source: MemorySource;
  metadata: MemoryMetadata;
}

export interface MemoryQuery {
  contactId?: string;
  type?: MemoryType;
  minImportance?: MemoryImportance;
  tags?: string[];
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export interface MemoryResult {
  items: MemoryRecord[];
  total: number;
  offset: number;
  limit: number;
}

export interface MemoryRetrievalQuery {
  contactId: string;
  conversationId?: string;
  currentTopic?: string;
  recentKeywords?: string[];
  conversationGoal?: string;
  relationshipType?: string;
  memoryTypes?: MemoryType[];
  maximumResults?: number;
}

export interface MemoryContext {
  relevantMemories: MemoryRecord[];
  importantFacts: MemoryRecord[];
  activePlans: MemoryRecord[];
  recurringPreferences: MemoryRecord[];
  recentEvents: MemoryRecord[];
  retrievalMetadata: {
    totalEvaluated: number;
    totalReturned: number;
    queryTimestamp: number;
    executionTimeMs: number;
  };
}
