import { DetectedIntentScore, DetectedToneScore, PendingContextItems } from '@rapport/shared';

export class ObjectiveRecommender {
  public static recommendGoal(params: {
    tones: DetectedToneScore[];
    intents: DetectedIntentScore[];
    pendingItems: PendingContextItems;
  }): string {
    const { tones, intents, pendingItems } = params;

    const primaryIntent = intents[0]?.intent || '';
    const primaryTone = tones[0]?.tone || '';

    if (primaryIntent === 'Ending Conversation') {
      return 'End politely';
    }

    if (pendingItems.unconfirmedPlans.length > 0 || primaryIntent === 'Making Plans') {
      return 'Confirm plans';
    }

    if (pendingItems.questionsAwaitingReply.length > 0 || primaryIntent === 'Asking Question') {
      return 'Answer & ask follow-up question';
    }

    if (primaryTone === 'Playful' || primaryTone === 'Flirty') {
      return 'Be playful';
    }

    if (primaryTone === 'Emotional' || primaryTone === 'Serious') {
      return 'Clarify misunderstanding & offer support';
    }

    if (primaryIntent === 'Greeting') {
      return 'Maintain engagement & break the ice';
    }

    return 'Continue naturally & move conversation forward';
  }
}
