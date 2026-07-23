import { BasePromptPayload } from '../prompts/index.js';

export interface TokenBudget {
  maxSystemTokens: number;
  maxThreadTokens: number;
  maxDraftTokens: number;
}

export const DEFAULT_TOKEN_BUDGET: TokenBudget = {
  maxSystemTokens: 200,
  maxThreadTokens: 400,
  maxDraftTokens: 200,
};

export function buildContextPayload(input: BasePromptPayload): BasePromptPayload {
  return {
    targetGoal: input.targetGoal || 'General Professional Alignment',
    recipientStyleTags: input.recipientStyleTags || [],
    commitmentNotes: input.commitmentNotes || [],
    userDraft: input.userDraft,
    recentThreadSnippet: input.recentThreadSnippet || '',
  };
}

export { ContextEngine } from './ContextEngine.js';
export { MessageNormalizer } from './Normalizer.js';
export { ConversationModelBuilder } from './ConversationModelBuilder.js';
export { HeuristicToneDetector } from './ToneDetector.js';
export { ConversationStageAnalyzer } from './StageAnalyzer.js';
export { ImportantFactExtractor } from './FactExtractor.js';
export { ContextSummaryGenerator } from './SummaryGenerator.js';
export { LanguageDetector } from './LanguageDetector.js';
export { ReplyTargetResolver } from './ReplyTargetResolver.js';
