import { SupportedPlatform } from './contact.js';

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
