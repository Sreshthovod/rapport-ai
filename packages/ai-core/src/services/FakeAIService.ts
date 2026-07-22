import { ConversationContext, FakeAIResponse } from '@rapport/shared';
import { AIService } from './AIService.js';

export class FakeAIService {
  private static service = new AIService();

  public static async generateReply(
    context: ConversationContext
  ): Promise<FakeAIResponse> {
    const result = await FakeAIService.service.generateReply({ conversation: context });
    if (result.success && result.data) {
      return {
        suggestedReply: result.data.suggestedReply,
        reasoning: result.data.reasoning,
        tone: result.data.tone,
      };
    }
    throw new Error(result.error || 'Failed to generate AI response.');
  }
}
