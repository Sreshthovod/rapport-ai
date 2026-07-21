import { ConversationContext } from './conversation.js';

export const RAPPORT_AI_GENERATE_REPLY = 'RAPPORT_AI_GENERATE_REPLY';

export interface FakeAIResponse {
  suggestedReply: string;
  reasoning: string;
  tone: string;
}

export interface AIReplyRequestPayload {
  type: typeof RAPPORT_AI_GENERATE_REPLY;
  context: ConversationContext;
}

export interface AIReplyResponsePayload {
  success: boolean;
  data?: FakeAIResponse;
  error?: string;
}
