# PROJECT.md: AI Conversation Copilot (Browser Extension)

> **Document Status**: Architectural Specification & Product Blueprint  
> **Version**: 1.0.0  
> **Target Platforms (MVP)**: Slack Web & WhatsApp Web  
> **Architecture Paradigm**: Local-First, Privacy-Preserving, Manifest V3 Browser Extension  

---

## 1. Vision

To empower individuals and team members to communicate with high empathy, clarity, alignment, and strategic intent across real-time web messaging platforms, without compromising personal privacy or cloud data control. 

The **AI Conversation Copilot** acts as a real-time interpersonal advisor embedded directly within chat interface DOMs, helping users build stronger relationships, avoid communication friction, and achieve their goals in every interaction.

---

## 2. Problem Statement

Modern digital communication relies heavily on real-time web platforms like Slack Web and WhatsApp Web. However, high-velocity messaging introduces severe pain points:

1. **Context Loss & Fragmentation**: Important recipient history, past commitments, personal preferences, and rapport details are scattered across hundreds of chat threads.
2. **Tone Mismatch & Conflict**: Asynchronous text lacks body language and vocal nuance, frequently causing unintended harshness, passive aggressiveness, or ambiguity.
3. **Cognitive Fatigue**: Users spend significant mental energy context-switching, deciding *how* to phrase sensitive messages, and managing workplace dynamics.
4. **Privacy Concerns with Existing AI Tools**: Existing AI assistants require sending sensitive conversation logs to centralized third-party cloud databases, creating compliance risks for enterprise and personal messaging.
5. **Stateless AI Assistance**: Generic AI writing extensions lack memory of *who* the user is communicating with and operate on single text inputs without interpersonal awareness.

---

## 3. Target Users

- **Remote & Distributed Team Members**: Power Slack users needing clear, empathetic, and asynchronous collaboration across global time zones.
- **Freelancers, Consultants & Client Managers**: Professionals juggling multiple client relationships over WhatsApp Web and Slack, needing relationship memory and tone calibration.
- **Managers & Team Leaders**: Executives balancing firmness with empathy, resolving sensitive workplace discussions and preventing team burnout.
- **Non-Native English Communicators**: Professionals seeking real-time tone alignment, cultural nuance, and idiomatic precision during fast-paced chat sessions.

---

## 4. Core Unique Selling Proposition (USP)

1. **Strict Local-First Architecture**: Conversation history, relationship profiles, and vector memory are stored exclusively inside browser IndexedDB, ensuring zero cloud retention of user conversation logs.
2. **Native DOM Copilot Integration**: Seamless, low-latency UI overlay injected directly into Slack Web (`app.slack.com`) and WhatsApp Web (`web.whatsapp.com`) input fields via Shadow DOM encapsulation.
3. **Interpersonal Memory Graph**: Learns person-specific communication styles, past interaction themes, shared goals, and preferred tone per contact over time.
4. **Goal-Directed Writing Assistance**: Assists users in framing messages to achieve specific outcomes (e.g., *Reach Consensus*, *De-escalate Friction*, *Set Firm Boundary*, *Friendly Follow-up*).

---

## 5. Competitor Analysis

| Feature / Capability | Generic AI Extensions (e.g. ChatGPT wrappers) | Syntax Assistants (e.g. Grammarly) | Sales Copilots (e.g. Lavender, Crystal) | **Our AI Conversation Copilot** |
| :--- | :--- | :--- | :--- | :--- |
| **Real-time DOM Integration** | Basic Popup / Floating Icon | Native Input Overlay | Email DOM only (Gmail/Outlook) | **Native Slack & WhatsApp DOM Overlay** |
| **Relationship Memory** | None (Stateless) | None (Stateless) | CRM / Cold Email profiles | **Local Interpersonal Knowledge Graph** |
| **Data Privacy & Storage** | Full Cloud Logging | Full Cloud Processing | Cloud Database | **Strict Local-First (IndexedDB)** |
| **Target Communication** | Generic text generation | Grammar & Style rules | Cold B2B Email Outreach | **Real-time Team & Casual Messaging** |
| **Goal Alignment** | Manual Prompting Required | Passive Tone Indicator | Reply Rate Optimization | **Active Goal-Directed Guidance** |

---

## 6. Product Milestones & Release Phases

### 6.1 MVP (Phase 1) — Core Copilot & Platform Integration
- **Target Platforms**: Slack Web (`app.slack.com`) & WhatsApp Web (`web.whatsapp.com`).
- **Core Features**:
  - Chrome Extension (Manifest V3) built with React 18, Vite, and TypeScript.
  - Shadow DOM content script for real-time text input injection and UI floating bar.
  - Active DOM Thread Scraper: Extract active conversation context safely from current DOM view.
  - Tone & Style Transformer: Instant rephrasing into 4 core tones (*Professional*, *Empathetic*, *Direct*, *De-escalating*).
  - Local Contact Store: Basic IndexedDB schema storing contact notes, preferred tone, and interaction tags.
  - Unified TypeScript Backend API (Hono.js + Vercel AI SDK) with Bring-Your-Own-Key (BYOK) support for OpenAI / Claude / Gemini APIs.

