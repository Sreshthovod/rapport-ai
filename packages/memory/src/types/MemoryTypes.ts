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
  | 'RELATIONSHIP'
  | 'CUSTOM';

export type MemoryImportance = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export type MemoryCategory =
  | 'Personal'
  | 'Preferences'
  | 'Relationships'
  | 'Plans'
  | 'Important dates'
  | 'Interests';

export type MemorySource = 'user_explicit' | 'extracted_heuristic' | 'system';

export interface MemoryMetadata {
  extractedFromMessageId?: string;
  categoryTag?: string;
  sourceContext?: string;
  customProperties?: Record<string, unknown>;
}

export interface MemoryCandidate {
  type: MemoryType;
  category: MemoryCategory;
  title: string;
  content: string;
  importance: MemoryImportance;
  importanceScore: number;
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
  category: MemoryCategory;
  title: string;
  content: string;
  importance: MemoryImportance;
  importanceScore: number;
  confidence: number;
  pinned: boolean;
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
  category?: MemoryCategory;
  minImportance?: MemoryImportance;
  pinned?: boolean;
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
  /** Max chars budget for the combined memory context in prompt (default 1600) */
  maxPromptChars?: number;
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
