import { SupportedPlatform } from './contact.js';

export type MessageDirection = 'incoming' | 'outgoing';

export interface ChatMessage {
  id: string;
  author: string;
  text: string;
  timestamp: number;
  direction: MessageDirection;
}

export interface ConversationContextContact {
  id: string;
  contactName: string;
  isGroup: boolean;
}

export interface ConversationContext {
  contact: ConversationContextContact | null;
  recentMessages: ChatMessage[];
  draft: string;
  messageCount: number;
  lastIncomingMessage: ChatMessage | null;
  lastOutgoingMessage: ChatMessage | null;
}

export interface ConversationMessage {
  id: string;
  sender: 'user' | 'contact';
  text: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  contactId: string;
  platform: SupportedPlatform;
  lastMessageTimestamp: number;
  sentimentTrend?: 'positive' | 'neutral' | 'hostile';
  activeTopic?: string;
}
