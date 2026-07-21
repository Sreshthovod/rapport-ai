# FEATURES.md — Product Requirements & Feature Blueprint

> **Product Name**: Rapport AI (AI Conversation Copilot)  
> **Author**: Senior Product Manager (OpenAI) & YC Product Partner  
> **Status**: Final Feature Specification  
> **MVP Focus**: Slack Web (`app.slack.com`) & WhatsApp Web (`web.whatsapp.com`)  

---

## 1. End-to-End Ideal User Journey

```text
[ 1. Setup & Key Config ] ──► [ 2. Thread Focus ] ──► [ 3. Context Recall ] ──► [ 4. Inline Nudge / Prompt ]
   (BYOK / Tone Prefs)         (Slack/WhatsApp DOM)    (Local Contact Graph)      (Shadow DOM Floating Bar)
                                                                                          │
[ 8. Memory Update ] ◄─── [ 7. Message Dispatch ] ◄─── [ 6. Insertion ] ◄─── [ 5. Real-Time Stream ]
  (Commitment Logged)      (Native Input Event)         (1-Click Accept)      (Vercel AI SDK / Local LLM)
```

### Detailed Flow Sequence:
1. **Zero-Friction Activation**: User installs extension and configures API Key (OpenAI / Claude / Gemini) in a 30-second onboarding drawer.
2. **Contextual Thread Awareness**: User opens a high-stakes conversation thread on Slack Web or WhatsApp Web. The content script's DOM observer silently parses the active contact name and thread messages.
3. **Relational Context Retrieval**: The extension queries local IndexedDB storage to fetch the contact's style profile, past commitments, and preferred communication tone.
4. **Line-of-Sight UI Injection**: A clean, non-intrusive floating control bar mounts inside a closed Shadow DOM directly above the chat input box.
5. **Interactive Drafting & Micro-Calibration**: As the user types, the copilot displays real-time badges (e.g., *"Pending Commitment: Send Q3 Slide Deck by 4 PM"*) and tone guidance.
6. **Goal-Directed Transformation**: User selects a tactical goal (*De-escalate*, *Set Boundary*, *Reach Consensus*) or hits `Cmd+K` to transform draft.
7. **Streaming Suggestion**: Streaming completion tokens render directly into the Shadow DOM widget.
8. **Native DOM Insertion & Memory Update**: User accepts suggestion via keyboard shortcut or click; text is dispatched into the host input field. The local memory graph updates commitment status and interaction logs.

---

## 2. Comprehensive Feature Matrix

### A. Core Product Mechanics (Foundational Engine)

#### 1. Native Shadow DOM Overlay Engine [CORE]
* **Purpose**: Mounts extension UI elements inside web apps without CSS bleeding or host app script conflicts.
* **User Problem Solved**: Clunky extensions that break host page layouts or get overridden by Slack/WhatsApp CSS.
* **User Flow**: Operates automatically in the background; mounts floating triggers adjacent to active input textareas.
* **Why It Matters**: Absolute UI stability and zero layout breakage on third-party web apps.
* **Priority**: Critical
* **Estimated Complexity**: Medium
* **Dependencies**: WebExtension Manifest V3 Content Scripts.
* **Success Metric**: 99.9% clean mount rate across DOM mutations without layout shifts.

#### 2. Local Relational Storage Engine (IndexedDB) [CORE] [UNIQUE USP]
* **Purpose**: Stores contact profiles, communication styles, and commitment logs locally on device.
* **User Problem Solved**: Privacy risks associated with sending personal chat logs to third-party databases.
* **User Flow**: Operates silently on device; saves contact metadata without user configuration.
* **Why It Matters**: Provides zero-cloud confidentiality, making it safe for corporate executives and legal teams.
* **Priority**: Critical
* **Estimated Complexity**: Medium
* **Dependencies**: Dexie.js / Browser IndexedDB.
* **Success Metric**: <15ms local query response time for context retrieval.

---

### B. MVP Features (Hackathon Scope)

#### 3. Commitment Guardrail (Passive Promise Tracker) [MVP] [UNIQUE USP]
* **Purpose**: Passively detects commitments in active chat threads and displays an inline warning before message send.
* **User Problem Solved**: Forgetting soft promises made in fast-moving chats (*"I'll send that report by 3 PM"*), which damages trust.
* **User Flow**: As thread loads, commitment scanner highlights unfulfilled promises in a top-bar badge. If user types a sign-off without addressing pending tasks, a soft warning appears.
* **Why It Matters**: Solves a daily human problem; acts as personal reliability insurance.
* **Priority**: Critical
* **Estimated Complexity**: Medium
* **Dependencies**: Local IndexedDB, Regex/Semantic Thread Parser.
* **Success Metric**: >90% precision in detecting informal commitments in chat history.

