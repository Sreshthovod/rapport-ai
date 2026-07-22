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
