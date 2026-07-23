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

    // Build a meaningful recent summary — include the last 5 messages for richer context
    const recentMsgTexts = messages.slice(-5).map((m) => `${m.sender}: "${m.text}"`).join(' | ');
    const recentSummary = recentMsgTexts || 'No recent messages.';

    // Infer current topic — more specific ordering (most to least specific)
    let currentTopic = 'General Conversation';
    if (facts.some((f) => f.category === 'event')) {
      currentTopic = 'Events & Occasions';
    }
    if (facts.some((f) => f.category === 'location')) {
      currentTopic = 'Location & Travel';
    }
    if (facts.some((f) => f.category === 'plan' || f.category === 'date')) {
      currentTopic = 'Scheduling & Planning';
    }

    // Infer user intent — more specific when possible
    let userIntent = 'Maintain rapport and keep conversation flowing';
    let suggestedGoal = 'Friendly Engagement';

    if (draftText && draftText.trim().length > 0) {
      userIntent = `Finish and send draft reply: "${draftText}"`;
      suggestedGoal = 'Complete Draft Reply';
    } else if (pendingQuestions.length > 0) {
      const lastQ = pendingQuestions[pendingQuestions.length - 1];
      userIntent = `Answer question: "${lastQ.slice(0, 80)}"`;
      suggestedGoal = 'Direct Answer & Follow-up';
    } else if (stage === 'Planning') {
      userIntent = 'Confirm, coordinate, or propose concrete plans';
      suggestedGoal = 'Plan Confirmation';
    } else if (stage === 'Introduction') {
      userIntent = 'Establish connection and show interest';
      suggestedGoal = 'Build Initial Rapport';
    } else if (stage === 'Ending Conversation') {
      userIntent = 'Close the conversation warmly';
      suggestedGoal = 'Graceful Exit';
    } else if (facts.some((f) => f.category === 'event')) {
      userIntent = 'Engage around the mentioned event or occasion';
      suggestedGoal = 'Event Engagement';
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
