# Memory Retrieval Engine Architecture

The **Memory Retrieval Engine** (`MemoryRetriever`) in **Rapport AI** is a deterministic, provider-independent subsystem of `@rapport/memory`. It selects, ranks, filters, and formats the most relevant memories for an active conversation thread without requiring vector databases, embeddings, or AI calls.

---

## 1. Retrieval Pipeline Architecture

```
Active Conversation (Contact ID, Topic, Keywords)
                      │
                      ▼
            [ MemoryRetrievalQuery ]
                      │
                      ▼
           [ RetrievalCache Lookup ] ──(Cache Hit?)──► Return Cached MemoryContext
                      │ (Cache Miss)
                      ▼
               [ IMemoryStore ]
         (findByContact - Index Scanned)
                      │
                      ▼
              [ MemoryFilter ]
    (Excludes Expired, Mismatched & Low Confidence)
                      │
                      ▼
              [ MemoryRanker ]
     (Multi-Factor Score Calculation)
                      │
                      ▼
         [ Categorized MemoryContext ]
 (relevantMemories, importantFacts, activePlans, etc.)
```

---

## 2. Multi-Factor Deterministic Ranking Algorithm

Each candidate memory record is evaluated by `MemoryRanker` against the active query parameters:

$$\text{Final Score} = (\text{Score}_{\text{contact}} + \text{Score}_{\text{importance}} + \text{Score}_{\text{topic/keyword}} + \text{Score}_{\text{recency}}) \times \text{Confidence}$$

- **Contact Match Score (+40 pts)**: High boost when `record.contactId === query.contactId`.
- **Importance Weights**:
  - `CRITICAL` = +25 pts
  - `HIGH` = +18 pts
  - `NORMAL` = +10 pts
  - `LOW` = +5 pts
- **Topic & Keyword Overlap (+20 pts max)**: Hits against `currentTopic` and `recentKeywords` in titles, content, or tags.
- **Recency Boost (+10 pts max)**: Extra points for records created within the last 7 to 30 days.
- **Confidence Multiplier**: Multiplies score by confidence score ($0.0$ to $1.0$).

---

## 3. Filtering Strategy (`MemoryFilter`)

- **Expired Records**: Immediately discards records where `expiresAt < Date.now()`.
- **Mismatched Contact**: Enforces strict contact boundary filtering (`record.contactId === query.contactId`).
- **Low Confidence**: Excludes records with confidence scores below $0.4$.
- **Type Restrictions**: Filters by explicit `memoryTypes` if provided in `MemoryRetrievalQuery`.

---

## 4. `MemoryContext` Output Schema

```typescript
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
```

---

## 5. Extension Points for Semantic Vector Search

- **`HybridMemoryRanker`**: Combine exact keyword matching with local vector similarity scores ($S_{\text{final}} = \alpha \cdot S_{\text{heuristic}} + \beta \cdot S_{\text{cosine}}$).
- **`VectorMemoryStore`**: Add IndexedDB-backed local vector index adapter implementing `IMemoryStore`.
