import {
  AIRequest,
  AISuggestion,
  ProviderCapabilities,
  ProviderResult,
} from '@rapport/shared';
import { AIProvider, ModelDescription } from './AIProvider.js';
import { ApiKeyManager } from './ApiKeyManager.js';
import { MetricsTracker } from './MetricsTracker.js';
import { SuggestionEngine } from '../prompts/SuggestionEngine.js';

export class GeminiProvider implements AIProvider {
  public readonly id = 'gemini';
  public readonly name = 'Google Gemini Provider';

  public readonly capabilities: ProviderCapabilities = {
    supportsStreaming: true,
    supportsVision: true,
    supportsCustomSystemPrompts: true,
    maxContextTokens: 1000000,
    supportedModels: [
      'gemini-3.5-pro',
      'gemini-3.5-flash',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
    ],
  };

  private readonly keyManager = ApiKeyManager.getInstance();
  private readonly metricsTracker = MetricsTracker.getInstance();

  public async validateKey(apiKey: string): Promise<boolean> {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        {
          method: 'GET',
        }
      );
      return res.status === 200;
    } catch (err) {
      console.warn('[GeminiProvider] Key validation network error:', err);
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
        error: 'Missing Google Gemini API Key. Please configure your API key in extension settings.',
      };
    }

    const compiledPrompt = request.compiledPrompt;
    const model = (request.options?.model as string) || 'gemini-3.5-flash';
    const temperature = (request.options?.temperature as number) ?? 0.7;
    const maxTokens = (request.options?.maxTokens as number) ?? 600;

    const baseSystemPrompt = compiledPrompt?.systemPrompt || 'You are an expert conversation copilot.';
    const systemContent = `${baseSystemPrompt}\n\n${SuggestionEngine.getStructuredOutputDirective()}`;
    const userContent = compiledPrompt?.userPrompt || request.prompt || 'Suggest helpful replies for this conversation.';

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
      // Log before request
      const promptLength = systemContent.length + userContent.length;
      console.log(`[Gemini Request] Provider: ${this.id}`);
      console.log(`[Gemini Request] Endpoint: ${url.split('?')[0]}`);
      console.log(`[Gemini Request] Model: ${model}`);
      console.log(`[Gemini Request] Prompt Length: ${promptLength}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: options?.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemContent }] },
          contents: [{ parts: [{ text: userContent }] }],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
          },
        }),
      });

      const latencyMs = Date.now() - startTime;
      console.log(`[Gemini Response] HTTP status: ${response.status}`);
      console.log(`[Gemini Response] Latency: ${latencyMs}ms`);

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`[Gemini Response] Error body: ${errorText}`);

        let parsedMessage = errorText;
        try {
          const json = JSON.parse(errorText);
          if (json?.error?.message) {
            parsedMessage = json.error.message;
          }
        } catch {
          // Keep raw
        }
        this.metricsTracker.record({
          providerId: this.id,
          model,
          latencyMs,
          success: false,
          timestamp: Date.now(),
          error: parsedMessage,
        });

        if (response.status === 400 || response.status === 403) return { success: false, error: `Invalid Google Gemini API Key or permissions: ${parsedMessage}` };
        if (response.status === 429) return { success: false, error: `Gemini Rate limit/Quota exceeded: ${parsedMessage}` };
        return { success: false, error: `Gemini API Error (${response.status}): ${parsedMessage}` };
      }

      const data = await response.json();
      console.log(`[Gemini Response] Response body: ${JSON.stringify(data)}`);

      const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const usageTokens = data?.usageMetadata?.totalTokenCount;

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
          reasoning: `Generated by Google Gemini (${model}).`,
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
      const errorMsg = err instanceof Error ? err.message : 'Gemini network error';
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
        error: 'Missing Google Gemini API Key. Please configure your API key in extension settings.',
      };
    }

    const compiledPrompt = request.compiledPrompt;
    const model = (request.options?.model as string) || 'gemini-3.5-flash';
    const temperature = (request.options?.temperature as number) ?? 0.7;
    const maxTokens = (request.options?.maxTokens as number) ?? 600;

    const baseSystemPrompt = compiledPrompt?.systemPrompt || 'You are an expert conversation copilot.';
    const systemContent = `${baseSystemPrompt}\n\n${SuggestionEngine.getStructuredOutputDirective()}`;
    const userContent = compiledPrompt?.userPrompt || request.prompt || 'Suggest helpful replies for this conversation.';

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
      
      // Log before request
      const promptLength = systemContent.length + userContent.length;
      console.log(`[Gemini Request Stream] Provider: ${this.id}`);
      console.log(`[Gemini Request Stream] Endpoint: ${url.split('?')[0]}`);
      console.log(`[Gemini Request Stream] Model: ${model}`);
      console.log(`[Gemini Request Stream] Prompt Length: ${promptLength}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: options?.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemContent }] },
          contents: [{ parts: [{ text: userContent }] }],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
          },
        }),
      });

      const latencyMs = Date.now() - startTime;
      console.log(`[Gemini Response Stream] HTTP status: ${response.status}`);
      console.log(`[Gemini Response Stream] Latency: ${latencyMs}ms`);

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`[Gemini Response Stream] Error body: ${errorText}`);

        let parsedMessage = errorText;
        try {
          const json = JSON.parse(errorText);
          if (json?.error?.message) {
            parsedMessage = json.error.message;
          }
        } catch {
          // Keep raw
        }
        return { success: false, error: `Gemini Streaming Error (${response.status}): ${parsedMessage}` };
      }

      const reader = response.body?.getReader();
      if (!reader) {
        return { success: false, error: 'Gemini response body reader unavailable.' };
      }

      const decoder = new TextDecoder('utf-8');
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            try {
              const json = JSON.parse(dataStr);
              const textDelta = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (textDelta) {
                fullContent += textDelta;
                onChunk(textDelta);
              }
            } catch {
              // Ignore non-json chunk lines
            }
          }
        }
      }

      const finalLatencyMs = Date.now() - startTime;
      const fallbackTone = request.structuredContext?.tone || 'Friendly';
      const suggestions = SuggestionEngine.parseSuggestions(fullContent, fallbackTone);

      return {
        success: true,
        data: {
          suggestedReply: suggestions[0]?.text || fullContent.trim(),
          reasoning: `Streamed by Google Gemini (${model}).`,
          tone: suggestions[0]?.tone || fallbackTone,
          providerId: this.id,
          suggestions,
          metadata: { model, latencyMs: finalLatencyMs },
        },
      };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, error: 'Request was cancelled by user.' };
      }
      return { success: false, error: err instanceof Error ? err.message : 'Gemini stream error' };
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
    return APPROVED_GEMINI_MODELS;
  }

  public async refreshModels(): Promise<ModelDescription[]> {
    const apiKey = await this.keyManager.getKey(this.id);
    if (!apiKey) {
      return APPROVED_GEMINI_MODELS;
    }

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        { method: 'GET' }
      );
      if (res.status !== 200) {
        return APPROVED_GEMINI_MODELS;
      }
      const data = await res.json();
      const rawModels = data.models || [];
      
      // Filter models
      const filtered = rawModels.filter((m: any) => {
        const id = m.name ? m.name.replace('models/', '') : '';
        const nameLower = id.toLowerCase();
        // Only keep models starting with gemini
        if (!nameLower.startsWith('gemini')) return false;
        
        // Filter out: Preview models, Deprecated models, Experimental models, Retired models
        if (nameLower.includes('preview') ||
            nameLower.includes('deprecated') ||
            nameLower.includes('experimental') ||
            nameLower.includes('exp') ||
            nameLower.includes('retired') ||
            nameLower.includes('bison') ||
            nameLower.includes('tuning') ||
            nameLower.includes('internal') ||
            nameLower.includes('vision')) {
          return false;
        }
        return true;
      });

      // Map models
      const mapped: ModelDescription[] = filtered.map((m: any) => {
        const rawId = m.name ? m.name.replace('models/', '') : '';
        // Check if we have hardcoded metadata
        const existing = APPROVED_GEMINI_MODELS.find(x => x.id === rawId);
        if (existing) return existing;

        // Otherwise generate future proof description
        const idLower = rawId.toLowerCase();
        let displayName = rawId;
        // Clean display name, e.g. gemini-1.5-flash -> Gemini 1.5 Flash
        displayName = rawId
          .split('-')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        // If google introduces gemini-4 or gemini-ultra, map them dynamically:
        let speed = 'Fast';
        let reasoning = 'Standard';
        let useCase = 'Fast responses for daily messaging.';
        let isRecommended = false;

        if (idLower.includes('flash') && idLower.includes('8b')) {
          displayName = 'Gemini Flash Lite';
          speed = 'Blazing';
          reasoning = 'Lightweight';
          useCase = 'Fastest and lowest cost.';
        } else if (idLower.includes('flash')) {
          speed = 'Fast';
          reasoning = 'Standard';
          useCase = 'Fast responses for daily messaging.';
          isRecommended = true;
        } else if (idLower.includes('pro')) {
          speed = 'Moderate';
          reasoning = 'High';
          useCase = 'Best reasoning for emotionally complex conversations.';
        } else if (idLower.includes('ultra')) {
          speed = 'Moderate';
          reasoning = 'Very High';
          useCase = 'Deep reasoning for complex tasks.';
        } else if (idLower.includes('nano')) {
          speed = 'Blazing';
          reasoning = 'Lightweight';
          useCase = 'Resource efficient offline execution.';
        }

        return {
          id: rawId,
          displayName,
          speed,
          reasoning,
          useCase,
          contextLength: m.inputTokenLimit ? `${Math.round(m.inputTokenLimit / 1000)}K tokens` : undefined,
          isRecommended,
        };
      });

      // Sort: Recommended on top, then default, then others
      const sorted = mapped.sort((a, b) => {
        const aVal = (a.isRecommended ? 2 : 0) + (a.isDefault ? 1 : 0);
        const bVal = (b.isRecommended ? 2 : 0) + (b.isDefault ? 1 : 0);
        return bVal - aVal;
      });

      // Save to cache
      await this.setCachedModels(sorted);
      return sorted.length > 0 ? sorted : APPROVED_GEMINI_MODELS;
    } catch (err) {
      console.warn('[GeminiProvider] Failed to refresh models:', err);
      return APPROVED_GEMINI_MODELS;
    }
  }

  public async selectModel(modelId: string): Promise<void> {
    console.log(`[GeminiProvider] Selected model: ${modelId}`);
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

const APPROVED_GEMINI_MODELS: ModelDescription[] = [
  {
    id: 'gemini-1.5-flash',
    displayName: 'Gemini Flash',
    speed: 'Fast',
    reasoning: 'Standard',
    useCase: 'Fast responses for daily messaging.',
    contextLength: '1M tokens',
    isRecommended: true,
    isDefault: true,
  },
  {
    id: 'gemini-1.5-pro',
    displayName: 'Gemini Pro',
    speed: 'Moderate',
    reasoning: 'High',
    useCase: 'Best reasoning for emotionally complex conversations.',
    contextLength: '2M tokens',
  },
  {
    id: 'gemini-1.5-flash-8b',
    displayName: 'Gemini Flash Lite',
    speed: 'Blazing',
    reasoning: 'Lightweight',
    useCase: 'Fastest and lowest cost.',
    contextLength: '1M tokens',
  }
];
