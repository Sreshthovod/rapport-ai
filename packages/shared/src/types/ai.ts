import { ConversationContext } from './conversation.js';
import { StructuredAIContext } from './context.js';
import { ConversationIntelligence } from './intelligence.js';
import { RelationshipContext } from './relationship.js';
import { CompiledPromptSpec } from './prompt.js';

export const RAPPORT_AI_GENERATE_REPLY = 'RAPPORT_AI_GENERATE_REPLY';

export type SuggestionCategory =
  | 'Quick Reply'
  | 'Natural Reply'
  | 'Funny Reply'
  | 'Professional Reply'
  | 'Flirty Reply'
  | 'Short Reply'
  | 'Detailed Reply'
  | 'Follow-up Question'
  | 'Conversation Starter'
  | 'Conversation Saver'
  | 'Empathetic Reply';

export interface ProviderCapabilities {
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsCustomSystemPrompts: boolean;
  maxContextTokens: number;
  supportedModels: string[];
}

export interface ProviderMetrics {
  providerId: string;
  model: string;
  latencyMs: number;
  tokens?: number;
  success: boolean;
  timestamp: number;
  error?: string;
}

export interface ProviderConfig {
  activeProviderId: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  fallbackProviderId?: string;
  maxRetries?: number;
  timeoutMs?: number;
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

export interface SuggestionQualityReport {
  contextRelevance: number;
  naturalness: number;
  grammar: number;
  repetition: number;
  toneConsistency: number;
  conversationContinuation: number;
  overallScore: number;
  isValid: boolean;
  issues: string[];
}

export interface AISuggestion {
  id: string;
  text: string;
  tone: string;
  style: string;
  category?: SuggestionCategory;
  explanation: string;
  confidence: number;
  pinned?: boolean;
  qualityReport?: SuggestionQualityReport;
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
  providerId?: string;
  suggestions?: AISuggestion[];
  metadata?: Record<string, unknown>;
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
