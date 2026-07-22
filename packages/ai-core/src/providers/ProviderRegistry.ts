import { AIProvider } from './AIProvider.js';
import { FakeProvider } from './FakeProvider.js';

export class ProviderRegistry {
  private static instance: ProviderRegistry | null = null;
  private readonly providers: Map<string, AIProvider> = new Map();
  private defaultProviderId: string = 'fake-provider';

  constructor() {
    const defaultFake = new FakeProvider();
    this.registerProvider(defaultFake);
  }

  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  public registerProvider(provider: AIProvider): void {
    if (!provider || !provider.id) {
      throw new Error('[ProviderRegistry] Invalid provider instance.');
    }
    this.providers.set(provider.id, provider);
  }

  public getProvider(id?: string): AIProvider {
    const targetId = id || this.defaultProviderId;
    const provider = this.providers.get(targetId);
    if (!provider) {
      const fallback = this.providers.get(this.defaultProviderId);
      if (!fallback) {
        throw new Error(`[ProviderRegistry] Provider not found: ${targetId}`);
      }
      return fallback;
    }
    return provider;
  }

  public setDefaultProvider(id: string): void {
    if (!this.providers.has(id)) {
      throw new Error(`[ProviderRegistry] Cannot set default provider. Unregistered ID: ${id}`);
    }
    this.defaultProviderId = id;
  }

  public listProviders(): AIProvider[] {
    return Array.from(this.providers.values());
  }
}
