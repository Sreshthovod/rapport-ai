import {
  AIRequest,
  AISuggestion,
  ProviderCapabilities,
  ProviderResult,
} from '@rapport/shared';
import { AIProvider } from './AIProvider.js';
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
}
