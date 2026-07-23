# Prompt Quality & Response Generation System

The **Prompt Quality System** provides a provider-independent prompt compilation and response evaluation architecture for **Rapport AI**. It transforms raw context, relationship profiles, and intelligence signals into versioned, structured prompt specifications (`CompiledPromptSpec`) that produce consistent multi-variant reply suggestions across any model provider.

---

## 1. Prompt Pipeline Architecture

```
Conversation Context + Relationship Context + Intelligence Signals
                               │
                               ▼
                       [ PromptComposer ]
             (TemplateRegistry + PromptConstraints)
                               │
                               ▼
             CompiledPromptSpec (Versioned v1.0.0)
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
     Safe Variant       Balanced Variant     Creative Variant
          │                    │                    │
          └────────────────────┼────────────────────┘
                               ▼
                    [ Provider Execution ]
                   (OpenAI / Claude / Fake)
                               │
                               ▼
                    [ ResponseEvaluator ]
              (5-Criteria Deterministic Scoring)
                               │
                               ▼
               Scored Multi-Suggestion Response
```

---

## 2. Reusable Template System (11 Communication Goals)

The `TemplateRegistry` stores default directives and constraint defaults across 11 core goals:
1. **`Reply Suggestions`**: Standard thread reply generation.
2. **`Continue Conversation`**: Natural dialogue progression.
3. **`Revive Dry Conversation`**: Engaging re-activation of stalled chats.
4. **`Ask Better Questions`**: Open-ended curiosity drivers.
5. **`Flirty Conversation`**: Witty, charming flirtation.
6. **`Professional Conversation`**: Formal, clear business correspondence.
7. **`Friendly Conversation`**: Warm, supportive connection.
8. **`Apology`**: Sincere, empathetic regret.
9. **`Invitation`**: Low-pressure hangout or meeting invites.
10. **`Follow-up`**: Polite status checks on prior commitments.
11. **`Closing Conversation`**: Warm dialogue wrap-ups.

---

## 3. Multi-Variant Strategy & Versioning

Every `CompiledPromptSpec` includes version string `v1.0.0` and 3 prompt strategy instructions:
- **Option A (Safe)**: Low-risk, polite, agreeable reply.
- **Option B (Balanced)**: Naturally engaging response balancing warmth and directness.
- **Option C (Creative)**: Witty, intriguing, or charismatic response.

---

## 4. Response Evaluation Scoring

The `ResponseEvaluator` scores generated replies deterministically across 5 criteria ($0.0 \to 1.0$):
1. **Contextual Relevance**: Verifies non-robotic text and snippet alignment.
2. **Tone Consistency**: Verifies target tone match.
3. **Relationship Consistency**: Ensures style matches relationship type (e.g. avoiding slang with work contacts).
4. **Conversational Progression**: Ensures reply length and substance move the conversation forward.
5. **Readability**: Checks punctuation, character count, and structural flow.

$$\text{Overall Confidence} = \frac{\text{Relevance} + \text{Tone} + \text{Relationship} + \text{Progression} + \text{Readability}}{5}$$

---

## 5. Extension Points (Model Compilers)

- **OpenAI Compiler (`OpenAIPromptCompiler`)**: Translates `CompiledPromptSpec` into system/user messages for `gpt-4o` or `gpt-4o-mini`.
- **Claude Compiler (`ClaudePromptCompiler`)**: Translates `CompiledPromptSpec` into Anthropic Messages API format.
- **Gemini Compiler (`GeminiPromptCompiler`)**: Translates `CompiledPromptSpec` into Google GenAI `Content` blocks with system instructions.
