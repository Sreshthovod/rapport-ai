import {
  CanonicalMessage,
  ContextSummary,
  ExtractedFact,
  StageType,
  ToneType,
} from '@rapport/shared';

export class ContextSummaryGenerator {
  public static generateSummary(params: {
    messages: CanonicalMessage[];
    tone: ToneType;
    stage: StageType;
    facts: ExtractedFact[];
    draftText?: string;
  }): ContextSummary {
    const { messages, tone, stage, facts, draftText = '' } = params;

    const pendingQuestions: string[] = [];
    messages.forEach((msg) => {
      if (msg.direction === 'incoming' && msg.text.includes('?')) {
        pendingQuestions.push(msg.text);
      }
    });

    const recentMsgTexts = messages.slice(-3).map((m) => `${m.sender}: "${m.text}"`).join(' | ');
    const recentSummary = recentMsgTexts || 'No recent messages.';

    // Infer current topic heuristic
    let currentTopic = 'General Conversation';
    if (facts.some((f) => f.category === 'plan' || f.category === 'date')) {
      currentTopic = 'Scheduling & Planning';
    } else if (facts.some((f) => f.category === 'location')) {
      currentTopic = 'Location & Travel';
    }

    // Infer user intent from draft or pending questions
    let userIntent = 'Maintain rapport and keep conversation flowing';
    let suggestedGoal = 'Friendly Engagement';

    if (draftText) {
      userIntent = `Compose draft reply: "${draftText}"`;
    } else if (pendingQuestions.length > 0) {
      userIntent = `Answer question: "${pendingQuestions[pendingQuestions.length - 1]}"`;
      suggestedGoal = 'Direct Answer & Follow-up';
    }

    return {
      recentSummary,
      currentTopic,
      detectedTone: tone,
      conversationStage: stage,
      pendingQuestions,
      importantFacts: facts,
      userIntent,
      suggestedGoal,
    };
  }
}
