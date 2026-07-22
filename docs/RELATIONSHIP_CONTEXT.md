# Relationship Context Engine Architecture

The **Relationship Context Engine** (`RelationshipEngine`) enables **Rapport AI** to understand *WHO* the user is communicating with, moving beyond isolated message strings to analyze interpersonal dynamics and relationship histories.

---

## 1. Architecture Overview

```
WhatsApp Adapter ──► Raw Thread Context
                             │
                             ▼
                 [ ContextEngine Pipeline ]
                             │
     ┌───────────────────────┴───────────────────────┐
     ▼                                               ▼
[ ConversationIntelligenceEngine ]          [ RelationshipEngine ]
 (Topic, Tone, Intent, Health)               (Who is this contact?)
     │                                               │
     │                                               ▼
     │                                    [ IRelationshipStorage ]
     │                                    (Profile & Metadata Store)
     │                                               │
     └───────────────────────┬───────────────────────┘
                             ▼
                  StructuredAIContext
                             │
                             ▼
                 ProviderPromptRequest ──► AI Model Providers
```

---

## 2. Relationship Profile & Storage Abstraction

The engine maintains a lightweight `RelationshipProfile` for every active contact. Storage is completely decoupled behind the `IRelationshipStorage` interface:

```typescript
export interface IRelationshipStorage {
  getProfile(contactId: string): Promise<RelationshipProfile | null>;
  saveProfile(profile: RelationshipProfile): Promise<void>;
}
```

### Persisted Metadata (No Raw Text)
To respect privacy and conserve memory, raw message text is **never** persisted to storage profiles. Only statistical metadata is stored:
- `contactId` & `contactName`
- `relationshipType` (`friend` | `family` | `work` | `unknown`)
- `totalInteractions` & timestamps (`firstSeenTimestamp`, `lastSeenTimestamp`)
- `averageMessageLength`
- `commonTopics` & `recurringPhrases`
- `interactionScore` (0.0 to 100.0)

---

## 3. Communication Style & Relationship Heuristics

The `RelationshipHeuristics` engine evaluates message histories to derive a structured `RelationshipContext`:

- **Formality**: `formal` vs `casual` (checking professional greetings vs informal abbreviations/slang).
- **Playfulness**: `playful` vs `serious` (evaluating humor cues, laughter markers, and emojis).
- **Expressiveness**: `emotionally_expressive` vs `concise` (measuring average character length per message and emoji density).
- **Relationship Type**: Inferred automatically (`work`, `family`, `friend`, `unknown`).
- **Interaction Score**: Dynamic engagement score (0 to 100) combining total interaction count and recency.

---

## 4. Prompt Orchestrator Payload

Model providers receive the complete 3-tier contextual payload:

$$\text{Provider Payload} = \text{Conversation Context} + \text{Conversation Intelligence} + \text{Relationship Context}$$

```typescript
export interface ProviderPromptRequest {
  conversationSummary: string;
  latestMessages: string[];
  detectedTone: string;
  objective?: string;
  maxSuggestions?: number;
  intelligence?: ConversationIntelligence;
  relationship?: RelationshipContext;
}
```

---

## 5. Extension Points (IndexedDB & Cloud Sync)

1. **IndexedDB Persistent Adapter**: Implement `IndexedDBRelationshipStorage` implementing `IRelationshipStorage` for long-term browser storage across sessions.
2. **Cloud Sync Storage Adapter**: Implement `CloudSyncRelationshipStorage` to sync contact interaction profiles across user devices securely.
