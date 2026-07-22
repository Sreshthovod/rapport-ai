# Memory Prompt Orchestrator Integration Architecture

The **Memory Prompt Orchestrator Integration** connects `@rapport/memory` into `@rapport/ai-core` so every AI provider request (OpenAI, Claude, Gemini, local models) receives relevant long-term memory facts without allowing providers to interact with storage directly.

---

## 1. Prompt Assembly Flow

```
Conversation Thread Context
          │
          ▼
 ContextEngine.processContextAsync()
          │
          ├──► Synchronous Fact & Tone Extraction
          │
          └──► MemoryRetriever.retrieveMemoryContext() (Asynchronous & Resilient)
                    │
                    ▼
           StructuredAIContext (containing memoryContext)
                    │
                    ▼
           [ MemoryPromptBudget ]
    (Max 5 memories, Max 600 chars budget)
                    │
                    ▼
           [ PromptComposer.compose() ]
      (Structured Memory Prompt Section)
                    │
                    ▼
           CompiledPromptSpec
                    │
                    ▼
   ProviderManager -> OpenAI / Claude / Gemini
```

---

## 2. Memory Selection Strategy & Prompt Budgeting (`MemoryPromptBudget`)

To prevent prompt token overflow and ensure only high-signal interpersonal context is sent:

- **Max Memories Limit**: Maximum of 5 records selected per prompt request.
- **Max Character Budget**: Maximum of 600 characters for the memory section.
- **Importance Ordering**: Memories are prioritized by importance (`CRITICAL` > `HIGH` > `NORMAL` > `LOW`) and relevance score.
- **Truncation & Discarding**: Excess memories exceeding character limits are discarded cleanly and logged in development mode.

---

## 3. System Prompt Memory Section Format

```
=== RELEVANT INTERPERSONAL MEMORIES ===
- [CRITICAL EVENT] Sister Birthday: Sister Sarah birthday celebration on March 15th.
- [HIGH PLAN] Tokyo Trip Plan: Planning a 2-week vacation to Tokyo and Kyoto next month.
- [NORMAL PREFERENCE] Favorite Restaurant: Loves authentic Japanese sushi and ramen at Morimoto.
```

---

## 4. Development-Mode Prompt Debugging

In non-production environments (`process.env.NODE_ENV !== 'production'`), `PromptComposer` automatically logs:
- Selected memory titles
- Discarded memory titles
- Character size before and after budgeting optimization

---

## 5. Resilient Fallback Behavior

If `MemoryRetriever` encounters storage issues or throws an error:
- `ContextEngine.processContextAsync()` catches the exception silently.
- It returns the base `StructuredAIContext` without `memoryContext`.
- `PromptComposer` compiles system prompts without the memory section.
- **Result**: AI reply generation never fails due to memory subsystem errors.
