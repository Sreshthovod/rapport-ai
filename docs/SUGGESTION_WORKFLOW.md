# AI Suggestion Workflow Architecture & UX Specifications

The **AI Suggestion Workflow** delivers the complete end-to-end user experience for **Rapport AI** on WhatsApp Web. It connects extracted conversation context with the model provider architecture to render interactive multi-suggestion reply cards.

---

## 1. Complete Workflow Architecture

```
User Clicks "AI" on Floating Toolbar
               │
               ▼
   [ Content Script Handler ] ──► Extracts recent thread & draft context via WhatsAppAdapter
               │
               ▼
 [ chrome.runtime.sendMessage ] ──► Message payload: RAPPORT_AI_GENERATE_REPLY
               │
               ▼
[ Background Service Worker ] ──► Routes request via AIService.generateReply()
               │
               ▼
     [ ContextEngine ] ──► Builds StructuredAIContext (normalization, tone, stage, facts)
               │
               ▼
    [ ProviderRegistry ] ──► Resolves active provider (FakeProvider)
               │
               ▼
      [ FakeProvider ] ──► Builds ProviderPromptRequest & generates 4 multi-tone suggestions
               │
               ▼
   [ AISuggestion[] ] ──► Returns AISuggestion cards with tone badges, reasoning & confidence
               │
               ▼
      [ AIModal UI ] ──► Renders scrollable suggestion cards with Copy & Insert actions
```

---

## 2. Reply Styles & Tone Badges

The engine generates distinct suggestions tailored across multiple communication styles:
- **`Friendly`**: Warm, supportive, emoji-enhanced replies for casual contacts.
- **`Professional`**: Clear, formal, direct messaging for business alignment.
- **`Funny`**: Lighthearted humor for informal exchanges.
- **`Short`**: Ultra-concise, quick responses for rapid updates.

---

## 3. Provider Prompt Request Schema (`ProviderPromptRequest`)

Providers consume a standardized request schema:
```typescript
export interface ProviderPromptRequest {
  conversationSummary: string;
  latestMessages: string[];
  detectedTone: string;
  objective?: string;
  requestedReplyStyle?: string;
  maxSuggestions?: number;
}
```

---

## 4. One-Click Copy & Insert UX

- **One-Click Copy**: Clicking **📋 Copy** on any suggestion card copies the text directly to the system clipboard and toggles a 2-second **Copied! ✓** confirmation badge.
- **Direct Draft Insertion**: Clicking **Insert Draft ↵** fills the active WhatsApp message input field automatically.
- **Regenerate Action**: Clicking **🔄 Refresh** triggers a new generation pipeline run without closing the modal interface.

---

## 5. Extension & Roadmap Points

### Future OpenAI / Claude / Gemini Provider Integration
Real AI providers (`OpenAIProvider`, `ClaudeProvider`, etc.) will consume `ProviderPromptRequest` directly to format JSON system prompts and request structured completion outputs matching `AISuggestion[]`.

### Future Memory Engine Integration
Persistent contact memories and extracted facts from `ContextEngine` will automatically populate `ProviderPromptRequest.conversationSummary` to tailor suggestions based on long-term relationship context.
