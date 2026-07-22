import { CanonicalMessage, StageType } from '@rapport/shared';

export class ConversationStageAnalyzer {
  public static inferStage(messages: CanonicalMessage[], draftText: string = ''): StageType {
    if (!messages || messages.length === 0) {
      return 'Unknown';
    }

    const allTexts = [...messages.map((m) => m.text), draftText].join(' ').toLowerCase();

    const endingRegex = /(bye|goodnight|talk later|see ya|catch you later|have a good one)/i;
    const introRegex = /(hi|hello|hey|nice to meet|who is this)/i;
    const planningRegex = /(when|where|what time|meet|schedule|plan|tomorrow|weekend|lunch|dinner|calendar)/i;
    const conflictRegex = /(why did you|stop|no way|disagree|unacceptable|problem|wrong)/i;
    const deepRegex = /(feel|think about|life|future|opinion|honestly|believe)/i;

    if (endingRegex.test(allTexts)) return 'Ending Conversation';
    if (conflictRegex.test(allTexts)) return 'Conflict';
    if (planningRegex.test(allTexts)) return 'Planning';
    if (deepRegex.test(allTexts)) return 'Deep Conversation';
    if (introRegex.test(allTexts) && messages.length <= 3) return 'Introduction';
    if (messages.length > 0) return 'Small Talk';

    return 'Unknown';
  }
}
