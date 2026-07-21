import { ConversationContext, FakeAIResponse } from '@rapport/shared';

export class FakeAIService {
  public static async generateReply(
    context: ConversationContext
  ): Promise<FakeAIResponse> {
    // Simulate realistic async pipeline execution delay (600ms)
    await new Promise((resolve) => setTimeout(resolve, 600));

    const contactName = context.contact?.contactName || 'there';
    const lastMsg = context.lastIncomingMessage?.text || '';

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
      suggestedReply,
      reasoning,
      tone,
    };
  }
}
