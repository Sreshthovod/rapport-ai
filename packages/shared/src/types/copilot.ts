import { PromptGoal } from './prompt.js';

export type AssistanceType =
  | 'Suggest Reply'
  | 'Suggest Follow-up Question'
  | 'Break the Silence'
  | 'Confirm Plans'
  | 'Lighten the Mood'
  | 'Clarify Message'
  | 'Respond More Politely'
  | 'Respond More Confidently';

export interface CopilotRecommendation {
  id: string;
  type: AssistanceType;
  title: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  confidence: number;
  suggestedGoal: PromptGoal;
}

export interface CopilotDecision {
  timestamp: number;
  shouldAssist: boolean;
  primaryRecommendation: CopilotRecommendation | null;
  allRecommendations: CopilotRecommendation[];
}
