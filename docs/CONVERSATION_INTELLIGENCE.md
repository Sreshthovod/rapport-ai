# Conversation Intelligence Engine Architecture

The **Conversation Intelligence Engine** (`ConversationIntelligenceEngine`) is a deterministic, provider-independent analysis subsystem in **Rapport AI**. It evaluates normalized conversation threads to extract high-level conversational signals (multi-tone confidence scores, intents, health metrics, pending questions, and AI goal recommendations) before passing enriched payloads to model providers.

---

## 1. Intelligence Pipeline Architecture

```
Raw Thread / Canonical Messages
               │
               ▼
   [ IntelligenceCache ] ──(Cache Hit?)──► Return Cached ConversationIntelligence
               │ (Cache Miss)
               ▼
 ┌──────────────────────────────────────────────────────────┐
 │               Analysis Subsystems Pipeline               │
 ├──────────────────────────────────────────────────────────┤
 │ 1. ConversationAnalyzer    ──► Topic, direction, focus  │
 │ 2. MultiToneAnalyzer       ──► Multi-tone scores & %    │
 │ 3. IntentAnalyzer          ──► Primary intent & %       │
 │ 4. HealthAnalyzer          ──► Balance & engagement     │
 │ 5. PendingContextAnalyzer  ──► Questions, plans, dates  │
 │ 6. ObjectiveRecommender    ──► Recommended AI goal      │
 └──────────────────────────────────────────────────────────┘
               │
               ▼
   ConversationIntelligence Object ──► Enriches StructuredAIContext & ProviderPromptRequest
```

---

## 2. Analysis Subsystems & Heuristics

- **`ConversationAnalyzer`**: Identifies discussion focus, active participants, message direction (`incoming` vs `outgoing`), and high-level topic classification (`Scheduling & Alignment`, `Work & Project Coordination`, `Social Plans`, `General Conversation`).
- **`MultiToneAnalyzer`**: Computes confidence scores (0.0 to 1.0) across 10 simultaneous tone indicators: `Friendly`, `Professional`, `Flirty`, `Romantic`, `Formal`, `Supportive`, `Playful`, `Serious`, `Emotional`, `Neutral`.
- **`IntentAnalyzer`**: Detects primary objectives: `Asking Question`, `Making Plans`, `Apologizing`, `Inviting`, `Greeting`, `Explaining`, `Persuading`, `Following Up`, `Checking In`, `Ending Conversation`.
- **`HealthAnalyzer`**: Evaluates conversation balance ratio (`balanceScore`), status (`Balanced conversation` vs `One-sided conversation`), engagement level (`High engagement` vs `Low engagement`), and reply pace (`Fast`, `Slow`, `Moderate`).
- **`PendingContextAnalyzer`**: Tracks unresolved items: `questionsAwaitingReply`, `unconfirmedPlans`, `datesMentioned`, `commitments`, `tasks`, and `promises`.
- **`ObjectiveRecommender`**: Recommends AI interaction goals: `Continue naturally`, `Be playful`, `Move conversation forward`, `Clarify misunderstanding`, `Ask follow-up question`, `Confirm plans`, `End politely`.

---

## 3. Public Interfaces

```typescript
export interface DetectedToneScore {
  tone: string;
  confidence: number;
}

export interface DetectedIntentScore {
  intent: string;
  confidence: number;
}

export interface ConversationHealthMetrics {
  balanceScore: number;
  balanceStatus: 'Balanced conversation' | 'One-sided conversation';
  engagementLevel: 'High engagement' | 'Low engagement';
  replyPace: 'Fast replies' | 'Slow replies' | 'Moderate replies';
  isRecentlyInactive: boolean;
}

export interface ConversationIntelligence {
  topic: string;
  tones: DetectedToneScore[];
  intents: DetectedIntentScore[];
  health: ConversationHealthMetrics;
  pendingItems: PendingContextItems;
  suggestedGoal: string;
  confidenceScores: Record<string, number>;
}
```

---

## 4. Performance & Caching

The `IntelligenceCache` implements a lightweight LRU/hash cache keyed by `contactId_msgCount_lastTimestamp_draftSnippet`. When conversation state has not changed, analysis results are retrieved instantly in $O(1)$ time without redundant string pattern processing.

---

## 5. Extension Points & Future Integrations

### Future AI-Enhanced Analysis
When local small LLMs or cloud API providers are enabled, `ConversationIntelligenceEngine` can run multi-class classification prompts to augment heuristic confidence scores with neural sentiment analysis.

### Future Memory Engine Integration
Extracted intelligence signals (`health.balanceStatus`, `pendingItems`, `suggestedGoal`) will automatically persist into the contact's long-term profile to guide multi-session relationship coaching.
