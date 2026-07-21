# SYSTEM_DESIGN.md — Architectural Blueprint

> **Role**: Chrome Extension Architect & AI Systems Architect  
> **Status**: Production Engineering Specification  
> **System Architecture**: Local-First Manifest V3 Browser Extension + Edge Streaming Gateway  

---

## 1. High-Level System Architecture

```text
+-----------------------------------------------------------------------------------+
|                                  BROWSER (CLIENT)                                 |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                            TARGET WEB APP DOM                               |  |
|  |                   (Slack Web / WhatsApp Web Input Area)                     |  |
|  +-----------------------------------------------------------------------------+  |
|                                        ▲                                          |
|                       (MutationObserver / Native Events)                          |
|                                        ▼                                          |
|  +-----------------------------------------------------------------------------+  |
|  |                            CONTENT SCRIPT LAYER                             |  |
|  |  +---------------------------+       +-----------------------------------+  |  |
|  |  |  DOM Scraper & Observer   |       |   Shadow DOM Overlay Controller   |  |  |
|  |  +---------------------------+       +-----------------------------------+  |  |
|  +-----------------------------------------------------------------------------+  |
|                                        ▲                                          |
|                            (Chrome Runtime Messaging)                             |
|                                        ▼                                          |
|  +-----------------------------------------------------------------------------+  |
|  |                       BACKGROUND SERVICE WORKER                             |  |
|  |  +---------------------+   +-------------------+   +---------------------+  |  |
|  |  |   State Controller  |   | Security/BYOK Mgr |   |  Context Engine     |  |  |
|  |  +---------------------+   +-------------------+   +---------------------+  |  |
|  +-----------------------------------------------------------------------------+  |
|                         ▲                               ▲                         |
|                         │                               │                         |
|                         ▼                               ▼                         |
|  +-------------------------------+             +-------------------------------+  |
|  |    LOCAL STORAGE ENGINE       |             |         SIDEPANEL UI          |  |
|  | (IndexedDB / Dexie.js Schema) |             |  (React 18 / Memory Manager)  |  |
|  +-------------------------------+             +-------------------------------+  |
+-----------------------------------------------------------------------------------+
                                         │
                         (HTTPS / SSE Token Stream)
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                        BACKEND GATEWAY (Node.js / Hono)                           |
|  +-----------------------------------------------------------------------------+  |
|  |  Vercel AI SDK Gateway (Streaming Transformer & Prompt Composition Engine)  |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                              CLOUD LLM PROVIDERS                                  |
|               (OpenAI API / Anthropic Claude API / Google Gemini API)              |
+-----------------------------------------------------------------------------------+
```

---

## 2. Browser Extension Architecture (Manifest V3)

The extension comprises four decoupled modules isolated by strict context boundaries:

### 2.1 Content Script Layer
- **Responsibility**: Scrapes visible thread DOM nodes, monitors host input field focus/typing events, and renders the Shadow DOM control bar.
- **Isolation**: Runs in an isolated execution world; cannot access host page JavaScript global state directly.
- **Shadow DOM Injection**: Injects UI containers inside a closed `ShadowRoot` to guarantee 100% style isolation and prevent host app CSS leakage.

### 2.2 Background Service Worker
- **Responsibility**: Central event bus, local storage manager, API key encryption worker, and request proxy to the backend gateway.
- **Lifecycle**: Ephemeral; wakes up on messaging events and goes to sleep when idle. State is persisted in `chrome.storage.local` and IndexedDB.

### 2.3 Sidepanel & Popup UI
- **Responsibility**: React-based administrative UI for Memory Inspection, BYOK key entry, and global privacy settings.
- **Communication**: Communicates with the Background Worker via `chrome.runtime.sendMessage`.

### 2.4 Local Storage Engine
- **Responsibility**: Browser IndexedDB wrapped with Dexie.js. Holds Contact Memory Profiles, Commitment Logs, and Relationship Graphs. Zero network sync required.

---

## 3. Backend Gateway Architecture

- **Stack**: Node.js running Hono.js framework (lightweight, zero-dependency, edge-deployable).
- **AI Streaming Layer**: Powered by Vercel AI SDK (`ai` package) utilizing Server-Sent Events (SSE) to stream completion tokens to the extension client.
- **Stateless Gateway**: The backend does NOT store user conversation text, API keys, or user logs. It acts as an ephemeral proxy executing prompt composition and streaming.

---

## 4. End-to-End Request & Data Lifecycle

```text
[ 1. User Types / Triggers ] ──► [ 2. DOM Scraper Extracts Thread ] ──► [ 3. Service Worker Fetches Local Context ]
                                                                                         │
[ 6. Shadow DOM Renders ] ◄─── [ 5. SSE Token Stream Received ] ◄─── [ 4. Hono Proxy Calls LLM Provider ]
```

1. **Trigger**: User types text or presses `Cmd+K` on Slack Web / WhatsApp Web.
2. **Local Scraping & Retrieval**: Content script reads active thread text; Background Worker fetches recipient memory profile from local IndexedDB.
3. **Payload Packaging**: A minimal payload containing (a) current thread snippet, (b) recipient style profile, and (c) active goal intent is sent via HTTPS to Hono backend.
4. **Streaming Execution**: Backend formats system prompts and initiates streaming request to target LLM provider (OpenAI/Claude/Gemini).
5. **Token Render**: Tokens stream via SSE directly into the client Shadow DOM preview card.
6. **Native Injection**: User hits `Tab`; Content Script dispatches native `InputEvent` into the host input field.

---

## 5. Security & Privacy Architecture

### 5.1 Content Security Policy (CSP)
- Manifest V3 compliant; zero usage of `eval()`, `Function()`, or external remote script loading.

### 5.2 Encryption at Rest
- Sensitive user API keys (BYOK) are encrypted using `AES-GCM` via the Web Crypto API before saving to `chrome.storage.local`.

### 5.3 DOM Sanitization
- All thread text extracted from host DOMs or rendered into extension UI is sanitized using `DOMPurify` to eliminate XSS risks.

### 5.4 Zero-Cloud-Storage Privacy Policy
- Raw conversation text and memory graphs reside exclusively inside browser IndexedDB. Backend proxies pass streaming payloads without disk logging or telemetry.

---

## 6. Performance & Scalability Strategy

- **Sub-800ms Stream Delivery**: SSE streaming starts token rendering within 350ms of user action.
- **IndexedDB Query Budget**: Local contact lookups execute in <15ms using indexed key paths (`contactId`, `timestamp`).
- **Debounced DOM Scanning**: MutationObservers are debounced by 300ms to prevent CPU thrashing during fast chat scrolling.
- **Memory Footprint**: Content script bundle size strictly kept under <150KB gzip; idle memory usage <25MB.

---

## 7. Error Handling & Resilience

- **Network Offline**: Extension detects `navigator.onLine === false` and falls back to displaying cached commitment notes without triggering LLM calls.
- **API Key Quota Error (429/401)**: Displays clear line-of-sight error card with direct link to provider billing page.
- **DOM Mutation Breakage**: If host app CSS updates break primary input selectors, a fallback floating button mounts to the bottom-right viewport corner.
