import { ConversationContext } from './conversation.js';
import { StructuredAIContext } from './context.js';
import { ConversationIntelligence } from './intelligence.js';
import { RelationshipContext } from './relationship.js';
import { CompiledPromptSpec } from './prompt.js';

export const RAPPORT_AI_GENERATE_REPLY = 'RAPPORT_AI_GENERATE_REPLY';

export interface ProviderCapabilities {
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsCustomSystemPrompts: boolean;
  maxContextTokens: number;
}

export interface ProviderPromptRequest {
  conversationSummary: string;
  latestMessages: string[];
  detectedTone: string;
  objective?: string;
  requestedReplyStyle?: string;
  maxSuggestions?: number;
  intelligence?: ConversationIntelligence;
  relationship?: RelationshipContext;
  compiledPrompt?: CompiledPromptSpec;
}

export interface AISuggestion {
  id: string;
  text: string;
  tone: string;
  style: string;
  explanation: string;
  confidence: number;
}

export interface MultiAISuggestionResponse {
  suggestions: AISuggestion[];
  summary: string;
  detectedTone: string;
  providerId: string;
}

export interface AIRequest {
  conversation: ConversationContext;
  structuredContext?: StructuredAIContext;
  compiledPrompt?: CompiledPromptSpec;
  prompt?: string;
  providerId?: string;
  options?: Record<string, unknown>;
}

export interface AIResponse {
  suggestedReply: string;
  reasoning: string;
  tone: string;
  providerId: string;
  suggestions?: AISuggestion[];
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
  suggestions?: AISuggestion[];
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
