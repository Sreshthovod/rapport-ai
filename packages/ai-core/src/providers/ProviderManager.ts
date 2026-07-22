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

    // Attempt primary execution
    const primaryResult = await primaryProvider.generateReply(enrichedRequest, options);
    if (primaryResult.success) {
      return primaryResult;
    }

    // Fallback execution if configured & different from primary
    const fallbackId = this.config.fallbackProviderId;
    if (fallbackId && fallbackId !== targetProviderId) {
      const fallbackProvider = this.registry.getProvider(fallbackId);
      const fallbackResult = await fallbackProvider.generateReply(enrichedRequest, options);
      if (fallbackResult.success) {
        return fallbackResult;
      }
    }

    return primaryResult;
  }
}
