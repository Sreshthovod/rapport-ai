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

      const structured = request.structuredContext;
      const contactName = request.conversation?.contact?.contactName || 'there';
      const lastMsg = structured?.conversation.latestMessage?.text || request.conversation?.lastIncomingMessage?.text || '';
      const detectedTone = structured?.tone || 'Friendly';
      const stage = structured?.stage || 'Small Talk';

      let suggestedReply = 'Sounds good! Looking forward to it.';
      let reasoning = `Detected tone [${detectedTone}] and stage [${stage}]. Maintaining positive rapport.`;
      let tone = detectedTone;

      if (lastMsg.toLowerCase().includes('when') || lastMsg.toLowerCase().includes('time') || stage === 'Planning') {
        suggestedReply = `I'll check my schedule and get back to you shortly, ${contactName}.`;
        reasoning = `Inferred stage [${stage}]. Clear, professional acknowledgment requesting alignment time.`;
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
