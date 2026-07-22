import { AIRequest, ProviderCapabilities, ProviderResult } from '@rapport/shared';
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
      // Simulate realistic async processing delay (600ms)
      await new Promise((resolve) => setTimeout(resolve, 600));

      const context = request.conversation;
      const contactName = context?.contact?.contactName || 'there';
      const lastMsg = context?.lastIncomingMessage?.text || '';

      let suggestedReply = 'Sounds good! Looking forward to it.';
      let reasoning = 'Friendly and positive response to maintain positive rapport.';
      let tone = 'Casual';

      if (lastMsg.toLowerCase().includes('when') || lastMsg.toLowerCase().includes('time')) {
        suggestedReply = `I'll check my schedule and get back to you shortly, ${contactName}.`;
        reasoning = 'Clear, professional acknowledgment requesting brief alignment time.';
        tone = 'Professional';
      } else if (lastMsg.toLowerCase().includes('thanks') || lastMsg.toLowerCase().includes('thank you')) {
        suggestedReply = 'Anytime! Happy to help out.';
        reasoning = 'Warm, supportive closing gesture.';
        tone = 'Empathetic';
      }

      return {
        success: true,
        data: {
          suggestedReply,
          reasoning,
          tone,
          providerId: this.id,
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
