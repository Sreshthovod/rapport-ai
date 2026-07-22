import {
  CanonicalMessage,
  CommunicationStyle,
  RelationshipContext,
  RelationshipProfile,
  RelationshipType,
} from '@rapport/shared';

export class RelationshipHeuristics {
  public static evaluateStyle(messages: CanonicalMessage[]): CommunicationStyle {
    const combinedText = messages.map((m) => m.text).join(' ').toLowerCase();

    // Formality heuristic
    const formalWords = /(dear|sincerely|regards|please find|attached|meeting|agenda|accordingly|furthermore)/i;
    const casualWords = /(hey|hi|yeah|cool|awesome|nope|gonna|wanna|sup|lol|haha|btw)/i;
    const isFormal = formalWords.test(combinedText) && !casualWords.test(combinedText);

    // Playfulness heuristic
    const playfulWords = /(haha|lol|rofl|joke|funny|crazy|wild|😜|😂|🤣|🤪|🍕|🎉)/i;
    const isPlayful = playfulWords.test(combinedText);

    // Expressiveness heuristic
    const avgLen = messages.length > 0 ? combinedText.length / messages.length : 0;
    const hasEmojis = /[\u{1F300}-\u{1F9FF}]/u.test(combinedText);
    const isExpressive = avgLen > 60 || hasEmojis;

    return {
      formality: isFormal ? 'formal' : 'casual',
      playfulness: isPlayful ? 'playful' : 'serious',
      expressiveness: isExpressive ? 'emotionally_expressive' : 'concise',
    };
  }

  public static inferRelationshipType(
    messages: CanonicalMessage[],
    existingProfile?: RelationshipProfile | null
  ): RelationshipType {
    if (existingProfile && existingProfile.relationshipType !== 'unknown') {
      return existingProfile.relationshipType;
    }

    const combinedText = messages.map((m) => m.text).join(' ').toLowerCase();

    const familyWords = /(mom|dad|brother|sister|grandma|grandpa|aunt|uncle|cousin|family)/i;
    const workWords = /(meeting|deadline|project|client|report|office|invoice|slack|review|deliverable)/i;
    const friendWords = /(bro|dude|man|hang out|weekend|party|beer|coffee|catch up|lol)/i;

    if (familyWords.test(combinedText)) return 'family';
    if (workWords.test(combinedText)) return 'work';
    if (friendWords.test(combinedText)) return 'friend';

    return 'unknown';
  }

  public static calculateInteractionScore(
    messages: CanonicalMessage[],
    existingProfile?: RelationshipProfile | null
  ): number {
    const countScore = Math.min(50, (messages.length + (existingProfile?.totalInteractions || 0)) * 5);

    let recencyScore = 30;
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const hoursAgo = (Date.now() - lastMsg.timestamp) / (1000 * 60 * 60);
      if (hoursAgo < 1) recencyScore = 50;
      else if (hoursAgo < 24) recencyScore = 40;
      else if (hoursAgo < 72) recencyScore = 20;
      else recencyScore = 10;
    }

    const total = Math.min(100, Math.round(countScore + recencyScore));
    return total;
  }

  public static buildRelationshipContext(params: {
    messages: CanonicalMessage[];
    profile?: RelationshipProfile | null;
  }): RelationshipContext {
    const { messages, profile } = params;

    const communicationStyle = RelationshipHeuristics.evaluateStyle(messages);
    const relationshipType = RelationshipHeuristics.inferRelationshipType(messages, profile);
    const interactionScore = RelationshipHeuristics.calculateInteractionScore(messages, profile);

    let engagementLevel: 'high' | 'medium' | 'low' = 'medium';
    if (interactionScore >= 70) engagementLevel = 'high';
    else if (interactionScore <= 30) engagementLevel = 'low';

    const preferredTone =
      communicationStyle.formality === 'formal'
        ? 'Professional'
        : communicationStyle.playfulness === 'playful'
        ? 'Playful'
        : 'Casual';

    const commonTopics = profile?.commonTopics || ['General Conversation'];

    return {
      relationshipType,
      communicationStyle,
      engagementLevel,
      commonTopics,
      preferredTone,
      confidence: 0.9,
      interactionScore,
    };
  }
}
