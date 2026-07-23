import { withTimeout } from '@rapport/shared';
import { MemoryCategory, MemoryQuery, MemoryRecord, MemoryResult } from '../types/MemoryTypes.js';
import { IMemoryStore } from './MemoryStore.js';

// Declare chrome for extension context
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;

/** Apply v2 defaults to records persisted before Memory Engine v2. */
function migrateRecord(item: MemoryRecord): MemoryRecord {
  const r = item as unknown as Record<string, unknown>;
  if (!item.category) r['category'] = 'Personal' satisfies MemoryCategory;
  if (item.importanceScore == null) r['importanceScore'] = 40;
  if (item.pinned == null) r['pinned'] = false;
  return item;
}

export class BrowserStorageMemoryStore implements IMemoryStore {
  private static instance: BrowserStorageMemoryStore | null = null;
  private readonly inMemoryMap: Map<string, MemoryRecord> = new Map();
  private readonly storageKey = 'rapport_memories_v1';

  /**
   * Dirty flag: set to true whenever in-memory state is authoritative and
   * does NOT require a reload from storage. Cleared after a persistence or load.
   * When false, the next read will reload from chrome.storage / localStorage.
   */
  private dirty = false;

  public static getInstance(): BrowserStorageMemoryStore {
    if (!BrowserStorageMemoryStore.instance) {
      BrowserStorageMemoryStore.instance = new BrowserStorageMemoryStore();
    }
    return BrowserStorageMemoryStore.instance;
  }

  private async loadAll(): Promise<Map<string, MemoryRecord>> {
    // Use the in-memory cache only if it was populated by this process
    if (this.dirty) {
      return this.inMemoryMap;
    }

    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const storagePromise = typeof chrome.storage.local.get === 'function'
          ? chrome.storage.local.get([this.storageKey])
          : new Promise<Record<string, unknown>>((resolve) => {
              chrome.storage.local.get([this.storageKey], (res: Record<string, unknown>) => resolve(res || {}));
            });
        const result = (await withTimeout(storagePromise, 3000, 'BrowserStorageMemoryStore:loadAll')) as Record<string, unknown>;
        const rawList = (result?.[this.storageKey] as MemoryRecord[]) || [];
        this.inMemoryMap.clear();
        rawList.forEach((item) => {
          this.inMemoryMap.set(item.id, migrateRecord(item));
        });
      } else if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(this.storageKey);
        this.inMemoryMap.clear();
        if (raw) {
          const rawList = JSON.parse(raw) as MemoryRecord[];
          rawList.forEach((item) => {
            this.inMemoryMap.set(item.id, migrateRecord(item));
          });
        }
      }
    } catch (err) {
      console.warn('[BrowserStorageMemoryStore] Storage load error/timeout:', err);
    }

    this.dirty = true;
    return this.inMemoryMap;
  }

  private async persistAll(): Promise<void> {
    const list = Array.from(this.inMemoryMap.values());
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const storagePromise = typeof chrome.storage.local.set === 'function'
          ? chrome.storage.local.set({ [this.storageKey]: list })
          : new Promise<void>((resolve) => {
              chrome.storage.local.set({ [this.storageKey]: list }, () => resolve());
            });
        await withTimeout(storagePromise, 3000, 'BrowserStorageMemoryStore:persistAll');
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, JSON.stringify(list));
      }
    } catch (err) {
      console.warn('[BrowserStorageMemoryStore] Storage persist error/timeout:', err);
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

    if (query.category) {
      records = records.filter((r) => r.category === query.category);
    }

    if (query.pinned !== undefined) {
      records = records.filter((r) => r.pinned === query.pinned);
    }

    if (query.tags && query.tags.length > 0) {
      records = records.filter((r) => query.tags!.some((t: string) => r.tags.includes(t)));
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
    this.dirty = true;
    await this.persistAll();
  }

  public async count(contactId?: string): Promise<number> {
    const map = await this.loadAll();
    if (contactId) {
      return Array.from(map.values()).filter((r) => r.contactId === contactId).length;
    }
    return map.size;
  }

  /**
   * Invalidate the in-memory cache so the next read reloads from storage.
   * Call this if you suspect external writes have occurred (e.g. sidepanel edits).
   */
  public invalidateCache(): void {
    this.dirty = false;
  }
}