#### 4. Real-Time De-Escalation Brake [MVP] [UNIQUE USP]
* **Purpose**: Intercepts emotionally charged, aggressive, or defensive draft messages and offers a 1-click calm rephrase.
* **User Problem Solved**: Sending impulse messages during workplace frustration that cause long-term relational damage.
* **User Flow**: Host input monitor checks sentiment score of user draft. If hostility/defensiveness index > threshold, a soft red indicator appears with a *"De-escalate & Rephrase"* prompt.
* **Why It Matters**: Executive career insurance; prevents costly workplace arguments.
* **Priority**: Critical
* **Estimated Complexity**: Medium
* **Dependencies**: Vercel AI SDK, Hono API Gateway.
* **Success Metric**: >85% acceptance rate of de-escalated draft rewrites.

#### 5. Contact Style Mirroring & Tone Selector [MVP]
* **Purpose**: Re-architects outgoing drafts into 4 core tones (*Professional*, *Direct*, *Empathetic*, *De-escalating*).
* **User Problem Solved**: Tone mismatch causing misinterpretation between direct VPs and warm client contacts.
* **User Flow**: User types rough thoughts -> Clicks tone pills on floating Shadow DOM bar -> Streamed transformed draft replaces input text.
* **Why It Matters**: Core daily utility for quick, high-clarity phrasing.
* **Priority**: Critical
* **Estimated Complexity**: Low
* **Dependencies**: Hono Backend API, System Prompts.
* **Success Metric**: Average generation latency <800ms.

#### 6. Active Thread DOM Scraper [MVP]
* **Purpose**: Extracts recent message history from visible Slack Web or WhatsApp Web DOM nodes.
* **User Problem Solved**: Eliminates copy-pasting chat history into external LLM prompts.
* **User Flow**: Content script parses visible message elements on thread switch or focus.
* **Why It Matters**: Foundation for all contextual awareness.
* **Priority**: Critical
* **Estimated Complexity**: Medium
* **Dependencies**: MutationObserver, DOM Selectors for Slack/WhatsApp.
* **Success Metric**: Clean thread extraction across 95% of standard DOM layouts.

---

### C. Phase 2 Features (Post-Launch Expansion)

#### 7. Tactical Pushback & Boundary Shield [PHASE 2] [UNIQUE USP]
* **Purpose**: 1-click tactical response formulas to decline scope creep, push back on deadlines, or set boundaries politely.
* **User Problem Solved**: Struggling to say "no" to clients or managers without sounding unproductive or rude.
* **User Flow**: User highlights incoming request -> Clicks *"Decline Gracefully"* or *"Offer Trade-offs"* -> AI generates firm, polite refusal.
* **Why It Matters**: High value for over-committed engineers, freelancers, and agency leads.
* **Priority**: High
* **Estimated Complexity**: Medium
* **Dependencies**: MVP Prompt Engine, DOM Thread Extractor.
* **Success Metric**: 40% daily active adoption among freelance/agency users.

#### 8. Subtext & Intent Decoder Overlay [PHASE 2]
* **Purpose**: Explains underlying urgency, passive-aggression, and hidden expectations behind vague incoming messages.
* **User Problem Solved**: Anxiety and cultural confusion from interpreting ambiguous manager/client texts.
* **User Flow**: User hovers over incoming chat bubble -> Clicks *"Decode Subtext"* -> Tooltips surface intent breakdown.
* **Why It Matters**: Invaluable for non-native English communicators and junior employees.
* **Priority**: High
* **Estimated Complexity**: Medium
* **Dependencies**: Thread Scraper, LLM Subtext Prompts.
* **Success Metric**: >80% user rating on intent decoding accuracy.

#### 9. Local Vector RAG Engine (Transformers.js) [PHASE 2] [UNIQUE USP]
* **Purpose**: Performs local semantic vector search over historical conversation archives inside the browser.
* **User Problem Solved**: Recalling promises or agreements made months ago across long chat histories without sending text to cloud servers.
* **User Flow**: Operates in Web Worker; indexes thread text into local vector space.
* **Why It Matters**: Completes the local-first privacy moat.
* **Priority**: High
* **Estimated Complexity**: High
* **Dependencies**: `@xenova/transformers`, Web Workers, IndexedDB Vector Index.
* **Success Metric**: Sub-second local semantic search over 10,000+ indexed messages.

#### 10. Sidepanel Relational Memory Inspector [PHASE 2]
* **Purpose**: Extension sidepanel UI allowing users to view, edit, and manage contact relationship profiles and commitments.
* **User Problem Solved**: Lack of transparency and control over what the AI remembers about contacts.
* **User Flow**: User opens Chrome Sidepanel -> Searches contact -> Views commitment history and tone preferences -> Edits custom notes.
* **Why It Matters**: Establishes user trust and data control.
* **Priority**: Medium
* **Estimated Complexity**: Medium
* **Dependencies**: React 18 Sidepanel App, Dexie.js.
* **Success Metric**: Weekly active engagement with Sidepanel Inspector.

---

### D. Phase 3 Features (Enterprise & Advanced Intelligence)

