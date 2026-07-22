import { PromptGoal } from '@rapport/shared';

export interface PromptTemplateDefinition {
  goal: PromptGoal;
  systemDirective: string;
  defaultConstraints: {
    neverSoundRobotic: boolean;
    avoidRepetition: boolean;
    preserveUserStyle: boolean;
    matchRelationshipTone: boolean;
    responseLength: 'concise' | 'balanced' | 'detailed';
    allowEmojis: boolean;
    maxTokens: number;
  };
}

export class TemplateRegistry {
  private static templates: Map<PromptGoal, PromptTemplateDefinition> = new Map([
    [
      'Reply Suggestions',
      {
        goal: 'Reply Suggestions',
        systemDirective: 'Generate contextual reply options matching the recent thread flow.',
        defaultConstraints: { neverSoundRobotic: true, avoidRepetition: true, preserveUserStyle: true, matchRelationshipTone: true, responseLength: 'balanced', allowEmojis: true, maxTokens: 250 },
      },
    ],
    [
      'Continue Conversation',
      {
        goal: 'Continue Conversation',
        systemDirective: 'Keep the dialogue moving naturally without awkward pauses.',
        defaultConstraints: { neverSoundRobotic: true, avoidRepetition: true, preserveUserStyle: true, matchRelationshipTone: true, responseLength: 'balanced', allowEmojis: true, maxTokens: 250 },
      },
    ],
    [
      'Revive Dry Conversation',
      {
        goal: 'Revive Dry Conversation',
        systemDirective: 'Re-engage a stalled or dry conversation with an intriguing topic or light joke.',
        defaultConstraints: { neverSoundRobotic: true, avoidRepetition: true, preserveUserStyle: true, matchRelationshipTone: true, responseLength: 'concise', allowEmojis: true, maxTokens: 200 },
      },
    ],
    [
      'Ask Better Questions',
      {
        goal: 'Ask Better Questions',
        systemDirective: 'Ask open-ended, engaging questions that invite rich responses.',
        defaultConstraints: { neverSoundRobotic: true, avoidRepetition: true, preserveUserStyle: true, matchRelationshipTone: true, responseLength: 'concise', allowEmojis: true, maxTokens: 200 },
      },
    ],
    [
      'Flirty Conversation',
      {
        goal: 'Flirty Conversation',
        systemDirective: 'Express playful charm, warmth, and witty flirtation appropriately.',
        defaultConstraints: { neverSoundRobotic: true, avoidRepetition: true, preserveUserStyle: true, matchRelationshipTone: true, responseLength: 'balanced', allowEmojis: true, maxTokens: 220 },
      },
    ],
    [
      'Professional Conversation',
      {
        goal: 'Professional Conversation',
        systemDirective: 'Maintain formal courtesy, clarity, and business-focused precision.',
        defaultConstraints: { neverSoundRobotic: true, avoidRepetition: true, preserveUserStyle: false, matchRelationshipTone: true, responseLength: 'balanced', allowEmojis: false, maxTokens: 300 },
      },
    ],
    [
      'Friendly Conversation',
      {
        goal: 'Friendly Conversation',
        systemDirective: 'Show warmth, positive reinforcement, and supportive friendliness.',
        defaultConstraints: { neverSoundRobotic: true, avoidRepetition: true, preserveUserStyle: true, matchRelationshipTone: true, responseLength: 'balanced', allowEmojis: true, maxTokens: 250 },
      },
    ],
    [
      'Apology',
      {
        goal: 'Apology',
        systemDirective: 'Express sincere, clear, and empathetic regret without defensive excuses.',
        defaultConstraints: { neverSoundRobotic: true, avoidRepetition: true, preserveUserStyle: true, matchRelationshipTone: true, responseLength: 'balanced', allowEmojis: false, maxTokens: 250 },
      },
    ],
    [
      'Invitation',
      {
        goal: 'Invitation',
        systemDirective: 'Extend a friendly, low-pressure invitation to meet up or collaborate.',
        defaultConstraints: { neverSoundRobotic: true, avoidRepetition: true, preserveUserStyle: true, matchRelationshipTone: true, responseLength: 'concise', allowEmojis: true, maxTokens: 220 },
      },
    ],
    [
      'Follow-up',
      {
        goal: 'Follow-up',
        systemDirective: 'Politely follow up on a previous topic, task, or unconfirmed plan.',
        defaultConstraints: { neverSoundRobotic: true, avoidRepetition: true, preserveUserStyle: true, matchRelationshipTone: true, responseLength: 'concise', allowEmojis: false, maxTokens: 200 },
      },
    ],
    [
      'Closing Conversation',
      {
        goal: 'Closing Conversation',
        systemDirective: 'Conclude the conversation warmly and politely.',
        defaultConstraints: { neverSoundRobotic: true, avoidRepetition: true, preserveUserStyle: true, matchRelationshipTone: true, responseLength: 'concise', allowEmojis: true, maxTokens: 150 },
      },
    ],
  ]);

  public static getTemplate(goal: PromptGoal): PromptTemplateDefinition {
    const template = TemplateRegistry.templates.get(goal);
    if (!template) {
      return TemplateRegistry.templates.get('Reply Suggestions')!;
    }
    return template;
  }
}
