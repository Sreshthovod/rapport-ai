# AI_SYSTEM.md — AI Architecture & Prompt Engineering Specification

> **Role**: AI Systems Architect & Lead Prompt Engineer  
> **Status**: Production Specification  
> **Core Pipeline**: Context Assembly -> Risk Assessment -> Strategy Composition -> Token Optimization -> Streaming Validation  

---

## 1. Engine Specifications

### 1.1 Intent Engine
* **Purpose**: Classifies user's active communication intent from draft text and thread context.
* **Responsibilities**: Identifies target goal (*De-escalate*, *Set Boundary*, *Reach Consensus*, *Friendly Follow-up*).
* **Inputs**: Active draft text, recent 3 thread messages.
* **Outputs**: `IntentClassificationResult` (Primary Goal, Intent Confidence, Target Tone).
* **Dependencies**: Lightweight regex heuristics + fast LLM classifier.
* **Failure Cases**: Ambiguous 1-word drafts -> Defaults to `General Professional Alignment`.

### 1.2 Conversation Analyzer
* **Purpose**: Parses active DOM thread text to extract recipient sentiment, communication style, and structural context.
* **Responsibilities**: Calculates recipient brevity index, formality score, and active topic theme.
* **Inputs**: Raw DOM thread snippet (last 10 messages).
* **Outputs**: `ThreadAnalysis` (Recipient Style Metrics, Conversation Urgency, Sentiment Score).
* **Dependencies**: Local NLP tokenizer / pattern analyzer.
* **Failure Cases**: Truncated or empty thread history -> Uses default recipient baseline profile.

### 1.3 Strategy Engine
* **Purpose**: Determines optimal interpersonal tactic to achieve the user's selected goal.
* **Responsibilities**: Selects framing strategy (e.g. *SBI Framework*, *Trade-off Proposal*, *De-escalation Reframe*).
* **Inputs**: `IntentClassificationResult`, `ThreadAnalysis`, `ContactMemoryProfile`.
* **Outputs**: `StrategyDirective` (Framing Rules, Recommended Structural Length, Key Phrases to Include/Avoid).
* **Dependencies**: Prompt Engine, System Strategy Matrices.
* **Failure Cases**: Conflicting goal vs contact preference -> Prioritizes de-escalation & politeness.

### 1.4 Risk Engine
* **Purpose**: Detects high-risk interpersonal friction in real time.
* **Responsibilities**: Scores hostility, passive-aggression, unfulfilled commitments, and accidental PII leakage.
* **Inputs**: Draft text, recent recipient message, local commitment log.
* **Outputs**: `RiskAssessment` (Hostility Index 0-1, Commitment Alert Status, PII Flag).
* **Dependencies**: Local Sentiment Scorer, Commitment Log.
* **Failure Cases**: Sentiment false positives -> Provides 1-click user override.

### 1.5 Prompt Engine
* **Purpose**: Assembles optimized, token-efficient system and user prompts.
* **Responsibilities**: Injecting context, constraints, and strategy into LLM messages.
* **Inputs**: `StrategyDirective`, Prioritized Context Stack.
* **Outputs**: Formatted LLM System Prompt & User Message payload.
* **Dependencies**: Token Optimizer.
* **Failure Cases**: Prompt size exceeds budget -> Truncates oldest thread history.

### 1.6 Memory Engine
* **Purpose**: Manages retrieval and updating of local contact memory nodes.
* **Responsibilities**: Queries IndexedDB for contact profile, extracts new commitments, updates style metrics.
* **Inputs**: Contact Identity Hash, Outgoing Message Event.
* **Outputs**: `ContactMemoryProfile`, Updated Commitment Log.
* **Dependencies**: Local IndexedDB / Dexie.js.
* **Failure Cases**: DB read timeout -> Uses empty ephemeral context.

### 1.7 Response Validator
* **Purpose**: Validates LLM output stream before DOM injection.
* **Responsibilities**: Ensures response contains zero AI meta-fluff (*"Here is your rewrite:"*), strictly adheres to character limits, and preserves key factual facts.
* **Inputs**: Raw streamed completion string.
* **Outputs**: Cleaned text payload ready for DOM insertion.
* **Dependencies**: Sanitization Rules, Regex Filters.
* **Failure Cases**: LLM outputs conversational preamble -> Strips meta-text via regex parser.

### 1.8 Context Builder
* **Purpose**: Prioritizes and stacks relevant context nodes within strict token budgets.
* **Responsibilities**: Orders context elements by relevance score.
* **Inputs**: Thread Snippet, Contact Profile, Commitment Notes, User Draft.
* **Outputs**: Token-capped Context Payload.
* **Dependencies**: Token Counter.
* **Failure Cases**: Budget overflow -> Drops older background notes first.

---

## 2. AI Engine Interaction Diagram

```text
[ Raw DOM Thread ] ──► [ Conversation Analyzer ] ──┐
                                                  ▼
[ User Draft ] ────────► [ Intent & Risk Engines ] ──► [ Strategy Engine ]
                                                  ▲           │
[ IndexedDB ] ─────────► [ Memory Engine ] ────────┘           ▼
                                                     [ Context Builder ]
                                                              │
                                                              ▼
[ DOM Injection ] ◄─── [ Response Validator ] ◄─── [ Streaming LLM ] ◄─── [ Prompt Engine ]
```

---

## 3. Prompt Composition & Pipeline Architecture

### 3.1 Prioritized Context Stack (Token Budgeting)
Total Prompt Budget: **800 Tokens Max** (for sub-400ms TTFT performance).

1. **System Persona & Constraints** (150 tokens) — High Priority
2. **Target Goal & Strategy Directives** (100 tokens) — High Priority
3. **Contact Memory & Style Profile** (100 tokens) — Medium Priority
4. **Current User Draft** (150 tokens) — High Priority
5. **Recent Thread Context** (300 tokens) — Truncated from top if limit exceeded

### 3.2 System Prompt Template

```text
You are Rapport AI, an expert interpersonal communication strategist.
Your task is to rephrase the user's draft to achieve the specified GOAL while matching the RECIPIENT STYLE.

RULES:
1. Output ONLY the exact text to be sent. Zero commentary, intro, or quotes.
2. Preserve all core factual details (dates, numbers, names).
3. Match recipient brevity preference. Never sound synthetic or overly corporate.

GOAL: {{target_goal}}
RECIPIENT PROFILE: {{recipient_style_tags}}
PENDING COMMITMENTS: {{commitment_notes}}

RAW DRAFT: "{{user_draft}}"
RECENT THREAD:
{{recent_thread_snippet}}
```

---

## 4. Optimization Strategies

### 4.1 Token Optimization Strategy
- **Aggressive Truncation**: Limit thread context to last 6 exchanges or 300 words.
- **Stop Sequences**: Enforce strict stop tokens (`\n\n`, `User:`) to prevent model rambling.

### 4.2 Caching Strategy
- **Local Profile Caching**: Cache retrieved contact profiles in memory during active chat sessions (invalidates on tab change).
- **Prompt Hash Caching**: Hashes prompt inputs; returns cached response if identical request repeated within 5 seconds.

### 4.3 Streaming Strategy
- **Server-Sent Events (SSE)**: Stream tokens via SSE directly to content script Shadow DOM overlay.
- **First Token Budget (TTFT)**: Target <350ms Time-To-First-Token using lightweight models (`gpt-4o-mini`, `claude-3-5-haiku`).
