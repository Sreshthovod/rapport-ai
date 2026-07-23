# Production AI Provider Integration

This document outlines the **Production AI Provider Integration** for **Rapport AI**. The architecture provides a provider-independent execution layer supporting **OpenAI**, **Anthropic Claude**, **Google Gemini**, and a deterministic **FakeProvider** with automatic fallback handling, secure API key storage, and local metrics tracking.

---

## 1. Provider Manager Architecture

```
Overlay UI / AIService
           │
           ▼
   [ ProviderManager ] ──(Health Check)──► Validate Key & Config
           │
           ├──────────────────────────────┐
           ▼ (Primary Target)             ▼ (Automatic Fallback)
   [ Selected Provider ]          [ Fallback Provider ]
 (OpenAI / Claude / Gemini)           (FakeProvider)
           │                              │
           └──────────────┬───────────────┘
                          ▼
             [ Response / Stream Payload ]
                          │
                          ▼
                   MetricsTracker
```

---

## 2. Supported Production Providers & Capabilities

| Provider ID | Provider Name | Models | Vision | Custom Prompts | Max Context Tokens |
|---|---|---|---|---|---|
| `openai` | OpenAI GPT Provider | `gpt-4o`, `gpt-4o-mini` | Yes | Yes | 128,000 |
| `claude` | Anthropic Claude Provider | `claude-3-5-sonnet-20241022`, `claude-3-5-haiku-20241022` | Yes | Yes | 200,000 |
| `gemini` | Google Gemini Provider | `gemini-1.5-pro`, `gemini-1.5-flash` | Yes | Yes | 1,000,000 |
| `fake-provider` | Deterministic Offline Provider | `fake-v1` | No | Yes | 4,096 |

---

## 3. Secure API Key Management (`ApiKeyManager`)

API keys are stored securely in `chrome.storage.local` inside the browser extension (with fallback to `localStorage` or in-memory map):

```typescript
const keyManager = ApiKeyManager.getInstance();

// Save user-configured API key
await keyManager.setKey('openai', 'sk-proj-...');

// Key validation check before use
const isValid = await providerManager.healthCheck('openai');
```

---

## 4. Fallback Handling & Error Boundaries

If a primary provider fails due to:
- Missing or invalid API key (`401` / `403`)
- Rate limiting (`429`)
- Network timeouts / HTTP server failures (`500` / `503`)

`ProviderManager.executeWithFallback()` automatically re-routes the request to `fallbackProviderId` (default: `fake-provider`) to ensure uninterrupted UI availability for the user.

---

## 5. Local Usage Metrics (`MetricsTracker`)

Local metrics are recorded in-memory for diagnostic performance tracking without external telemetry uploads:

```typescript
const metrics = MetricsTracker.getInstance().getSummary('openai');
console.log(metrics);
// { totalRequests: 12, successRate: 1.0, avgLatencyMs: 420 }
```

---

## 6. Guide: Adding a New AI Provider

1. Create `packages/ai-core/src/providers/MyNewProvider.ts` implementing `AIProvider`:
   ```typescript
   export class MyNewProvider implements AIProvider {
     public readonly id = 'mynewprovider';
     public readonly name = 'My New Model Provider';
     public readonly capabilities = { ... };

     public async generateReply(request: AIRequest, options?: { signal?: AbortSignal }): Promise<ProviderResult> {
       // Perform REST API fetch call
     }
   }
   ```
2. Register the provider in `ProviderManager.ts`:
   ```typescript
   this.registry.registerProvider(new MyNewProvider());
   ```
