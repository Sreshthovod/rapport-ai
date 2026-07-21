# IMPLEMENTATION_PLAN.md — Engineering Roadmap & Task Execution Matrix

> **Execution Profile**: Single Developer Sprint (Approx. 7-10 Days)  
> **Core Strategy**: Risk-First Sequencing — Foundation -> DOM Injector -> Storage -> AI Pipeline -> Demo Polish  

---

## 1. Milestone Engineering Roadmap

```text
[ Milestone 1: Monorepo & Extension Shell ] (Day 1)
                    │
                    ▼
[ Milestone 2: Native DOM Injector & Shadow DOM ] (Day 2-3)
                    │
                    ▼
[ Milestone 3: Local Memory Engine (IndexedDB) ] (Day 4)
                    │
                    ▼
[ Milestone 4: Backend Gateway & Streaming AI ] (Day 5-6)
                    │
                    ▼
[ Milestone 5: Polishing, Testing & Demo Script ] (Day 7)
```

---

## 2. Detailed Milestone Specifications

### Milestone 1: Monorepo Foundation & Extension Shell
* **Objective**: Setup Turborepo workspace, Manifest V3 manifest structure, and Vite HMR extension bundle.
* **Deliverables**: Monorepo root, `apps/extension`, `apps/api`, `packages/shared`.
* **Dependencies**: Node.js v20+, pnpm, Vite.
* **Acceptance Criteria**: Extension loads cleanly in `chrome://extensions` with background service worker alive.
* **Estimated Complexity**: Low (0.5 Days).
* **Testing Requirements**: Smoke test extension installation.
* **Git Branch**: `feat/m1-monorepo-shell`
* **Commit Structure**: `feat(shell): initialize turborepo and manifest v3 config`
* **Definition of Done**: Clean `pnpm build` with zero compiler warnings.

**Task Checklist**:
- [x] Initialize Turborepo & pnpm workspace.
- [x] Create Manifest V3 `manifest.json` with permissions (`storage`, `sidepanel`, `activeTab`).
- [x] Configure Vite extension build scripts with CRXJS.

---

### Milestone 2: Native DOM Injector & Shadow DOM Layer
* **Objective**: Build robust DOM scrapers and Shadow DOM floating UI containers for Slack Web (`app.slack.com`).
* **Deliverables**: `content/slack-observer.ts`, `components/ShadowContainer.tsx`.
* **Dependencies**: Milestone 1, React 18, `react-shadow`.
* **Acceptance Criteria**: Floating control bar mounts reliably above Slack input box without CSS leakage.
* **Estimated Complexity**: High (1.5 Days).
* **Testing Requirements**: Slack DOM mutation resistance test.
* **Git Branch**: `feat/m2-dom-injector`
* **Commit Structure**: `feat(dom): add slack mutation observer and shadow dom host`
* **Definition of Done**: Floating widget mounts reliably on 10 consecutive channel switches.

**Task Checklist**:
- [x] Implement MutationObserver for `.ql-editor` / Slack text input area.
- [x] Create closed Shadow Root mount container.
- [x] Add Native Event Dispatcher (`InputEvent`) for text injection.

---

### Milestone 3: Local Memory Engine (IndexedDB & Dexie.js)
* **Objective**: Build client-side local database for contacts, commitments, and memory profiles.
* **Deliverables**: `services/db.ts` (Dexie.js schema), Contact and Commitment CRUD handlers.
* **Dependencies**: Milestone 2.
* **Acceptance Criteria**: Contact profile and commitment records queryable in <15ms.
* **Estimated Complexity**: Medium (1 Day).
* **Testing Requirements**: IndexedDB persistence unit tests.
* **Git Branch**: `feat/m3-local-db`
* **Commit Structure**: `feat(storage): initialize dexie.js schema for local contacts`
* **Definition of Done**: Successfully store and retrieve 50 contact records in local browser memory.

**Task Checklist**:
- [x] Implement Dexie.js database version 1 schema.
- [x] Create Commitment extractor regex & IndexedDB writer.
- [x] Wire Sidepanel UI to local IndexedDB store.

---

### Milestone 4: Backend Gateway & Streaming AI Pipeline
* **Objective**: Build Node.js/Hono API streaming gateway with Vercel AI SDK and prompt engine.
* **Deliverables**: `apps/api/src/index.ts`, `packages/ai-core/prompts.ts`.
* **Dependencies**: Milestone 3, OpenAI API / BYOK setup.
* **Acceptance Criteria**: Hono backend streams completion tokens via SSE to extension Shadow DOM in <800ms.
* **Estimated Complexity**: High (1.5 Days).
* **Testing Requirements**: SSE stream integration tests.
* **Git Branch**: `feat/m4-ai-streaming`
* **Commit Structure**: `feat(ai): add hono streaming route with vercel ai sdk`
* **Definition of Done**: `Cmd+K` trigger streams AI suggestions into Slack DOM preview card smoothly.

**Task Checklist**:
- [x] Create Hono streaming server route.
- [x] Integrate Vercel AI SDK (`ai` package) with BYOK key validation.
- [x] Implement De-escalation & Commitment prompt templates.

---

### Milestone 5: Polish, Keyboard Shortcuts & Demo Script
* **Objective**: Finalize UX animations, line-of-sight keyboard controls (`Tab`, `Esc`, `Cmd+K`), and hackathon demo script.
* **Deliverables**: `DEMO.md`, keyboard event listeners, end-to-end bug fixes.
* **Dependencies**: Milestones 1–4.
* **Acceptance Criteria**: Flawless 2-minute demo flow on Slack Web.
* **Estimated Complexity**: Medium (1 Day).
* **Testing Requirements**: Full Manual QA Checklist & Demo Dry-Run.
* **Git Branch**: `feat/m5-demo-polish`
* **Commit Structure**: `feat(ux): add keyboard shortcuts and demo polish`
* **Definition of Done**: 3 consecutive bug-free demo dry runs completed.

**Task Checklist**:
- [x] Wire `Tab` key to native input text replacement.
- [x] Add `Cmd+K` command palette overlay.
- [x] Execute dry-run demo scenarios.
