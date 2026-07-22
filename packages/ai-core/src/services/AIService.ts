import { AIRequest, ProviderResult } from '@rapport/shared';
import { AIPipelineInspector } from '@rapport/shared';
import { DEBUG_AI_PIPELINE } from '../prompts/PromptComposer.js';
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
    const inspector = AIPipelineInspector.getInstance();

    try {
      if (!request || !request.conversation) {
        return {
          success: false,
          error: 'Invalid AI request: missing conversation context.',
        };
      }

      // 1. Build structured context — use async path so memory retrieval is included
      const t0 = Date.now();
      const structuredContext = request.structuredContext
        || await ContextEngine.processContextAsync(request.conversation);

      if (DEBUG_AI_PIPELINE) {
        inspector.trace('ContextEngine', {
          tone: structuredContext.tone,
          stage: structuredContext.stage,
          messageCount: structuredContext.recentMessages.length,
          hasMemory: !!structuredContext.memoryContext,
          hasIntelligence: !!structuredContext.intelligence,
          hasRelationship: !!structuredContext.relationship,
        }, Date.now() - t0);
      }

      // 2. Compose compiled prompt spec
      const t1 = Date.now();
      const compiledPrompt = request.compiledPrompt || PromptComposer.compose({
        context: structuredContext,
      });

      if (DEBUG_AI_PIPELINE) {
        inspector.trace('PromptComposer', {
          goal: compiledPrompt.goal,
          systemPromptLength: compiledPrompt.systemPrompt.length,
          userPromptLength: compiledPrompt.userPrompt.length,
          variantCount: compiledPrompt.variants.length,
        }, Date.now() - t1);
      }

      const enrichedRequest: AIRequest = {
        ...request,
        structuredContext,
        compiledPrompt,
      };

      // 3. Route to active provider with automatic fallback
      const result = await this.providerManager.executeWithFallback(enrichedRequest, options);

      if (DEBUG_AI_PIPELINE) {
        inspector.trace('Provider', {
          success: result.success,
          providerId: result.data?.providerId,
          error: result.error,
        });
      }

      return result;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'AIService execution failure.',
      };
    }
  }
}
