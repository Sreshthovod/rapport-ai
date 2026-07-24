import {
  AIRequest,
  AISuggestion,
  ProviderCapabilities,
  ProviderResult,
} from '@rapport/shared';
import { AIProvider, ModelDescription } from './AIProvider.js';
import { ApiKeyManager } from './ApiKeyManager.js';
import { MetricsTracker } from './MetricsTracker.js';
import { ModelRegistry } from './ModelRegistry.js';
import { SuggestionEngine } from '../prompts/SuggestionEngine.js';

export class OpenAIProvider implements AIProvider {
  public readonly id = 'openai';
  public readonly name = 'OpenAI GPT Provider';

  public readonly capabilities: ProviderCapabilities = {
    supportsStreaming: true,
    supportsVision: true,
    supportsCustomSystemPrompts: true,
    maxContextTokens: 128000,
    supportedModels: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'],
  };

  private readonly keyManager = ApiKeyManager.getInstance();
  private readonly metricsTracker = MetricsTracker.getInstance();
  private readonly modelRegistry = ModelRegistry.getInstance();

  public async validateKey(apiKey: string): Promise<boolean> {
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      return res.status === 200;
    } catch {
      return false;
    }
  }

  public async generateReply(
    request: AIRequest,
    options?: { signal?: AbortSignal }
  ): Promise<ProviderResult> {
    const startTime = Date.now();
    const apiKey = await this.keyManager.getKey(this.id);

    if (!apiKey) {
      return {
        success: false,
        error: 'Missing OpenAI API Key. Please configure your API key in extension settings.',
      };
    }

    const compiledPrompt = request.compiledPrompt;
    const model = (request.options?.model as string) || 'gpt-4o-mini';
    const temperature = (request.options?.temperature as number) ?? 0.7;
    const maxTokens = (request.options?.maxTokens as number) ?? 600;

    const baseSystemPrompt = compiledPrompt?.systemPrompt || 'You are an expert conversation copilot.';
    const systemContent = `${baseSystemPrompt}\n\n${SuggestionEngine.getStructuredOutputDirective()}`;
    const userContent = compiledPrompt?.userPrompt || request.prompt || 'Suggest helpful replies for this conversation.';

    const isReasoningModel = model.startsWith('o1') || model.startsWith('o3');
    const endpoint = 'https://api.openai.com/v1/chat/completions';

    const payload: Record<string, any> = {
      model,
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: userContent },
      ],
    };

    if (isReasoningModel) {
      payload.max_completion_tokens = maxTokens;
    } else {
      payload.temperature = temperature;
      payload.max_tokens = maxTokens;
    }

    // Task 3: Log before every request
    console.log('[OpenAIProvider] Outgoing Request:', {
      provider: this.id,
      endpoint,
      model,
      promptLength: systemContent.length + userContent.length,
      payload,
    });

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal: options?.signal,
        body: JSON.stringify(payload),
      });

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        let parsedMessage = errorText;
        try {
          const json = JSON.parse(errorText);
          if (json?.error?.message) {
            parsedMessage = json.error.message;
          }
        } catch {
          // Keep raw error text
        }

        // Task 4: Log after error response
        console.error('[OpenAIProvider] Request Failed:', {
          httpStatus: response.status,
          errorBody: errorText,
          finishReason: 'error',
          latencyMs,
        });

        this.metricsTracker.record({
          providerId: this.id,
          model,
          latencyMs,
          success: false,
          timestamp: Date.now(),
          error: parsedMessage,
        });

        if (response.status === 401) return { success: false, error: `Invalid OpenAI API Key (401): ${parsedMessage}` };
        if (response.status === 429) return { success: false, error: `OpenAI Rate limit/Quota exceeded (429): ${parsedMessage}` };
        return { success: false, error: `OpenAI API Error (${response.status}): ${parsedMessage}` };
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content || '';
      const finishReason = data?.choices?.[0]?.finish_reason || 'stop';
      const usageTokens = data?.usage?.total_tokens;

      // Task 4: Log after successful response
      console.log('[OpenAIProvider] Request Succeeded:', {
        httpStatus: response.status,
        finishReason,
        latencyMs,
        tokens: usageTokens,
      });

      this.metricsTracker.record({
        providerId: this.id,
        model,
        latencyMs,
        tokens: usageTokens,
        success: true,
        timestamp: Date.now(),
      });

      const fallbackTone = request.structuredContext?.tone || 'Friendly';
      const suggestions = SuggestionEngine.parseSuggestions(content, fallbackTone);
      const primarySuggestion = suggestions[0]?.text || content.trim();

      return {
        success: true,
        data: {
          suggestedReply: primarySuggestion,
          reasoning: `Generated by OpenAI ${model} model.`,
          tone: suggestions[0]?.tone || fallbackTone,
          providerId: this.id,
          suggestions,
          metadata: {
            model,
            tokens: usageTokens,
            latencyMs,
          },
        },
      };
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : 'OpenAI network error';

      console.error('[OpenAIProvider] Network / Exception Error:', {
        error: errorMsg,
        latencyMs,
      });

      this.metricsTracker.record({
        providerId: this.id,
        model,
        latencyMs,
        success: false,
        timestamp: Date.now(),
        error: errorMsg,
      });

      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, error: 'Request was cancelled by user.' };
      }

      return { success: false, error: errorMsg };
    }
  }

  public async generateReplyStream(
    request: AIRequest,
    onChunk: (chunkText: string) => void,
    options?: { signal?: AbortSignal }
  ): Promise<ProviderResult> {
    const startTime = Date.now();
    const apiKey = await this.keyManager.getKey(this.id);

    if (!apiKey) {
      return {
        success: false,
        error: 'Missing OpenAI API Key. Please configure your API key in extension settings.',
      };
    }

    const compiledPrompt = request.compiledPrompt;
    const model = (request.options?.model as string) || 'gpt-4o-mini';
    const temperature = (request.options?.temperature as number) ?? 0.7;
    const maxTokens = (request.options?.maxTokens as number) ?? 600;

    const baseSystemPrompt = compiledPrompt?.systemPrompt || 'You are an expert conversation copilot.';
    const systemContent = `${baseSystemPrompt}\n\n${SuggestionEngine.getStructuredOutputDirective()}`;
    const userContent = compiledPrompt?.userPrompt || request.prompt || 'Suggest helpful replies for this conversation.';

    const isReasoningModel = model.startsWith('o1') || model.startsWith('o3');
    const endpoint = 'https://api.openai.com/v1/chat/completions';

    const payload: Record<string, any> = {
      model,
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: userContent },
      ],
      stream: true,
    };

    if (isReasoningModel) {
      payload.max_completion_tokens = maxTokens;
    } else {
      payload.temperature = temperature;
      payload.max_tokens = maxTokens;
    }

    // Task 3: Log before streaming request
    console.log('[OpenAIProvider] Outgoing Stream Request:', {
      provider: this.id,
      endpoint,
      model,
      promptLength: systemContent.length + userContent.length,
      payload,
    });

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal: options?.signal,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let parsedMessage = errorText;
        try {
          const json = JSON.parse(errorText);
          if (json?.error?.message) {
            parsedMessage = json.error.message;
          }
        } catch {
          // Keep raw
        }

        // Task 4: Log after error response
        console.error('[OpenAIProvider] Stream Request Failed:', {
          httpStatus: response.status,
          errorBody: errorText,
          finishReason: 'error',
          latencyMs: Date.now() - startTime,
        });

        if (response.status === 401) return { success: false, error: `Invalid OpenAI API Key (401): ${parsedMessage}` };
        if (response.status === 429) return { success: false, error: `OpenAI Rate limit/Quota exceeded (429): ${parsedMessage}` };
        return { success: false, error: `OpenAI Streaming API Error (${response.status}): ${parsedMessage}` };
      }

      const reader = response.body?.getReader();
      if (!reader) {
        return { success: false, error: 'OpenAI response body reader unavailable.' };
      }

      const decoder = new TextDecoder('utf-8');
      let fullContent = '';
      let finishReason = 'stop';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            if (dataStr === '[DONE]') continue;
            try {
              const json = JSON.parse(dataStr);
              const delta = json?.choices?.[0]?.delta?.content || '';
              if (json?.choices?.[0]?.finish_reason) {
                finishReason = json.choices[0].finish_reason;
              }
              if (delta) {
                fullContent += delta;
                onChunk(delta);
              }
            } catch {
              // Ignore non-json stream lines
            }
          }
        }
      }

      const latencyMs = Date.now() - startTime;

      // Task 4: Log after successful streaming response
      console.log('[OpenAIProvider] Stream Request Completed:', {
        httpStatus: response.status,
        finishReason,
        latencyMs,
      });

      const fallbackTone = request.structuredContext?.tone || 'Friendly';
      const suggestions = SuggestionEngine.parseSuggestions(fullContent, fallbackTone);

      return {
        success: true,
        data: {
          suggestedReply: suggestions[0]?.text || fullContent.trim(),
          reasoning: `Streamed by OpenAI ${model} model.`,
          tone: suggestions[0]?.tone || fallbackTone,
          providerId: this.id,
          suggestions,
          metadata: { model, latencyMs },
        },
      };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, error: 'Request was cancelled by user.' };
      }
      return { success: false, error: err instanceof Error ? err.message : 'OpenAI stream error' };
    }
  }

  public async verifyKey(apiKey: string): Promise<boolean> {
    return this.validateKey(apiKey);
  }

  public async listModels(): Promise<ModelDescription[]> {
    const cached = await this.getCachedModels();
    if (cached && cached.length > 0) {
      return cached;
    }
    return APPROVED_OPENAI_MODELS;
  }

  public async refreshModels(): Promise<ModelDescription[]> {
    const apiKey = await this.keyManager.getKey(this.id);
    if (!apiKey) {
      return APPROVED_OPENAI_MODELS;
    }

    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.status !== 200) {
        return APPROVED_OPENAI_MODELS;
      }
      const data = await res.json();
      const rawModels = data.data || [];

      // Filter out: Preview models, Deprecated models, Experimental models, Retired models
      const filtered = rawModels.filter((m: any) => {
        const idLower = (m.id || '').toLowerCase();
        
        // Only keep models starting with gpt- or o-
        if (!idLower.startsWith('gpt-') && !idLower.startsWith('o1-') && !idLower.startsWith('o3-') && !idLower.startsWith('o-')) {
          return false;
        }

        // Filter out: preview, deprecated, retired, instruct, vision, realtime, audio, moderation, embedding
        if (idLower.includes('preview') ||
            idLower.includes('deprecated') ||
            idLower.includes('retired') ||
            idLower.includes('instruct') ||
            idLower.includes('vision') ||
            idLower.includes('realtime') ||
            idLower.includes('audio') ||
            idLower.includes('moderation') ||
            idLower.includes('embedding') ||
            idLower.includes('internal') ||
            idLower.includes('search')) {
          return false;
        }
        return true;
      });

      // Map models to Clean Display Names and metadata
      const mapped: ModelDescription[] = filtered.map((m: any) => {
        const rawId = m.id;
        const existing = APPROVED_OPENAI_MODELS.find(x => x.id === rawId);
        if (existing) return existing;

        const idLower = rawId.toLowerCase();
        let displayName = rawId;
        // Clean display name, e.g. gpt-4o-mini -> GPT-4o Mini
        displayName = rawId
          .split('-')
          .map((word: string) => {
            if (word === 'gpt') return 'GPT';
            return word.charAt(0).toUpperCase() + word.slice(1);
          })
          .join(' ');

        let speed = 'Fast';
        let reasoning = 'Standard';
        let useCase = 'Fast responses for daily messaging.';
        let isRecommended = false;

        if (idLower.includes('mini') || idLower.includes('flash')) {
          speed = 'Blazing';
          reasoning = 'Standard';
          useCase = 'Fastest and lowest cost.';
        } else if (idLower.includes('4o')) {
          speed = 'Fast';
          reasoning = 'High';
          useCase = 'Best reasoning for emotionally complex conversations.';
          isRecommended = true;
        } else if (idLower.startsWith('o1') || idLower.startsWith('o3') || idLower.startsWith('o-')) {
          speed = 'Moderate';
          reasoning = 'Very High';
          useCase = 'Deep reasoning for conflict resolution and long context.';
        }

        return {
          id: rawId,
          displayName,
          speed,
          reasoning,
          useCase,
          contextLength: idLower.includes('o') ? '200K tokens' : '128K tokens',
          isRecommended,
        };
      });

      // Sort: Recommended on top, then default, then others
      const sorted = mapped.sort((a, b) => {
        const aVal = (a.isRecommended ? 2 : 0) + (a.isDefault ? 1 : 0);
        const bVal = (b.isRecommended ? 2 : 0) + (b.isDefault ? 1 : 0);
        return bVal - aVal;
      });

      await this.setCachedModels(sorted);
      return sorted.length > 0 ? sorted : APPROVED_OPENAI_MODELS;
    } catch (err) {
      console.warn('[OpenAIProvider] Failed to refresh models:', err);
      return APPROVED_OPENAI_MODELS;
    }
  }

  public async selectModel(modelId: string): Promise<void> {
    console.log(`[OpenAIProvider] Selected model: ${modelId}`);
  }

  public async generate(request: AIRequest, options?: { signal?: AbortSignal }): Promise<ProviderResult> {
    return this.generateReply(request, options);
  }

  private async getCachedModels(): Promise<ModelDescription[] | null> {
    try {
      const chromeObj = typeof window !== 'undefined' ? (window as any).chrome : null;
      if (chromeObj && chromeObj.storage && chromeObj.storage.local) {
        const key = `rapport_models_cache_${this.id}`;
        const res = await chromeObj.storage.local.get([key]);
        return res[key] || null;
      }
    } catch {}
    return null;
  }

  private async setCachedModels(models: ModelDescription[]): Promise<void> {
    try {
      const chromeObj = typeof window !== 'undefined' ? (window as any).chrome : null;
      if (chromeObj && chromeObj.storage && chromeObj.storage.local) {
        const key = `rapport_models_cache_${this.id}`;
        await chromeObj.storage.local.set({ [key]: models });
      }
    } catch {}
  }
}

const APPROVED_OPENAI_MODELS: ModelDescription[] = [
  {
    id: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    speed: 'Blazing',
    reasoning: 'Standard',
    useCase: 'Fastest and lowest cost.',
    contextLength: '128K tokens',
    isDefault: true,
  },
  {
    id: 'gpt-4o',
    displayName: 'GPT-4o',
    speed: 'Fast',
    reasoning: 'High',
    useCase: 'Best reasoning for emotionally complex conversations.',
    contextLength: '128K tokens',
    isRecommended: true,
  },
  {
    id: 'o3-mini',
    displayName: 'o3-mini',
    speed: 'Moderate',
    reasoning: 'Very High',
    useCase: 'Deep reasoning for conflict resolution and long context.',
    contextLength: '200K tokens',
  }
];
