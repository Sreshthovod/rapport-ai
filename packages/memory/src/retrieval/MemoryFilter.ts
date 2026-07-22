import { MemoryRecord, MemoryRetrievalQuery } from '../types/MemoryTypes.js';

export class MemoryFilter {
  public static filterMemories(records: MemoryRecord[], query: MemoryRetrievalQuery): MemoryRecord[] {
    const now = Date.now();

    return records.filter((record) => {
      // 1. Filter out expired memories
      if (record.expiresAt && record.expiresAt < now) {
        return false;
      }

      // 2. Filter out mismatched contacts
      if (record.contactId !== query.contactId) {
        return false;
      }

      // 3. Filter out low-confidence records
      if (record.confidence < 0.4) {
        return false;
      }

      // 4. Filter out unrequested memory types if explicitly restricted
      if (query.memoryTypes && query.memoryTypes.length > 0 && !query.memoryTypes.includes(record.type)) {
        return false;
      }

      return true;
    });
  }
}
