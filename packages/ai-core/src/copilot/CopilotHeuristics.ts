import { CopilotRecommendation, StructuredAIContext } from '@rapport/shared';

export class CopilotHeuristics {
  public static evaluateRecommendations(context: StructuredAIContext): CopilotRecommendation[] {
    const recommendations: CopilotRecommendation[] = [];

    const pending = context.intelligence?.pendingItems;
    const health = context.intelligence?.health;
    const tones = context.intelligence?.tones || [];
    const relationship = context.relationship;

    // 1. Opportunity: Unconfirmed Plans
    if (pending && (pending.unconfirmedPlans.length > 0 || pending.datesMentioned.length > 0)) {
      recommendations.push({
        id: 'rec_confirm_plans',
        type: 'Confirm Plans',
        title: 'Confirm Plans & Logistics',
        reason: 'Unconfirmed plans or dates were detected in recent messages.',
        priority: 'high',
        confidence: 0.95,
        suggestedGoal: 'Invitation',
      });
    }

    // 2. Opportunity: Unanswered Question
    if (pending && pending.questionsAwaitingReply.length > 0) {
      recommendations.push({
        id: 'rec_suggest_reply',
        type: 'Suggest Reply',
        title: 'Answer Pending Question',
        reason: 'The contact asked a question that has not been answered yet.',
        priority: 'high',
        confidence: 0.94,
        suggestedGoal: 'Reply Suggestions',
      });
    }

    // 3. Opportunity: Stalled / Dry Conversation
    if (health && (health.isRecentlyInactive || health.engagementLevel === 'Low engagement')) {
      recommendations.push({
        id: 'rec_break_silence',
        type: 'Break the Silence',
        title: 'Re-engage Stalled Thread',
        reason: 'The conversation pace has slowed down or become dry.',
        priority: 'medium',
        confidence: 0.88,
        suggestedGoal: 'Revive Dry Conversation',
      });
    }

    // 4. Opportunity: Lighten the Mood / Emotional Support
    const primaryTone = tones[0]?.tone;
    if (primaryTone === 'Emotional' || primaryTone === 'Serious') {
      recommendations.push({
        id: 'rec_lighten_mood',
        type: 'Lighten the Mood',
        title: 'Empathetic & Supportive Tone',
        reason: 'High emotional tension or serious tone detected.',
        priority: 'high',
        confidence: 0.9,
        suggestedGoal: 'Apology',
      });
    } else if (primaryTone === 'Playful' || primaryTone === 'Romantic') {
      recommendations.push({
        id: 'rec_playful',
        type: 'Lighten the Mood',
        title: 'Playful & Witty Engagement',
        reason: 'Playful rapport detected in current dialogue.',
        priority: 'medium',
        confidence: 0.89,
        suggestedGoal: 'Flirty Conversation',
      });
    }

    // 5. Default Opportunity: Natural Continuation
    if (recommendations.length === 0) {
      recommendations.push({
        id: 'rec_follow_up',
        type: 'Suggest Follow-up Question',
        title: 'Ask Follow-up Question',
        reason: 'Keep dialogue progressing smoothly.',
        priority: 'low',
        confidence: 0.85,
        suggestedGoal: 'Ask Better Questions',
      });
    }

    return recommendations.sort((a, b) => {
      const priorityMap = { high: 3, medium: 2, low: 1 };
      return priorityMap[b.priority] - priorityMap[a.priority];
    });
  }
}