#### 11. Local Offline LLM Execution (Ollama / WebLLM) [PHASE 3] [HACKATHON EXCLUDED]
* **Purpose**: Enables 100% offline, on-device AI generation using WebLLM or local Ollama instances.
* **User Problem Solved**: Air-gapped compliance for defense, legal, and financial industries.
* **User Flow**: Settings toggle -> Select *"Local Offline Model"* -> Requests route to local WASM/WebGPU endpoint.
* **Why It Matters**: Ultimate privacy guarantee; zero internet connectivity required.
* **Priority**: Medium
* **Estimated Complexity**: Very High
* **Dependencies**: WebGPU, WebLLM / Ollama APIs.
* **Success Metric**: On-device generation speed >15 tokens/sec.

#### 12. Multimodal Voice-Note-to-Structured-Text Polish [PHASE 3] [HACKATHON EXCLUDED]
* **Purpose**: Transcribes local audio dictation, strips filler words, and restructures rambling thoughts into polished chat responses.
* **User Problem Solved**: Sending long, rambling voice notes that recipients hate listening to.
* **User Flow**: Hold mic button on overlay -> Dictate thoughts -> Release -> Structured draft appears.
* **Why It Matters**: Massive productivity accelerator for mobile/desktop voice typists.
* **Priority**: Medium
* **Estimated Complexity**: High
* **Dependencies**: Whisper API / Web Speech API, Audio Stream Handler.
* **Success Metric**: 50% reduction in drafting time compared to manual typing.

#### 13. Cross-Platform Health & Rapport Dashboard [PHASE 3] [HACKATHON EXCLUDED]
* **Purpose**: Analytics dashboard visualizing communication velocity, empathy score trends, and response responsiveness.
* **User Problem Solved**: Lack of awareness regarding failing business relationships or team burnout.
* **User Flow**: Open web dashboard -> View team communication health metrics and risk alerts.
* **Why It Matters**: Enterprise management and Key Account Management (KAM) utility.
* **Priority**: Low
* **Estimated Complexity**: High
* **Dependencies**: Aggregated Local Metrics Engine, Charting Library.
* **Success Metric**: Monthly executive retention rates.

---

### E. Future Vision (Moonshots)

#### 14. Autonomous Multi-Thread Action Agent [FUTURE VISION] [HACKATHON EXCLUDED]
* **Purpose**: Cross-thread agent that automatically coordinates schedules, gathers approvals, and drafts update messages across multiple Slack channels autonomously.
* **User Problem Solved**: Manual tracking of multi-stakeholder project approvals.
* **Why It Matters**: Shift from writing assistant to autonomous workplace coordinator.

---

## 3. Explicit Hackathon Exclusion List ("DO NOT BUILD")

To guarantee delivery of a flawless, bug-free MVP within a hackathon timeframe, the following features are **STRICTLY EXCLUDED** from initial development:

| Feature Name | Reason for Exclusion | Target Phase |
| :--- | :--- | :--- |
| **Local WebGPU / Ollama LLM** | Extremely heavy binary sizes, WebGPU browser support variances, and high setup friction for judges. | Phase 3 |
| **Cross-Platform Health Dashboard** | High UI complexity with low impact during a 2-minute demo. | Phase 3 |
| **Voice-to-Text Audio Pipeline** | Audio permissions, noise handling, and transcription latency add unnecessary risk. | Phase 3 |
| **Multi-Thread Autonomous Agents** | High risk of non-deterministic behavior during live evaluation. | Future Vision |
| **Custom Enterprise Team Roles / SAML** | Zero value for hackathon judging panel. | Phase 3 |

---

## 4. Recommended "Smallest Magical MVP" for YC & OpenAI Judges

To blow judges away in a 2-minute presentation, focus on a **tight, flawless 48-hour MVP scope**:

### The 3 Core Pillars of the Hackathon MVP:
1. **Target Single Platform First**: **Slack Web** (`app.slack.com`) — Highest concentration of professional workplace communication pain.
2. **The "Commitment Guardrail" Badge**: Show an active Slack thread where the recipient asked for a deliverable yesterday. As the user starts typing a casual *"Hey, what's up?"*, the injected Shadow DOM bar alerts:  
   > ⚠️ *Unfulfilled Commitment: "Send pitch deck by Tuesday"*  
   And provides a 1-click button: *"Draft Follow-up with Pitch Deck"*.
3. **The "De-Escalation Brake" Live Reaction**: Type a harsh, annoyed message into the input field (*"Why haven't you fixed this bug yet? This is unacceptable."*). Watch the copilot immediately flash a soft warning:  
   > 🛑 *Tone Alert: Hostile / Passive-Aggressive*  
   And stream a perfect de-escalated alternative with 1-click replacement.

### Why This Wins:
- **Instant Understanding**: Judges understand the problem within 5 seconds.
- **High Emotional Resonance**: Everyone has sent a regretful message or forgotten a promise.
- **Zero Friction**: Works natively inside Slack Web with zero context switching.
- **Proves Innovation**: Demonstrates relational intelligence rather than generic text generation.
