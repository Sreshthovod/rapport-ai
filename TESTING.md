# TESTING.md — Quality Assurance & Testing Strategy

> **Role**: Lead QA Engineer & Chrome Extension Specialist  
> **Testing Suite**: Vitest (Unit/Integration) + Playwright (E2E Extension & DOM Mutation)  

---

## 1. Test Architecture Overview

```text
+-------------------------------------------------------------------------+
|                              TESTING MATRIX                             |
+-------------------------------------------------------------------------+
| 1. Unit Tests          | Prompt builders, Regex extractors, Dexie DB    |
| 2. Integration Tests   | Hono streaming API, BYOK encryption, SSE        |
| 3. Extension E2E Tests | Playwright Chrome load, Manifest V3 workers     |
| 4. DOM Mutation Tests  | Slack Web & WhatsApp Web selector resilience    |
| 5. Privacy Verification| Network traffic analysis (0 outbound chat logs)|
+-------------------------------------------------------------------------+
```

---

## 2. Specific Test Suites

### 2.1 Unit & Schema Tests (Vitest)
- **Commitment Extractor**: Test regex patterns against informal chat phrases (*"I'll send that by 4 PM"*, *"Let me review tomorrow"*).
- **BYOK Web Crypto Engine**: Verify `AES-GCM` encryption and decryption of API keys in local storage.
- **Dexie.js Local Store**: Verify CRUD operations and indexed lookup times (<15ms budget).

### 2.2 DOM Mutation & Platform Compatibility Tests (Playwright)
- **Slack Web Selector Test**: Verify mutation observers detect `.ql-editor` and `.c-texty_input` on channel switches.
- **WhatsApp Web Selector Test**: Verify mounting adjacent to `div[contenteditable="true"][data-tab="10"]`.
- **Native Event Injection Test**: Verify dispatched `InputEvent` updates native React state in Slack without text truncation.

### 2.3 AI Response & Validation Tests
- **Zero-Meta-Text Validation**: Ensure AI responses NEVER contain intro conversational fluff (*"Here is your rephrase:"*).
- **Fact Preservation Test**: Verify dates, financial numbers, and URLs in original draft remain unchanged in AI output.

### 2.4 Privacy & Network Traffic Audit
- **Zero-Cloud Retention Test**: Inspect background network requests using Chrome DevTools protocol; verify zero raw chat logs are sent to analytics or third-party cloud servers.
- **Offline Storage Verification**: Confirm all relationship graphs, contact notes, and commitments remain inside IndexedDB.

---

## 3. Manual QA Checklist

- [ ] Install unpacked extension on clean Chrome profile.
- [ ] Connect OpenAI API key in BYOK Settings; verify green connection checkmark.
- [ ] Navigate to Slack Web (`app.slack.com`); verify floating assistant icon appears in input box.
- [ ] Type an aggressive draft (*"Why haven't you fixed this bug? This is terrible."*); verify red De-Escalation warning mounts within 200ms.
- [ ] Press `Tab`; verify draft is replaced with calm rephrase.
- [ ] Open Slack thread with past unfulfilled commitment; verify yellow Commitment Guardrail warning appears.
- [ ] Press `Cmd+K`; select *"Reach Consensus"*; verify streaming suggestion updates preview card.
- [ ] Open Sidepanel Memory Inspector; delete a contact note; verify IndexedDB updates instantly.
- [ ] Verify zero console errors in Chrome Background Service Worker logs.

---

## 4. Hackathon Demo Verification Checklist

- [ ] Demo laptop audio & screen resolution set to 1080p.
- [ ] Slack Web demo workspace pre-seeded with 2 test channels (`#proj-launch`, `#client-acme`).
- [ ] OpenAI API key pre-validated with active quota.
- [ ] Background extension worker warm; IndexedDB pre-seeded with "Sarah Jenkins" contact commitment.
- [ ] Backup recording video ready on local desktop in case of internet outage.
