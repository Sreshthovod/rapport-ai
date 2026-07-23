# Memory System Architecture

The **Memory System** (`@rapport/memory`) is a dedicated monorepo package in **Rapport AI** that owns all long-term interpersonal memory persistence and management. It provides a deterministic, provider-independent memory foundation without vector databases or AI generation dependencies.

---

## 1. Package Structure (`packages/memory`)

```
packages/memory/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                     # Package entry point
    ├── types/
    │   └── MemoryTypes.ts           # Strongly-typed domain models
    ├── store/
    │   ├── MemoryStore.ts           # IMemoryStore abstract interface
    │   └── BrowserStorageMemoryStore.ts # Extension storage adapter
    └── services/
        └── MemoryService.ts         # Validation, deduplication & CRUD
```

---

## 2. Memory Architecture & Data Flow

```
WhatsApp Thread / AI Copilot Engine
               │
               ▼
        [ MemoryService ]
  (Validation & Deduplication)
               │
               ▼
       [ IMemoryStore ]
  (Abstract Storage Layer)
               │
               ├──────────────────────────────┐
               ▼ (Active Storage)             ▼ (Future Extensions)
 [ BrowserStorageMemoryStore ]    [ IndexedDB / CloudSync Store ]
   (chrome.storage.local)
```

---

## 3. Domain Entities & Schemas

### `MemoryRecord`
```typescript
export interface MemoryRecord {
  id: string;
  contactId: string;
  type: MemoryType; // PERSON, PREFERENCE, EVENT, PLAN, PROMISE, DATE, LOCATION, INTEREST, GOAL, CUSTOM
  title: string;
  content: string;
  importance: MemoryImportance; // LOW, NORMAL, HIGH, CRITICAL
  confidence: number; // 0.0 to 1.0
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
  tags: string[];
  source: MemorySource; // user_explicit, extracted_heuristic, system
  metadata: MemoryMetadata;
}
```

---

## 4. Abstract Storage Interface (`IMemoryStore`)

```typescript
export interface IMemoryStore {
  save(memory: MemoryRecord): Promise<void>;
  update(id: string, patch: Partial<MemoryRecord>): Promise<MemoryRecord | null>;
  delete(id: string): Promise<boolean>;
  find(query: MemoryQuery): Promise<MemoryResult>;
  findByContact(contactId: string): Promise<MemoryRecord[]>;
  clear(): Promise<void>;
  count(contactId?: string): Promise<number>;
}
```

---

## 5. Memory Service Logic (`MemoryService`)

- **Validation**: Enforces non-empty `contactId`, `title`, and `content`, and ensures `confidence` is within $[0.0, 1.0]$.
- **Deduplication**: Prevents saving duplicate memory content for the same contact and type.
- **Expiration Handling**: Automatically prunes expired records (`expiresAt < Date.now()`).
- **Importance Scoring**: Categorizes records into `LOW`, `NORMAL`, `HIGH`, `CRITICAL` for future prompt orchestrator ranking.

---

## 6. Extension Points & Roadmap

1. **`HeuristicMemoryExtractor`**: Automated heuristic pipeline to extract facts, dates, and promises from conversation context into `MemoryRecord` instances.
2. **`IndexedDBMemoryStore`**: High-performance local IndexedDB store for high-volume offline memory storage.
3. **`EncryptedCloudSyncStore`**: End-to-end encrypted cross-device memory synchronization store.
