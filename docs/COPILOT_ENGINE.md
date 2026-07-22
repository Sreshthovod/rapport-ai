# Conversation Copilot Engine Architecture

The **Conversation Copilot Engine** (`CopilotEngine`) is a proactive assistant decision layer in **Rapport AI**. It evaluates conversation state, relationship metrics, and intelligence signals to determine *WHEN* the user should be assisted and *WHAT* kind of assistance is most valuable (`Suggest Reply`, `Confirm Plans`, `Break the Silence`, `Lighten the Mood`, etc.).

---

## 1. Copilot Decision Pipeline

```
WhatsApp Thread Context
          │
          ▼
 StructuredAIContext (ContextEngine)
          │
          ├───────────────────────────────────┐
          ▼                                   ▼
ConversationIntelligence              RelationshipContext
          │                                   │
          └─────────────────┬─────────────────┘
                            ▼
                    [ CopilotCache ] ──(Cache Hit?)──► Return Cached CopilotDecision
                            │ (Cache Miss)
                            ▼
                   [ CopilotHeuristics ]
          (Prioritized Opportunity Detection)
                            │
                            ▼
                     CopilotDecision
            (Primary & All Recommendations)
                            │
                            ▼
             Non-Intrusive Overlay Display
          (Proactive Tip Chips in AIModal)
```

---

## 2. Assistance Opportunities & Heuristics

The `CopilotHeuristics` engine evaluates context against 5 core opportunity categories:

1. **`Confirm Plans`**: Triggers when unconfirmed plans or date references (`tomorrow`, `lunch`, `weekend`) are detected in pending context. (Priority: `high`).
2. **`Suggest Reply`**: Triggers when unanswered questions from incoming messages require a response. (Priority: `high`).
3. **`Break the Silence`**: Triggers when conversation pace is inactive or engagement drops to low. (Priority: `medium`).
4. **`Lighten the Mood`**: Triggers when high emotional tension or playful flirtation rapport is detected. (Priority: `high`/`medium`).
5. **`Suggest Follow-up Question`**: Default continuation recommendation ensuring smooth dialogue progression. (Priority: `low`).

---

## 3. Structured Copilot Decision Schema

```typescript
export type AssistanceType =
  | 'Suggest Reply'
  | 'Suggest Follow-up Question'
  | 'Break the Silence'
  | 'Confirm Plans'
  | 'Lighten the Mood'
  | 'Clarify Message'
  | 'Respond More Politely'
  | 'Respond More Confidently';

export interface CopilotRecommendation {
  id: string;
  type: AssistanceType;
  title: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  confidence: number;
  suggestedGoal: PromptGoal;
}

export interface CopilotDecision {
  timestamp: number;
  shouldAssist: boolean;
  primaryRecommendation: CopilotRecommendation | null;
  allRecommendations: CopilotRecommendation[];
}
```

---

## 4. Overlay UX Integration

Copilot tips are surfaced inside `AIModal` as non-intrusive recommendation chips (`💡 Copilot Tip: Confirm pending plans & schedule alignment`). This design guarantees that recommendations remain helpful without obstructing the user's active WhatsApp chat view.

---

## 5. Performance & Caching

Decisions are cached in `CopilotCache` using state signatures (`contactId_msgCount_lastTimestamp`). Re-computations only occur when new messages arrive or when the active WhatsApp chat tab changes.

---

## 6. Future Extension Points

- **Proactive Floating Toolbar Badges**: Render a subtle notification dot on the floating toolbar header when a `high` priority recommendation (e.g. urgent plan confirmation) is active.
- **Neural Opportunity Scoring**: Augment heuristic rule evaluation with local small LLMs to predict optimal user action intent.
