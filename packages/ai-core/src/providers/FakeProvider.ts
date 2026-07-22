import {
  AIRequest,
  AISuggestion,
  ProviderCapabilities,
  ProviderPromptRequest,
  ProviderResult,
} from '@rapport/shared';
import { ResponseEvaluator } from '../prompts/ResponseEvaluator.js';
import { AIProvider } from './AIProvider.js';

export class FakeProvider implements AIProvider {
  public readonly id = 'fake-provider';
  public readonly name = 'Deterministic Fake AI Provider';

  public readonly capabilities: ProviderCapabilities = {
    supportsStreaming: false,
    supportsVision: false,
    supportsCustomSystemPrompts: true,
    maxContextTokens: 4096,
  };

  public async generateReply(request: AIRequest): Promise<ProviderResult> {
    try {
      // Simulate realistic async pipeline execution delay (500ms)
      await new Promise((resolve) => setTimeout(resolve, 500));

      const structured = request.structuredContext;
      const compiledPrompt = request.compiledPrompt;
      const contactName = request.conversation?.contact?.contactName || 'there';
      const lastMsg = structured?.conversation.latestMessage?.text || request.conversation?.lastIncomingMessage?.text || '';
      const detectedTone = structured?.tone || 'Friendly';
      const stage = structured?.stage || 'Small Talk';

      // 1. Build standardized ProviderPromptRequest object enriched with PromptSpec
      const promptRequest: ProviderPromptRequest = {
        conversationSummary: structured?.summary.recentSummary || 'Recent conversation thread.',
        latestMessages: structured?.recentMessages.map((m) => `${m.sender}: ${m.text}`) || [],
        detectedTone,
        objective: structured?.intelligence?.suggestedGoal || structured?.summary.suggestedGoal || 'Friendly Engagement',
        maxSuggestions: 4,
        intelligence: structured?.intelligence,
        relationship: structured?.relationship,
        compiledPrompt,
      };

      // 2. Generate multi-tone suggestions deterministically (Safe, Balanced, Creative, Short)
      const suggestions: AISuggestion[] = [];

      if (lastMsg.toLowerCase().includes('when') || lastMsg.toLowerCase().includes('time') || stage === 'Planning') {
        suggestions.push(
          {
            id: 'sug_1',
            tone: 'Friendly',
            style: 'Safe & Warm',
            text: `Hey ${contactName}! Let me check my calendar real quick and get back to you in a bit.`,
            explanation: 'Warm acknowledgment promising a prompt follow-up.',
            confidence: 0.92,
          },
          {
            id: 'sug_2',
            tone: 'Professional',
            style: 'Balanced & Direct',
            text: `I'll review my schedule and confirm our alignment time shortly, ${contactName}.`,
            explanation: 'Professional confirmation requesting brief review time.',
            confidence: 0.95,
          },
          {
            id: 'sug_3',
            tone: 'Funny',
            style: 'Creative & Humorous',
            text: `Consulting my crystal ball (and calendar) right now! Back in 5 mins. 🔮`,
            explanation: 'Lighthearted response to keep the mood playful.',
            confidence: 0.88,
          },
          {
            id: 'sug_4',
            tone: 'Short',
            style: 'Concise',
            text: 'Checking my schedule now! 🗓️',
            explanation: 'Ultra-concise status update.',
            confidence: 0.9,
          }
        );
      } else if (lastMsg.toLowerCase().includes('thanks') || lastMsg.toLowerCase().includes('thank you')) {
        suggestions.push(
          {
            id: 'sug_1',
            tone: 'Friendly',
            style: 'Safe & Warm',
            text: `Anytime ${contactName}! Always happy to help out. 😊`,
            explanation: 'Warm, supportive closing gesture.',
            confidence: 0.95,
          },
          {
            id: 'sug_2',
            tone: 'Professional',
            style: 'Balanced & Direct',
            text: 'You are very welcome. Please let me know if you need anything else.',
            explanation: 'Polite professional courtesy.',
            confidence: 0.94,
          },
          {
            id: 'sug_3',
            tone: 'Funny',
            style: 'Creative & Humorous',
            text: 'Don\'t mention it! Coffee is on you next time though ☕😄',
            explanation: 'Playful joke expressing willingness to help.',
            confidence: 0.86,
          },
          {
            id: 'sug_4',
            tone: 'Short',
            style: 'Concise',
            text: 'Happy to help! 👍',
            explanation: 'Quick emoji-backed acknowledgment.',
            confidence: 0.91,
          }
        );
      } else {
        suggestions.push(
          {
            id: 'sug_1',
            tone: 'Friendly',
            style: 'Safe & Warm',
            text: `Sounds great, ${contactName}! Looking forward to it. 😊`,
            explanation: 'Friendly positive reinforcement.',
            confidence: 0.93,
          },
          {
            id: 'sug_2',
            tone: 'Professional',
            style: 'Balanced & Direct',
            text: 'That sounds completely aligned. I will keep you posted on progress.',
            explanation: 'Clear professional commitment.',
            confidence: 0.91,
          },
          {
            id: 'sug_3',
            tone: 'Funny',
            style: 'Creative & Humorous',
            text: '100%! As long as there are snacks involved, count me in! 🍕',
            explanation: 'Humorous engagement.',
            confidence: 0.85,
          },
          {
            id: 'sug_4',
            tone: 'Short',
            style: 'Concise',
            text: 'Sounds good to me!',
            explanation: 'Direct affirmative reply.',
            confidence: 0.9,
          }
        );
      }

      // Evaluate primary suggestion with ResponseEvaluator if compiledPrompt is available
      const primarySuggestion = suggestions[0];
      let evaluation = null;
      if (compiledPrompt) {
        evaluation = ResponseEvaluator.evaluateResponse({
          responseText: primarySuggestion.text,
          promptSpec: compiledPrompt,
        });
      }

      return {
        success: true,
        data: {
          suggestedReply: primarySuggestion.text,
          reasoning: primarySuggestion.explanation,
          tone: primarySuggestion.tone,
          providerId: this.id,
          suggestions,
          metadata: {
            promptRequest,
            evaluation,
          },
        },
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'FakeProvider failed to generate response.',
      };
    }
  }
}
