import { AIRequest, ProviderConfig, ProviderResult } from '@rapport/shared';
import { AIProvider } from './AIProvider.js';
import { ApiKeyManager } from './ApiKeyManager.js';
import { ClaudeProvider } from './ClaudeProvider.js';
import { FakeProvider } from './FakeProvider.js';
import { GeminiProvider } from './GeminiProvider.js';
import { OpenAIProvider } from './OpenAIProvider.js';
import { GroqProvider } from './GroqProvider.js';
import { ProviderRegistry } from './ProviderRegistry.js';

export class ProviderManager {
  private static instance: ProviderManager | null = null;
  private readonly registry = ProviderRegistry.getInstance();
  private readonly keyManager = ApiKeyManager.getInstance();

  private config: ProviderConfig = {
    activeProviderId: 'fake-provider',
    fallbackProviderId: 'fake-provider',
    temperature: 0.7,
    maxTokens: 500,
    maxRetries: 2,
    timeoutMs: 30000,
  };

  constructor() {
    this.registerDefaultProviders();
  }

  public static getInstance(): ProviderManager {
    if (!ProviderManager.instance) {
      ProviderManager.instance = new ProviderManager();
    }
    return ProviderManager.instance;
  }

  private registerDefaultProviders(): void {
    if (!this.registry.hasProvider('fake-provider')) {
      this.registry.registerProvider(new FakeProvider());
    }
    if (!this.registry.hasProvider('openai')) {
      this.registry.registerProvider(new OpenAIProvider());
    }
    if (!this.registry.hasProvider('claude')) {
      this.registry.registerProvider(new ClaudeProvider());
    }
    if (!this.registry.hasProvider('gemini')) {
      this.registry.registerProvider(new GeminiProvider());
    }
    if (!this.registry.hasProvider('groq')) {
      this.registry.registerProvider(new GroqProvider());
    }
  }

  public setConfig(newConfig: Partial<ProviderConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
  }

  public getConfig(): ProviderConfig {
    return { ...this.config };
  }

  public setActiveProvider(providerId: string): void {
    this.config.activeProviderId = providerId as any;
  }

  public getActiveProviderId(): string {
    return this.config.activeProviderId || 'fake-provider';
  }

  public async getActiveProvider(): Promise<AIProvider> {
    const providerId = this.getActiveProviderId();
    return this.registry.getProvider(providerId);
  }

  public async healthCheck(providerId: string): Promise<boolean> {
    const provider = this.registry.getProvider(providerId);
    const key = await this.keyManager.getKey(providerId);
    if (!key && providerId !== 'fake-provider') return false;
    if (provider.validateKey && key) {
      return provider.validateKey(key);
    }
    return true;
  }

  /**
   * Executes AI generation using the active provider with automatic retries.
   * Never silently falls back to Offline provider when a cloud provider is selected.
   */
  public async executeWithFallback(
    request: AIRequest,
    options?: { signal?: AbortSignal }
  ): Promise<ProviderResult> {
    const targetProviderId = request.providerId || this.config.activeProviderId || 'fake-provider';
    
    let primaryProvider: AIProvider;
    try {
      primaryProvider = this.registry.getProvider(targetProviderId);
    } catch (err) {
      if (targetProviderId !== 'fake-provider') {
        console.warn(`[ProviderManager] Provider "${targetProviderId}" initialization failed:`, err);
        return {
          success: false,
          error: `Provider "${targetProviderId}" initialization failed: ${err instanceof Error ? err.message : 'Unknown error'}.`,
        };
      }
      primaryProvider = this.registry.getProvider('fake-provider');
    }

    const enrichedRequest: AIRequest = {
      ...request,
      options: {
        ...this.config,
        ...request.options,
      },
    };

    // Execute primary provider with retries
    return this.executeWithRetry(primaryProvider, enrichedRequest, options);
  }

  /**
   * Executes streaming generation using the active provider.
   * Never silently falls back to Offline provider when a cloud provider is selected.
   */
  public async executeStreamWithFallback(
    request: AIRequest,
    onChunk: (chunkText: string) => void,
    options?: { signal?: AbortSignal }
  ): Promise<ProviderResult> {
    const targetProviderId = request.providerId || this.config.activeProviderId || 'fake-provider';
    
    let primaryProvider: AIProvider;
    try {
      primaryProvider = this.registry.getProvider(targetProviderId);
    } catch (err) {
      if (targetProviderId !== 'fake-provider') {
        console.warn(`[ProviderManager] Streaming provider "${targetProviderId}" initialization failed:`, err);
        return {
          success: false,
          error: `Provider "${targetProviderId}" initialization failed: ${err instanceof Error ? err.message : 'Unknown error'}.`,
        };
      }
      primaryProvider = this.registry.getProvider('fake-provider');
    }

    const enrichedRequest: AIRequest = {
      ...request,
      options: {
        ...this.config,
        ...request.options,
      },
    };

    if (primaryProvider.generateReplyStream) {
      return primaryProvider.generateReplyStream(enrichedRequest, onChunk, options);
    }

    return primaryProvider.generateReply(enrichedRequest, options);
  }

  private async executeWithRetry(
    provider: AIProvider,
    request: AIRequest,
    options?: { signal?: AbortSignal }
  ): Promise<ProviderResult> {
    const maxRetries = this.config.maxRetries ?? 2;
    let lastResult: ProviderResult = { success: false, error: 'Execution not started.' };

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (options?.signal?.aborted) {
        return { success: false, error: 'Request was cancelled.' };
      }

      // Timeout Controller - Default to 30 seconds for cloud LLMs
      const timeoutMs = this.config.timeoutMs || 30000;
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

      // Combine user signal and timeout signal if available
      const combinedSignal = options?.signal
        ? ProviderManager.combineSignals(options.signal, timeoutController.signal)
        : timeoutController.signal;

      try {
        lastResult = await provider.generateReply(request, { signal: combinedSignal });
        clearTimeout(timeoutId);

        if (lastResult.success) {
          return lastResult;
        }

        // Don't retry if client error, auth error, quota/billing limits, or user cancelled
        const errLower = (lastResult.error || '').toLowerCase();
        const isClientOrQuotaError =
          errLower.includes('api key') ||
          errLower.includes('unauthorized') ||
          errLower.includes('forbidden') ||
          errLower.includes('invalid') ||
          errLower.includes('quota') ||
          errLower.includes('billing') ||
          errLower.includes('rate limit') ||
          errLower.includes('limit exceeded') ||
          errLower.includes('400') ||
          errLower.includes('401') ||
          errLower.includes('403') ||
          errLower.includes('404') ||
          errLower.includes('429') ||
          errLower.includes('cancelled');

        if (isClientOrQuotaError) {
          return lastResult;
        }
      } catch (err) {
        clearTimeout(timeoutId);
        lastResult = {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown provider error',
        };
      }

      // Exponential backoff before retry (e.g. 500ms, 1000ms)
      if (attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 500;
        await new Promise((res) => setTimeout(res, backoffMs));
      }
    }

    return lastResult;
  }

  private static combineSignals(signal1: AbortSignal, signal2: AbortSignal): AbortSignal {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    if (signal1.aborted || signal2.aborted) {
      controller.abort();
    } else {
      signal1.addEventListener('abort', onAbort, { once: true });
      signal2.addEventListener('abort', onAbort, { once: true });
    }
    return controller.signal;
  }
}
