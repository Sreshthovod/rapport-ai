import { MemoryQuery, MemoryRecord, MemoryResult } from '../types/MemoryTypes.js';

export interface IMemoryStore {
  save(memory: MemoryRecord): Promise<void>;
  update(id: string, patch: Partial<MemoryRecord>): Promise<MemoryRecord | null>;
  delete(id: string): Promise<boolean>;
  find(query: MemoryQuery): Promise<MemoryResult>;
  findByContact(contactId: string): Promise<MemoryRecord[]>;
  clear(): Promise<void>;
  count(contactId?: string): Promise<number>;
}
