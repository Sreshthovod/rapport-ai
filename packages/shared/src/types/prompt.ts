export type PromptGoal =
  | 'Reply Suggestions'
  | 'Continue Conversation'
  | 'Revive Dry Conversation'
  | 'Ask Better Questions'
  | 'Flirty Conversation'
  | 'Professional Conversation'
  | 'Friendly Conversation'
  | 'Apology'
  | 'Invitation'
  | 'Follow-up'
  | 'Closing Conversation';

export type PromptVariant = 'Safe' | 'Balanced' | 'Creative';

export interface PromptConstraints {
  neverSoundRobotic: boolean;
  avoidRepetition: boolean;
  preserveUserStyle: boolean;
  matchRelationshipTone: boolean;
  responseLength: 'concise' | 'balanced' | 'detailed';
  allowEmojis: boolean;
  maxTokens: number;
}

export interface PromptVariantSpec {
  variant: PromptVariant;
  description: string;
  instruction: string;
}

export interface CompiledPromptSpec {
  version: string;
  goal: PromptGoal;
  systemPrompt: string;
  userPrompt: string;
  variants: PromptVariantSpec[];
  constraints: PromptConstraints;
  contextSnapshot: {
    conversationSummary: string;
    latestMessages: string[];
    detectedTone: string;
    suggestedGoal: string;
    relationshipType: string;
  };
}

export interface EvaluationScore {
  contextualRelevance: number;
  toneConsistency: number;
  relationshipConsistency: number;
  conversationalProgression: number;
  readability: number;
  overallConfidence: number;
}
