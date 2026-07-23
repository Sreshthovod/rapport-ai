import { AIRequest, ProviderResult } from '@rapport/shared';
import { AIPipelineInspector } from '@rapport/shared';
import { DEBUG_AI_PIPELINE } from '../prompts/PromptComposer.js';
import { ContextEngine } from '../context/ContextEngine.js';
import { PromptComposer } from '../prompts/PromptComposer.js';
import { ApiKeyManager } from '../providers/ApiKeyManager.js';
import { ProviderManager } from '../providers/ProviderManager.js';
import { SettingsManager } from './SettingsManager.js';

export class AIService {
  private readonly providerManager: ProviderManager;

  constructor(providerManager?: ProviderManager) {
    this.providerManager = providerManager || ProviderManager.getInstance();
  }

  public async generateReply(
    request: AIRequest,
    options?: { signal?: AbortSignal }
  ): Promise<ProviderResult> {
    const inspector = (typeof AIPipelineInspector !== 'undefined' && AIPipelineInspector && typeof AIPipelineInspector.getInstance === 'function')
      ? AIPipelineInspector.getInstance()
      : null;
    const startTime = Date.now();

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
        inspector?.trace('ContextEngine', {
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
        inspector?.trace('PromptComposer', {
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

      // Extract development logging parameters
      const settings = SettingsManager.getInstance().getSettings();
      const selectedProvider = settings.activeProviderId;
      const resolvedProvider = enrichedRequest.providerId || this.providerManager.getActiveProviderId();
      const selectedModel = (request.options?.model as string) || this.providerManager.getConfig().model || settings.openaiModel;
      const language = settings.language || 'en';
      const keyStatus = await ApiKeyManager.getInstance().getKeyStatus(selectedProvider);
      const promptLength = (compiledPrompt.systemPrompt?.length || 0) + (compiledPrompt.userPrompt?.length || 0);

      console.log(`[Rapport AI:Pipeline] Request Started at ${new Date(startTime).toISOString()}`);
      console.log(`[Rapport AI:Pipeline] Request Configuration:`, {
        'Selected Provider': selectedProvider,
        'Resolved Provider': resolvedProvider,
        'Selected Model': selectedModel,
        'API Key Status': keyStatus.hasKey ? 'Configured' : 'Missing',
        'Language': language,
        'Prompt Length': promptLength,
      });

      // 3. Route to active provider
      inspector?.startStage('[6] Provider Request');
      const result = await this.providerManager.executeWithFallback(enrichedRequest, options);
      const finishTime = Date.now();
      const totalDurationMs = finishTime - startTime;
      const providerUsed = result.data?.providerId || resolvedProvider;

      inspector?.endStage('[6] Provider Request', {
        provider: providerUsed,
        success: result.success,
        tokens: result.data?.metadata?.tokens,
      }, !result.success);

      // 4. Provider Response Parsed
      inspector?.startStage('[7] Provider Response Parsed');
      const suggestionCount = result.data?.suggestions?.length || (result.data?.suggestedReply ? 1 : 0);
      inspector?.endStage('[7] Provider Response Parsed', { suggestionCount }, !result.success);

      console.log(`[Rapport AI:Pipeline] Request Finished at ${new Date(finishTime).toISOString()} (Duration: ${totalDurationMs}ms)`);
      console.log(`[Rapport AI:Pipeline] Provider Used: "${providerUsed}"`);

      // Update Dev Observability Diagnostics Summary
      inspector?.updateDiagnostics({
        currentStage: 'Completed',
        totalDurationMs,
        success: result.success,
        provider: providerUsed,
        model: selectedModel,
        promptLength,
        completionTokens: result.data?.metadata?.tokens as number | undefined,
        finishReason: result.success ? 'stop' : 'error',
        lastError: result.error,
      });

      // Throw warning immediately if Provider Used != Selected Provider
      if (selectedProvider !== 'fake-provider' && providerUsed !== selectedProvider) {
        console.warn(
          `[Rapport AI:WARNING] Provider mismatch detected! Selected Provider is "${selectedProvider}", but Provider Used was "${providerUsed}".`
        );
      }

      return result;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'AIService execution failure.',
      };
    }
  }

  public async generateReplyStream(
    request: AIRequest,
    onChunk: (chunkText: string) => void,
    options?: { signal?: AbortSignal }
  ): Promise<ProviderResult> {
    try {
      if (!request || !request.conversation) {
        return {
          success: false,
          error: 'Invalid AI request: missing conversation context.',
        };
      }

      const structuredContext = request.structuredContext
        || await ContextEngine.processContextAsync(request.conversation);

      const compiledPrompt = request.compiledPrompt || PromptComposer.compose({
        context: structuredContext,
      });

      const enrichedRequest: AIRequest = {
        ...request,
        structuredContext,
        compiledPrompt,
      };

      return await this.providerManager.executeStreamWithFallback(enrichedRequest, onChunk, options);
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'AIService streaming failure.',
      };
    }
  }
}
