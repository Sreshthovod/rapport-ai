// Declare chrome for extension context
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;

import { MemoryQuery, MemoryRecord, MemoryResult } from '../types/MemoryTypes.js';
import { IMemoryStore } from './MemoryStore.js';

export class BrowserStorageMemoryStore implements IMemoryStore {
  private static instance: BrowserStorageMemoryStore | null = null;
  private readonly inMemoryMap: Map<string, MemoryRecord> = new Map();
  private readonly storageKey = 'rapport_memories_v1';

  public static getInstance(): BrowserStorageMemoryStore {
    if (!BrowserStorageMemoryStore.instance) {
      BrowserStorageMemoryStore.instance = new BrowserStorageMemoryStore();
    }
    return BrowserStorageMemoryStore.instance;
  }

  private async loadAll(): Promise<Map<string, MemoryRecord>> {
    if (this.inMemoryMap.size > 0) {
      return this.inMemoryMap;
    }

    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const result = await new Promise<Record<string, unknown>>((resolve) => {
          chrome.storage.local.get([this.storageKey], (res: Record<string, unknown>) => resolve(res || {}));
        });
        const rawList = (result[this.storageKey] as MemoryRecord[]) || [];
        rawList.forEach((item) => this.inMemoryMap.set(item.id, item));
      } else if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(this.storageKey);
        if (raw) {
          const rawList = JSON.parse(raw) as MemoryRecord[];
          rawList.forEach((item) => this.inMemoryMap.set(item.id, item));
        }
      }
    } catch {
      // Storage unavailable fallback
    }

    return this.inMemoryMap;
  }

  private async persistAll(): Promise<void> {
    const list = Array.from(this.inMemoryMap.values());
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await new Promise<void>((resolve) => {
          chrome.storage.local.set({ [this.storageKey]: list }, () => resolve());
        });
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, JSON.stringify(list));
      }
    } catch {
      // Storage unavailable fallback
    }
  }

  public async save(memory: MemoryRecord): Promise<void> {
    const map = await this.loadAll();
    map.set(memory.id, memory);
    await this.persistAll();
  }

  public async update(id: string, patch: Partial<MemoryRecord>): Promise<MemoryRecord | null> {
    const map = await this.loadAll();
    const existing = map.get(id);
    if (!existing) return null;

    const updated: MemoryRecord = {
      ...existing,
      ...patch,
      id: existing.id,
      updatedAt: Date.now(),
    };

    map.set(id, updated);
    await this.persistAll();
    return updated;
  }

  public async delete(id: string): Promise<boolean> {
    const map = await this.loadAll();
    const deleted = map.delete(id);
    if (deleted) {
      await this.persistAll();
    }
    return deleted;
  }

  public async find(query: MemoryQuery): Promise<MemoryResult> {
    const map = await this.loadAll();
    let records = Array.from(map.values());

    if (query.contactId) {
      records = records.filter((r) => r.contactId === query.contactId);
    }

    if (query.type) {
      records = records.filter((r) => r.type === query.type);
    }

    if (query.tags && query.tags.length > 0) {
      records = records.filter((r) => query.tags!.some((t) => r.tags.includes(t)));
    }

    if (query.searchQuery) {
      const q = query.searchQuery.toLowerCase();
      records = records.filter(
        (r) => r.title.toLowerCase().includes(q) || r.content.toLowerCase().includes(q)
      );
    }

    const total = records.length;
    const offset = query.offset || 0;
    const limit = query.limit || 50;
    const items = records.slice(offset, offset + limit);

    return { items, total, offset, limit };
  }

  public async findByContact(contactId: string): Promise<MemoryRecord[]> {
    const result = await this.find({ contactId, limit: 100 });
    return result.items;
  }

  public async clear(): Promise<void> {
    this.inMemoryMap.clear();
    await this.persistAll();
  }

  public async count(contactId?: string): Promise<number> {
    const map = await this.loadAll();
    if (contactId) {
      return Array.from(map.values()).filter((r) => r.contactId === contactId).length;
    }
    return map.size;
  }
}
