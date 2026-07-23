import { AIRequest, ProviderResult, AISuggestion } from '@rapport/shared';
import { AIPipelineInspector } from '@rapport/shared';
import { DEBUG_AI_PIPELINE } from '../prompts/PromptComposer.js';
import { ContextEngine } from '../context/ContextEngine.js';
import { PromptComposer } from '../prompts/PromptComposer.js';
import { ApiKeyManager } from '../providers/ApiKeyManager.js';
import { ProviderManager } from '../providers/ProviderManager.js';
import { SettingsManager } from './SettingsManager.js';
import { ReplyQualityEvaluator } from '../intelligence/ReplyQualityEvaluator.js';

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

      // 3. Route to active provider with Quality Evaluation and Auto-Regeneration loop
      let attempts = 0;
      const maxAttempts = 3;
      const history: Array<{
        result: ProviderResult;
        suggestions: AISuggestion[];
        avgScore: number;
      }> = [];

      let currentRequest = enrichedRequest;
      let finalResult: ProviderResult | null = null;

      while (attempts < maxAttempts) {
        inspector?.startStage(`[6] Provider Request (Attempt ${attempts + 1})`);
        const result = await this.providerManager.executeWithFallback(currentRequest, options);
        inspector?.endStage(`[6] Provider Request (Attempt ${attempts + 1})`, {
          provider: result.data?.providerId || resolvedProvider,
          success: result.success,
        }, !result.success);

        if (!result.success || !result.data) {
          finalResult = result;
          break;
        }

        // Parse suggestions
        const rawSuggestions: AISuggestion[] = result.data.suggestions || (result.data.suggestedReply ? [{
          id: `sug_${Date.now()}_0`,
          text: result.data.suggestedReply,
          tone: result.data.tone || 'Balanced',
          style: 'Default',
          explanation: result.data.reasoning || '',
          confidence: 0.9,
        }] : []);

        // 4. Quality Evaluation
        if (settings.enableReplyQualityEngine) {
          const evaluated = rawSuggestions.map((sug) => {
            const report = ReplyQualityEvaluator.evaluate(sug.text, structuredContext, sug.tone || sug.style || 'Balanced');
            return {
              ...sug,
              qualityReport: report,
            };
          });

          const valid = evaluated.filter((s) => s.qualityReport?.isValid);
          const avgScore = evaluated.length > 0
            ? evaluated.reduce((sum, s) => sum + (s.qualityReport?.overallScore || 0), 0) / evaluated.length
            : 0;

          history.push({ result, suggestions: evaluated, avgScore });

          // If we have enough valid suggestions, or if this is the last attempt
          if (valid.length >= Math.min(2, rawSuggestions.length)) {
            result.data.suggestions = valid;
            // Also update the main suggestion reply field to the top valid suggestion
            if (valid.length > 0) {
              result.data.suggestedReply = valid[0].text;
              result.data.tone = valid[0].tone;
              result.data.reasoning = valid[0].explanation;
            }
            finalResult = result;
            break;
          }

          // Otherwise, collect issues and prepare regeneration prompt feedback
          const allIssues = new Set<string>();
          evaluated.forEach((s) => s.qualityReport?.issues.forEach((i) => allIssues.add(i)));
          
          console.warn(`[Rapport AI:QualityEngine] Attempt ${attempts + 1} failed quality checks. Issues:`, [...allIssues]);

          const issueFeedback = `\n\n[QUALITY WARNING FROM PREVIOUS ATTEMPT]: The suggestions generated were rejected due to the following quality issues:\n${[...allIssues].map((i) => ` - ${i}`).join('\n')}\nPlease generate new, distinct, natural, and contextually relevant suggestions that do NOT repeat the previous attempts and strictly avoid these issues.`;

          if (currentRequest.compiledPrompt) {
            currentRequest = {
              ...currentRequest,
              compiledPrompt: {
                ...currentRequest.compiledPrompt,
                userPrompt: currentRequest.compiledPrompt.userPrompt + issueFeedback,
              },
            };
          }
        } else {
          // If quality engine is disabled, return immediately on first success
          finalResult = result;
          break;
        }

        attempts++;
      }

      // If we exhausted all attempts without finding a fully valid set of suggestions,
      // select the attempt with the highest average overall score (Resilient Fallback)
      if (!finalResult && history.length > 0) {
        console.warn('[Rapport AI:QualityEngine] All regeneration attempts failed quality threshold. Falling back to highest scoring attempt.');
        const best = history.sort((a, b) => b.avgScore - a.avgScore)[0];
        finalResult = best.result;
        if (finalResult.data) {
          finalResult.data.suggestions = best.suggestions;
          if (best.suggestions.length > 0) {
            finalResult.data.suggestedReply = best.suggestions[0].text;
            finalResult.data.tone = best.suggestions[0].tone;
            finalResult.data.reasoning = best.suggestions[0].explanation;
          }
        }
      }

      const finishTime = Date.now();
      const totalDurationMs = finishTime - startTime;
      const providerUsed = finalResult?.data?.providerId || resolvedProvider;

      // 5. Provider Response Parsed
      inspector?.startStage('[7] Provider Response Parsed');
      const suggestionCount = finalResult?.data?.suggestions?.length || (finalResult?.data?.suggestedReply ? 1 : 0);
      inspector?.endStage('[7] Provider Response Parsed', { suggestionCount }, !finalResult?.success);

      console.log(`[Rapport AI:Pipeline] Request Finished at ${new Date(finishTime).toISOString()} (Duration: ${totalDurationMs}ms)`);
      console.log(`[Rapport AI:Pipeline] Provider Used: "${providerUsed}"`);

      // Update Dev Observability Diagnostics Summary
      inspector?.updateDiagnostics({
        currentStage: 'Completed',
        totalDurationMs,
        success: finalResult?.success || false,
        provider: providerUsed,
        model: selectedModel,
        promptLength,
        completionTokens: finalResult?.data?.metadata?.tokens as number | undefined,
        finishReason: finalResult?.success ? 'stop' : 'error',
        lastError: finalResult?.error,
      });

      // Throw warning immediately if Provider Used != Selected Provider
      if (selectedProvider !== 'fake-provider' && providerUsed !== selectedProvider) {
        console.warn(
          `[Rapport AI:WARNING] Provider mismatch detected! Selected Provider is "${selectedProvider}", but Provider Used was "${providerUsed}".`
        );
      }

      return finalResult || { success: false, error: 'AIService failed to generate any response.' };
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