### 6.2 Phase 2 — Advanced Local Memory & Goal Intelligence
- **Local Vector RAG Engine**: Browser-based vector search (Transformers.js + IndexedDB) over indexed conversation threads for semantic retrieval.
- **Conversation Goal Tracker**: Intelligent prompt steering based on explicit user goals (*Schedule Meeting*, *Resolve Blocked Item*, *Deliver Critical Feedback*).
- **Passive Conflict Warning System**: Real-time sentiment detector alerting users before sending messages that score high in hostility or ambiguity.
- **Sidepanel Memory Inspector**: Dedicated extension sidepanel to view, edit, and manage contact relationship profiles and local memory index.

### 6.3 Phase 3 — Ecosystem Expansion & Local LLM Capabilities
- **Local LLM Execution**: Integration with Ollama / WebLLM for complete on-device offline AI generation (zero network calls for maximum privacy).
- **Multimodal & Voice Assistance**: Real-time voice-to-text dictation with automatic tone polishing for audio messages.
- **Platform Expansion**: Support for Discord Web, Telegram Web, LinkedIn DMs, and Microsoft Teams Web.
- **Analytics & Rapport Insights**: Private browser dashboard tracking communication volume, empathy index, and resolution efficiency over time.

---

## 7. Technology Stack

```
+-----------------------------------------------------------------------+
|                           BROWSER EXTENSION                           |
|  +---------------------+   +-------------------+   +---------------+  |
|  |   Content Scripts   |   | Background Worker |   | Sidepanel UI  |  |
|  | (DOM Scraper & UI)  | < |  (State & Auth)   | < |  (React 18)   |  |
|  +---------------------+   +-------------------+   +---------------+  |
|             |                        |                     |          |
|             +------------------------+---------------------+          |
|                                      |                                |
|                                      v                                |
|                  LOCAL MEMORY ENGINE (IndexedDB / Dexie)              |
|                  + Browser Vector Index (Transformers.js)             |
+-----------------------------------------------------------------------+
                                       |
                                       v (Streaming HTTP / SSE)
+-----------------------------------------------------------------------+
|                    BACKEND MIDDLEWARE (Node.js / Hono)                |
|  +-----------------------------------------------------------------+  |
|  | Vercel AI SDK (Unified Orchestration & Streaming Pipeline)       |  |
|  +-----------------------------------------------------------------+  |
+-----------------------------------------------------------------------+
                                       |
                   +-------------------+-------------------+
                   |                                       |
                   v                                       v
         Cloud LLM Providers                     Local LLM Endpoint
   (OpenAI / Anthropic / Gemini)                     (Ollama / WebLLM)
```

### 7.1 Extension Frontend
- **Framework**: React 18 + TypeScript (Strict Mode).
- **Build Tool**: Vite with `@crxjs/vite-plugin` for Manifest V3 HMR.
- **Styling**: Vanilla CSS Modules / TailwindCSS scoped inside Shadow DOM (`react-shadow`).
- **State Management**: Zustand (with persistent sync across Content Scripts, Sidepanel, and Background Service Worker).

### 7.2 Storage & Local Memory
- **Database**: IndexedDB wrapped with Dexie.js.
- **Client-Side Embeddings**: `@xenova/transformers` (running quantized embedding models directly in Web Worker / WASM).
- **Local Vector Search**: Custom lightweight Cosine Similarity / HNSW indexing over IndexedDB.

### 7.3 Backend Gateway & AI Orchestration
- **Framework**: Node.js with Hono.js (lightweight, edge-compatible web framework).
- **AI Orchestration**: Vercel AI SDK (`ai` package) for unified model abstraction and Server-Sent Events (SSE) response streaming.
- **Model Providers**: OpenAI API (`gpt-4o-mini`, `gpt-4o`), Anthropic Claude API (`claude-3-5-sonnet`), Google Gemini API (`gemini-1.5-flash`).

### 7.4 Monorepo & Tooling
- **Monorepo Manager**: Turborepo + pnpm workspaces.
- **Code Quality**: ESLint, Prettier, TypeScript Compiler (`tsc`).
- **Testing**: Vitest (Unit & Integration tests), Playwright (Extension E2E testing).

---

## 8. High-Level Architecture & Data Flow

### 8.1 Component Architecture

