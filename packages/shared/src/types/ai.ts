import { ConversationContext } from './conversation.js';
import { StructuredAIContext } from './context.js';

export const RAPPORT_AI_GENERATE_REPLY = 'RAPPORT_AI_GENERATE_REPLY';

export interface ProviderCapabilities {
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsCustomSystemPrompts: boolean;
  maxContextTokens: number;
}

export interface AIRequest {
  conversation: ConversationContext;
  structuredContext?: StructuredAIContext;
  prompt?: string;
  providerId?: string;
  options?: Record<string, unknown>;
}

export interface AIResponse {
  suggestedReply: string;
  reasoning: string;
  tone: string;
  providerId: string;
  metadata?: Record<string, unknown>;
}

export interface ProviderResult {
  success: boolean;
  data?: AIResponse;
  error?: string;
}

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
