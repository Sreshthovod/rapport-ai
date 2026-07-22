import { AIRequest, ProviderResult } from '@rapport/shared';
import { ContextEngine } from '../context/ContextEngine.js';
import { PromptComposer } from '../prompts/PromptComposer.js';
import { ProviderManager } from '../providers/ProviderManager.js';

export class AIService {
  private readonly providerManager: ProviderManager;

  constructor(providerManager?: ProviderManager) {
    this.providerManager = providerManager || ProviderManager.getInstance();
  }

  public async generateReply(
    request: AIRequest,
    options?: { signal?: AbortSignal }
  ): Promise<ProviderResult> {
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

      // 3. Route request to active provider with automatic fallback and cancellation support
      const result = await this.providerManager.executeWithFallback(enrichedRequest, options);
      return result;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'AIService execution failure.',
      };
    }
  }
}
