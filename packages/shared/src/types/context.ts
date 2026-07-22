import { ConversationIntelligence } from './intelligence.js';
import { RelationshipContext } from './relationship.js';

export type ToneType =
  | 'Friendly'
  | 'Professional'
  | 'Romantic'
  | 'Playful'
  | 'Formal'
  | 'Emotional'
  | 'Empathetic'
  | 'Casual'
  | 'Neutral'
  | 'Unknown';

export type StageType =
  | 'Introduction'
  | 'Small Talk'
  | 'Planning'
  | 'Deep Conversation'
  | 'Conflict'
  | 'Ending Conversation'
  | 'Unknown';

export interface QuotedMessageInfo {
  id: string;
  sender: string;
  text: string;
}

export interface MessageAttachment {
  type: 'image' | 'video' | 'audio' | 'document' | 'other';
  url?: string;
  name?: string;
}

export interface MessageReaction {
  emoji: string;
  sender: string;
}

export interface CanonicalMessage {
  id: string;
  sender: string;
  timestamp: number;
  text: string;
  direction: 'incoming' | 'outgoing';
  type: 'text' | 'system' | 'media' | 'unknown';
  quotedMessage?: QuotedMessageInfo | null;
  attachments: MessageAttachment[];
  reactions: MessageReaction[];
}

export interface ConversationModel {
  participants: string[];
  messageCount: number;
  lastActive: number;
  firstMessage: CanonicalMessage | null;
  latestMessage: CanonicalMessage | null;
  conversationDurationMs: number;
  conversationHealth: 'healthy' | 'stale' | 'one_sided' | 'conflict';
}

export interface ExtractedFact {
  category: 'name' | 'location' | 'date' | 'plan' | 'event' | 'preference';
  fact: string;
  sourceMessageId?: string;
  confidence: number;
}

export interface ContextSummary {
  recentSummary: string;
  currentTopic: string;
  detectedTone: ToneType;
  conversationStage: StageType;
  pendingQuestions: string[];
  importantFacts: ExtractedFact[];
  userIntent: string;
  suggestedGoal: string;
}

export interface StructuredAIContext {
  conversation: ConversationModel;
  summary: ContextSummary;
  tone: ToneType;
  stage: StageType;
  recentMessages: CanonicalMessage[];
  extractedFacts: ExtractedFact[];
  pendingQuestions: string[];
  intelligence?: ConversationIntelligence;
  relationship?: RelationshipContext;
}
