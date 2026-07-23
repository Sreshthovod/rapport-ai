# Memory Extraction Engine Architecture

The **Memory Extraction Engine** (`MemoryExtractor`) in **Rapport AI** is a deterministic, provider-independent feature of `@rapport/memory`. It converts raw conversation threads, intelligence metrics, and relationship signals into structured `MemoryCandidate[]` without relying on AI calls or embeddings.

---

## 1. Extraction Pipeline Architecture

```
Conversation (Canonical Messages)
               │
               ▼
   [ ContextEngine & Intelligence ]
               │
               ▼
       [ MemoryExtractor ]
       (ExtractionRules & ImportanceScorer)
               │
               ▼
       MemoryCandidate[] (Temporary & Permanent)
               │
               ▼
        [ MemoryService ]
  (Validation & Deduplication)
               │
               ▼
        [ IMemoryStore ]
   (BrowserStorageMemoryStore)
```

---

## 2. Extraction Heuristics & Categories

- **`PERSON`**: Names, nicknames, family relationships.
- **`PREFERENCE` & `INTEREST`**: Favourite food, movies, music, hobbies, activities.
- **`EVENT` & `DATE`**: Birthdays, anniversaries, special dates.
- **`PLAN` & `LOCATION`**: Meetings, trips, scheduled activities, geographic locations.
- **`PROMISE` & `GOAL`**: Explicit commitments (`i promise`, `i'll send`), career/personal goals.

---

## 3. Importance & Expiration Logic

### Importance Scoring (`ImportanceScorer`)
- **`CRITICAL`**: Birthdays, explicit commitments/promises (`i promise`), urgent logistics.
- **`HIGH`**: Future meeting dates, travel plans, personal goals.
- **`NORMAL`**: Food/movie preferences, hobbies, locations.
- **`LOW`**: Casual references with lower confidence scores.

### Expiration Rules
- **Temporary Memories**: Plans with temporal phrases (`tomorrow`, `this weekend`, `next friday`) receive calculated `expiresAt` timestamps (e.g. 7-day expiration).
- **Permanent Memories**: Fact-based preferences, birthdays, locations, and interests have no expiration (`expiresAt = undefined`).

---

## 4. Example Extracted Memories

### Example A: Food Preference
```json
{
  "type": "PREFERENCE",
  "title": "Food Preference",
  "content": "I am totally obsessed with authentic Japanese sushi and ramen 🍣",
  "importance": "NORMAL",
  "confidence": 0.9,
  "tags": ["food", "preference"],
  "source": "extracted_heuristic"
}
```

### Example B: Upcoming Plan (Temporary)
```json
{
  "type": "PLAN",
  "title": "Upcoming Plan / Meeting",
  "content": "Hey, are we still free for lunch tomorrow at 1pm?",
  "importance": "NORMAL",
  "confidence": 0.91,
  "tags": ["plan", "meeting"],
  "expiresAt": 1780000000000
}
```

### Example C: Promised Commitment
```json
{
  "type": "PROMISE",
  "title": "Promised Commitment",
  "content": "Yes! I will send you the restaurant address in a bit.",
  "importance": "CRITICAL",
  "confidence": 0.93,
  "tags": ["promise", "commitment"]
}
```

---

## 5. Extension Points & Roadmap

1. **`HybridMemoryExtractor`**: Integrate optional small LLM zero-shot classification to validate edge-case heuristic candidates.
2. **`MemoryRetrievalEngine`**: Context-aware retrieval engine filtering stored memories by active conversation contact ID and topic keywords for injection into prompt specs.
