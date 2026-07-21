# Rapport AI — Interpersonal Intelligence Browser Engine

> **Never send the wrong message to the right person.**  
> An autonomous, privacy-first AI copilot embedded directly into real-time web messaging platforms (Slack Web & WhatsApp Web).

---

## 🔒 Privacy-First Architecture

- **100% Local Storage**: Contact profiles, commitment logs, and relationship memory reside exclusively in browser IndexedDB.
- **Zero Cloud Retention**: No conversation history, text logs, or telemetry are ever saved on remote servers.
- **BYOK Encryption**: Secure Bring-Your-Own-Key encryption (`AES-GCM`) via Web Crypto API.

---

## ✨ Core Features

- **⚠️ Commitment Guardrail**: Passively detects unfulfilled promises (*"I'll send that deck by 3 PM"*) and alerts you before you sign off.
- **🛑 Real-Time De-Escalation Brake**: Intercepts angry or defensive drafts in real time with 1-click constructive rephrasings.
- **👤 Contact Style Mirroring**: Adapts outgoing drafts to match recipient brevity, formality, and communication preferences.
- **⌨️ Keyboard-First Ergonomics**: `Cmd+K` goal palette, `Tab` native DOM insertion, `Esc` instant dismissal.
- **🛡️ Shadow DOM Isolation**: 100% CSS/DOM isolation injected directly into host web apps without layout shifts.

---

## 🏗️ Architecture Overview

```text
+-----------------------------------------------------------------------+
|                      MANIFEST V3 BROWSER EXTENSION                    |
|  +------------------------+   +------------------------------------+  |
|  | Content Scripts (DOM)  | < | Background Worker (State & Auth)   |  |
|  +------------------------+   +------------------------------------+  |
|               │                                  │                    |
|               ▼                                  ▼                    |
|  Shadow DOM UI Overlay               Local IndexedDB (Dexie.js)       |
+-----------------------------------------------------------------------+
                                    │
                                    ▼ (Streaming SSE / BYOK)
+-----------------------------------------------------------------------+
|                 NODE.JS / HONO BACKEND (Vercel AI SDK)                |
+-----------------------------------------------------------------------+
                                    │
                                    ▼
                 Cloud LLMs (OpenAI / Claude / Gemini)
```

---

## 🛠️ Tech Stack

- **Extension Frontend**: React 18, TypeScript, Vite, TailwindCSS, `@crxjs/vite-plugin`.
- **Local Storage**: IndexedDB, Dexie.js.
- **Backend API**: Node.js, Hono.js, Vercel AI SDK (`ai`).
- **Monorepo**: Turborepo, pnpm workspaces.
- **Testing**: Vitest, Playwright.

---

## 📁 Repository Folder Structure

```text
rapport-ai/
├── apps/
│   ├── extension/              # Manifest V3 Browser Extension (React + Vite)
│   │   ├── src/
│   │   │   ├── background/     # Service Worker scripts
│   │   │   ├── content/        # DOMObservers for Slack & WhatsApp
│   │   │   ├── sidepanel/      # React App for Chrome Extension Sidepanel UI
│   │   │   └── components/     # Shadow DOM wrapped React UI components
│   │   └── manifest.json
│   │
│   └── api/                    # Node.js Streaming Gateway (Hono.js)
│       └── src/
│           ├── routes/         # Streaming LLM endpoints
│           └── index.ts        # Server entry point
│
├── packages/
│   ├── shared/                 # Shared TypeScript types & schemas
│   └── ai-core/                # Prompt templates & context builders
│
├── PROJECT.md                  # Project Vision & Blueprint
├── PRD.md                      # Product Requirements Document
├── FEATURES.md                 # Feature Matrix & Specifications
├── USER_FLOW.md                # UX Architecture & User Flows
├── SYSTEM_DESIGN.md            # System Architecture Specification
├── AI_SYSTEM.md                # AI Pipeline & Prompt Specification
├── DATA_MODEL.md               # Local Storage & Schema Specification
├── UI_UX_SPEC.md               # Design System & Wireframes
├── IMPLEMENTATION_PLAN.md      # Engineering Roadmap & Milestones
├── TESTING.md                  # QA & Testing Strategy
└── DEMO.md                     # Hackathon Presentation Blueprint
```

---

## 🚦 Quick Start & Local Setup

### Prerequisites
- Node.js v20+
- pnpm v8+
- Google Chrome browser

### Installation

1. **Clone repository and install dependencies**:
   ```bash
   git clone https://github.com/your-org/rapport-ai.git
   cd rapport-ai
   pnpm install
   ```

2. **Start API Gateway**:
   ```bash
   cd apps/api
   pnpm dev
   ```

3. **Build Extension**:
   ```bash
   cd apps/extension
   pnpm dev
   ```

4. **Load in Chrome**:
   - Open Chrome and navigate to `chrome://extensions`.
   - Enable **Developer mode** (top-right toggle).
   - Click **Load unpacked** and select `apps/extension/dist`.
   - Open Slack Web (`app.slack.com`) or WhatsApp Web (`web.whatsapp.com`) to begin.

---

## 🛣️ Product Roadmap

- [x] **Phase 1 (MVP)**: Slack Web & WhatsApp Web DOM injectors, Commitment Guardrail, De-escalation Brake, Local IndexedDB store.
- [ ] **Phase 2**: Local Vector RAG engine (Transformers.js), Tactical Pushback Shield, Sidepanel Memory Inspector.
- [ ] **Phase 3**: Local offline LLM support (Ollama/WebLLM), Multimodal Audio Dictation Polish, Enterprise Policy Engine.

---

## 📜 License

MIT License © 2026 Rapport AI Team.