```
[ Slack / WhatsApp Web DOM ]
        │ (MutationObserver / Focus Listener)
        ▼
[ Content Script Layer ] ────► [ Shadow DOM UI Overlay ] (Floating Bar & Suggestions)
        │
        ▼ (Chrome Runtime Messaging)
[ Background Service Worker ]
        │
        ├───► [ Local IndexedDB Store ] (Dexie.js: Contacts, Styles, Thread History)
        │
        └───► [ Node.js Backend Proxy (Hono) ] ───► [ Vercel AI SDK ] ───► [ LLM Provider ]
```

### 8.2 Data Flow Sequence (User Generating a Suggestion)

1. **Trigger**: User focuses input area or types shortcut key (`Cmd/Ctrl + K`) on Slack/WhatsApp Web.
2. **DOM Context Extraction**: Content Script safely reads recent message context from the active DOM tree.
3. **Local Memory Query**: Service Worker fetches contact relationship notes and preferred tone from IndexedDB.
4. **Prompt Construction**: Content script assembles context payload:
   - Extracted DOM Thread
   - Recipient Profile & Relationship Notes
   - Target User Goal & Selected Tone
5. **Streaming AI Execution**: Request sent to Node.js / Hono backend; Vercel AI SDK streams completion tokens back to Extension Service Worker.
6. **Shadow DOM Render**: Content script receives token stream and renders real-time suggestions inside isolated Shadow DOM overlay.
7. **Insertion**: User accepts suggestion; text is safely inserted into host input field via Native Input Event Dispatch.

---

## 9. Monorepo Folder Structure (High Level)

```
rapport-ai/
├── apps/
│   ├── extension/              # Manifest V3 Browser Extension (React + Vite)
│   │   ├── src/
│   │   │   ├── background/     # Service Worker scripts (State, Storage, Routing)
│   │   │   ├── content/        # Content scripts & DOM observers for Slack/WhatsApp
│   │   │   ├── sidepanel/      # React App for Chrome Extension Sidepanel UI
│   │   │   ├── popup/          # Quick settings popup UI
│   │   │   ├── components/     # Shared React UI components (Shadow DOM wrapped)
│   │   │   └── services/       # Local memory, IndexedDB, and API communication
│   │   ├── manifest.json       # Extension Manifest V3 configuration
│   │   └── package.json
│   │
│   └── api/                    # Node.js Backend Gateway (Hono.js)
│       ├── src/
│       │   ├── routes/         # Streaming LLM endpoints & prompt handlers
│       │   ├── middleware/     # Auth & BYOK validation
│       │   └── index.ts        # Hono server entry point
│       └── package.json
│
├── packages/
│   ├── shared/                 # Shared TypeScript types, schemas & constants
│   │   ├── src/
│   │   │   ├── types/          # Thread, Contact, Tone, and Context types
│   │   │   └── schemas/        # Zod validation schemas
│   │   └── package.json
│   │
│   └── ai-core/                # Shared Prompt Engineering & Context Builders
│       ├── src/
│       │   ├── prompts/        # System prompts for Tones, Goals, and De-escalation
│       │   └── context/        # Context aggregation logic
│       └── package.json
│
├── turbo.json                  # Turborepo configuration
├── pnpm-workspace.yaml         # PNPM workspace definition
├── package.json                # Root package configuration
└── PROJECT.md                  # System Blueprint & Architectural Design
```

---

## 10. Coding Standards & Architectural Guidelines

1. **TypeScript Strictness**:
   - `strict: true` required across all packages.
   - Zero tolerance for explicit `any` types; all API payloads validated with `zod`.

2. **Manifest V3 & Extension Security**:
   - Strict Content Security Policy (CSP); zero usage of `eval()` or dynamically loaded remote code.
   - All external network requests isolated to Background Service Worker or API backend.

3. **DOM Isolation & Styling Protection**:
   - All extension UI elements injected into web pages MUST be mounted inside a **Shadow Root (`mode: 'closed'`)**.
   - Ensures extension styles do not pollute Slack/WhatsApp styles and vice versa.

4. **DOM Manipulations & Sanitization**:
   - All extracted DOM content sanitized using `DOMPurify` before processing or rendering.
   - Input event synthesis used for DOM insertion to trigger native React/Vue handlers in host web apps.

5. **Privacy & Data Security**:
   - Zero telemetry or logging of raw conversation text on backend servers.
   - Sensitive user keys (BYOK) encrypted via Web Crypto API before local browser storage.

---

## 11. Future Roadmap

- **Q1**: Complete MVP with Slack Web & WhatsApp Web DOM injectors, local IndexedDB store, and Hono backend streaming.
- **Q2**: Release Local Vector Search engine (Transformers.js), Goal Tracker UI, and Sidepanel Memory Inspector.
- **Q3**: Launch Multimodal Audio-to-Tone feature, local LLM support via Ollama / WebLLM, and expanded web platform injectors.
- **Q4**: Release Enterprise Policy engine, shared team style guides, and advanced relationship analytics dashboard.
