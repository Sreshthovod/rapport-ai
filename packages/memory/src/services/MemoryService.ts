import { BrowserStorageMemoryStore } from '../store/BrowserStorageMemoryStore.js';
import { IMemoryStore } from '../store/MemoryStore.js';
import {
  MemoryImportance,
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
  title: string;
  content: string;
  importance?: MemoryImportance;
  confidence?: number;
  expiresAt?: number;
  tags?: string[];
  source?: MemorySource;
  metadata?: Record<string, unknown>;
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

  public async isDuplicate(contactId: string, type: MemoryType, content: string): Promise<boolean> {
    const existing = await this.store.findByContact(contactId);
    const cleanContent = content.trim().toLowerCase();
    return existing.some((m) => m.type === type && m.content.trim().toLowerCase() === cleanContent);
  }

  public async createMemory(params: CreateMemoryParams): Promise<MemoryRecord> {
    const validation = this.validateMemory(params);
    if (!validation.valid) {
      throw new Error(`[MemoryService] Validation failed: ${validation.reason}`);
    }

    const isDup = await this.isDuplicate(params.contactId, params.type, params.content);
    if (isDup) {
      const existing = await this.store.findByContact(params.contactId);
      const dupRecord = existing.find(
        (m) => m.type === params.type && m.content.trim().toLowerCase() === params.content.trim().toLowerCase()
      );
      if (dupRecord) return dupRecord;
    }

    const now = Date.now();
    const record: MemoryRecord = {
      id: params.id || `mem_${now}_${Math.random().toString(36).substring(2, 7)}`,
      contactId: params.contactId.trim(),
      type: params.type,
      title: params.title.trim(),
      content: params.content.trim(),
      importance: params.importance || 'NORMAL',
      confidence: params.confidence ?? 0.9,
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

  public async updateMemory(id: string, patch: Partial<MemoryRecord>): Promise<MemoryRecord | null> {
    return this.store.update(id, patch);
  }

  public async deleteMemory(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  public async getMemoriesForContact(contactId: string): Promise<MemoryRecord[]> {
    await this.pruneExpiredMemories(contactId);
    return this.store.findByContact(contactId);
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
