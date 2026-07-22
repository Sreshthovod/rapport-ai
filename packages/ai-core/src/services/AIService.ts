import { AIRequest, ProviderResult } from '@rapport/shared';
import { ContextEngine } from '../context/ContextEngine.js';
import { PromptComposer } from '../prompts/PromptComposer.js';
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

      // 1. Execute ContextEngine pipeline to build structured context
      const structuredContext = request.structuredContext || ContextEngine.processContext(request.conversation);

      // 2. Compose compiled prompt spec via PromptComposer
      const compiledPrompt = request.compiledPrompt || PromptComposer.compose({
        context: structuredContext,
      });

      const enrichedRequest: AIRequest = {
        ...request,
        structuredContext,
        compiledPrompt,
      };

      const provider = this.registry.getProvider(request.providerId);
      const result = await provider.generateReply(enrichedRequest);
      return result;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'AIService execution failure.',
      };
    }
  }
}
