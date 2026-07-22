import { AIRequest, ProviderResult } from '@rapport/shared';
import { ProviderRegistry } from '../providers/ProviderRegistry.js';

export class AIService {
  private readonly registry: ProviderRegistry;

  constructor(registry?: ProviderRegistry) {
    this.registry = registry || ProviderRegistry.getInstance();
  }

  public async generateReply(request: AIRequest): Promise<ProviderResult> {
    try {
      if (!request || !request.conversation) {
        return {
          success: false,
          error: 'Invalid AI request: missing conversation context.',
        };
      }

      const provider = this.registry.getProvider(request.providerId);
      const result = await provider.generateReply(request);
      return result;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'AIService execution failure.',
      };
    }
  }
}
