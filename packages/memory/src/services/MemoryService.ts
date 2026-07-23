import { BrowserStorageMemoryStore } from '../store/BrowserStorageMemoryStore.js';
import { IMemoryStore } from '../store/MemoryStore.js';
import {
  MemoryCandidate,
  MemoryCategory,
  MemoryImportance,
  MemoryMetadata,
  MemoryQuery,
  MemoryRecord,
  MemoryResult,
  MemorySource,
  MemoryType,
} from '../types/MemoryTypes.js';

export interface CreateMemoryParams {
  id?: string;
  contactId: string;
  type: MemoryType;
  category?: MemoryCategory;
  title: string;
  content: string;
  importance?: MemoryImportance;
  importanceScore?: number;
  confidence?: number;
  pinned?: boolean;
  expiresAt?: number;
  tags?: string[];
  source?: MemorySource;
  metadata?: MemoryMetadata;
}

/**
 * Compute a token overlap similarity score (0–1) between two strings.
 * Uses Jaccard coefficient on word token sets.
 */
function tokenSimilarity(a: string, b: string): number {
  const tokenize = (s: string) =>
    new Set(s.toLowerCase().replace(/[^a-z0-9\u0080-\uFFFF ]/g, '').split(/\s+/).filter(Boolean));
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  let intersection = 0;
  setA.forEach((t) => { if (setB.has(t)) intersection++; });
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export class MemoryService {
  private readonly store: IMemoryStore;

  constructor(store?: IMemoryStore) {
    this.store = store || BrowserStorageMemoryStore.getInstance();
  }

  public validateMemory(params: CreateMemoryParams): { valid: boolean; reason?: string } {
    if (!params.contactId || !params.contactId.trim()) {
      return { valid: false, reason: 'contactId is required.' };
    }
    if (!params.title || !params.title.trim()) {
      return { valid: false, reason: 'Memory title is required.' };
    }
    if (!params.content || !params.content.trim()) {
      return { valid: false, reason: 'Memory content is required.' };
    }
    if (params.confidence !== undefined && (params.confidence < 0 || params.confidence > 1)) {
      return { valid: false, reason: 'Confidence score must be between 0.0 and 1.0.' };
    }
    return { valid: true };
  }

  /**
   * Find an existing memory that is semantically similar (>70% token overlap)
   * to the candidate, for the same contact and type.
   */
  public async findSimilarMemory(
    contactId: string,
    type: MemoryType,
    content: string
  ): Promise<MemoryRecord | null> {
    const existing = await this.store.findByContact(contactId);
    const SIMILARITY_THRESHOLD = 0.7;

    for (const record of existing) {
      if (record.type !== type) continue;
      const sim = tokenSimilarity(record.content, content);
      if (sim >= SIMILARITY_THRESHOLD) return record;
    }
    return null;
  }

  /**
   * Create or update a memory, merging content if a similar one already exists.
   */
  public async upsertMemory(params: CreateMemoryParams): Promise<MemoryRecord> {
    const validation = this.validateMemory(params);
    if (!validation.valid) {
      throw new Error(`[MemoryService] Validation failed: ${validation.reason}`);
    }

    const similar = await this.findSimilarMemory(params.contactId, params.type, params.content);
    if (similar) {
      // Merge: keep higher importance score, update content if different
      const updatedScore = Math.max(
        similar.importanceScore,
        params.importanceScore ?? similar.importanceScore
      );
      const updated = await this.store.update(similar.id, {
        content: params.content.trim(),
        title: params.title.trim(),
        importanceScore: updatedScore,
        importance: updatedScore >= 80 ? 'CRITICAL' : updatedScore >= 60 ? 'HIGH' : updatedScore >= 35 ? 'NORMAL' : 'LOW',
        updatedAt: Date.now(),
      });
      return updated || similar;
    }

    return this.createMemory(params);
  }

  public async createMemory(params: CreateMemoryParams): Promise<MemoryRecord> {
    const validation = this.validateMemory(params);
    if (!validation.valid) {
      throw new Error(`[MemoryService] Validation failed: ${validation.reason}`);
    }

    const now = Date.now();
    const record: MemoryRecord = {
      id: params.id || `mem_${now}_${Math.random().toString(36).substring(2, 7)}`,
      contactId: params.contactId.trim(),
      type: params.type,
      category: params.category || 'Personal',
      title: params.title.trim(),
      content: params.content.trim(),
      importance: params.importance || 'NORMAL',
      importanceScore: params.importanceScore ?? 40,
      confidence: params.confidence ?? 0.9,
      pinned: params.pinned ?? false,
      createdAt: now,
      updatedAt: now,
      expiresAt: params.expiresAt,
      tags: params.tags || [],
      source: params.source || 'user_explicit',
      metadata: params.metadata || {},
    };

    await this.store.save(record);
    return record;
  }

  public async processCandidates(
    contactId: string,
    candidates: MemoryCandidate[]
  ): Promise<MemoryRecord[]> {
    const savedRecords: MemoryRecord[] = [];
    for (const candidate of candidates) {
      try {
        const record = await this.upsertMemory({
          contactId,
          type: candidate.type,
          category: candidate.category,
          title: candidate.title,
          content: candidate.content,
          importance: candidate.importance,
          importanceScore: candidate.importanceScore,
          confidence: candidate.confidence,
          expiresAt: candidate.expiresAt,
          tags: candidate.tags,
          source: candidate.source,
          metadata: candidate.metadata || {},
        });
        savedRecords.push(record);
      } catch {
        // Skip invalid candidates gracefully
      }
    }
    return savedRecords;
  }

  public async updateMemory(id: string, patch: Partial<MemoryRecord>): Promise<MemoryRecord | null> {
    return this.store.update(id, patch);
  }

  public async deleteMemory(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  /** Pin a memory so it is always included in retrieval. */
  public async pinMemory(id: string): Promise<MemoryRecord | null> {
    return this.store.update(id, { pinned: true, updatedAt: Date.now() });
  }

  /** Unpin a memory. */
  public async unpinMemory(id: string): Promise<MemoryRecord | null> {
    return this.store.update(id, { pinned: false, updatedAt: Date.now() });
  }

  /** Delete ALL memories for a specific contact. */
  public async forgetContact(contactId: string): Promise<number> {
    const records = await this.store.findByContact(contactId);
    let deletedCount = 0;
    for (const record of records) {
      const ok = await this.store.delete(record.id);
      if (ok) deletedCount++;
    }
    return deletedCount;
  }

  public async getMemoriesForContact(contactId: string): Promise<MemoryRecord[]> {
    await this.pruneExpiredMemories(contactId);
    const records = await this.store.findByContact(contactId);
    // Sort pinned first, then by importanceScore desc
    return records.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.importanceScore - a.importanceScore;
    });
  }

  public async getAllMemories(): Promise<MemoryRecord[]> {
    const result = await this.store.find({ limit: 2000 });
    return result.items.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  public async getUniqueContactIds(): Promise<string[]> {
    const all = await this.getAllMemories();
    return [...new Set(all.map((m) => m.contactId))];
  }

  public async queryMemories(query: MemoryQuery): Promise<MemoryResult> {
    return this.store.find(query);
  }

  public async pruneExpiredMemories(contactId?: string): Promise<number> {
    const records = contactId
      ? await this.store.findByContact(contactId)
      : (await this.store.find({ limit: 1000 })).items;

    const now = Date.now();
    let prunedCount = 0;

    for (const record of records) {
      if (record.expiresAt && record.expiresAt < now) {
        await this.store.delete(record.id);
        prunedCount++;
      }
    }

    return prunedCount;
  }
}
