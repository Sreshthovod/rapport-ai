import { AIRequest, ProviderConfig, ProviderResult } from '@rapport/shared';
import { AIProvider } from './AIProvider.js';
import { ApiKeyManager } from './ApiKeyManager.js';
import { ClaudeProvider } from './ClaudeProvider.js';
import { FakeProvider } from './FakeProvider.js';
import { GeminiProvider } from './GeminiProvider.js';
import { OpenAIProvider } from './OpenAIProvider.js';
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
    timeoutMs: 15000,
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

  public async getActiveProvider(): Promise<AIProvider> {
    const providerId = this.config.activeProviderId || 'fake-provider';
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
   * Executes AI generation with exponential backoff retries & fallback provider support
   */
  public async executeWithFallback(
    request: AIRequest,
    options?: { signal?: AbortSignal }
  ): Promise<ProviderResult> {
    const targetProviderId = request.providerId || this.config.activeProviderId || 'fake-provider';
    const primaryProvider = this.registry.getProvider(targetProviderId);

    const enrichedRequest: AIRequest = {
      ...request,
      options: {
        ...this.config,
        ...request.options,
      },
    };

    // Attempt primary execution with retries
    const primaryResult = await this.executeWithRetry(primaryProvider, enrichedRequest, options);
    if (primaryResult.success) {
      return primaryResult;
    }

    // Fallback execution if primary failed & fallback is configured and different
    const fallbackId = this.config.fallbackProviderId || 'fake-provider';
    if (fallbackId && fallbackId !== targetProviderId) {
      const fallbackProvider = this.registry.getProvider(fallbackId);
      const fallbackResult = await this.executeWithRetry(fallbackProvider, enrichedRequest, options);
      if (fallbackResult.success) {
        return fallbackResult;
      }
    }

    return primaryResult;
  }

  /**
   * Executes streaming generation with fallback provider support
   */
  public async executeStreamWithFallback(
    request: AIRequest,
    onChunk: (chunkText: string) => void,
    options?: { signal?: AbortSignal }
  ): Promise<ProviderResult> {
    const targetProviderId = request.providerId || this.config.activeProviderId || 'fake-provider';
    const primaryProvider = this.registry.getProvider(targetProviderId);

    const enrichedRequest: AIRequest = {
      ...request,
      options: {
        ...this.config,
        ...request.options,
      },
    };

    if (primaryProvider.generateReplyStream) {
      const primaryResult = await primaryProvider.generateReplyStream(enrichedRequest, onChunk, options);
      if (primaryResult.success) {
        return primaryResult;
      }
    }

    // Fallback streaming execution
    const fallbackId = this.config.fallbackProviderId || 'fake-provider';
    if (fallbackId && fallbackId !== targetProviderId) {
      const fallbackProvider = this.registry.getProvider(fallbackId);
      if (fallbackProvider.generateReplyStream) {
        return fallbackProvider.generateReplyStream(enrichedRequest, onChunk, options);
      }
      return fallbackProvider.generateReply(enrichedRequest, options);
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

      // Timeout Controller
      const timeoutMs = this.config.timeoutMs || 15000;
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

        // Don't retry if invalid key or user cancelled
        if (
          lastResult.error?.includes('API Key') ||
          lastResult.error?.includes('cancelled')
        ) {
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
