import { ChatMessage, MessageDirection } from '@rapport/shared';

export type ChatType = 'direct' | 'group';

export interface WhatsAppChat {
  id: string;
  contactName: string;
  isGroup: boolean;
}

export type WhatsAppVisibleMessage = ChatMessage;

export interface WhatsAppMessage {
  id: string;
  sender: string;
  timestamp: number;
  text: string;
  isOutgoing: boolean;
}

export interface ActiveConversation {
  id: string;
  name: string;
  chatType: ChatType;
}

export interface WhatsAppDOMValidationResult {
  chatFound: boolean;
  inputFound: boolean;
  messageContainerFound: boolean;
  messagesFound: boolean;
  title: string | null;
  messageCount: number;
  connected: boolean;
}

export type ConversationChangeEventReason =
  | 'chat_switched'
  | 'message_received'
  | 'message_sent'
  | 'dom_refreshed'
  | 'draft_changed';

export interface ConversationChangeEvent {
  reason: ConversationChangeEventReason;
  conversation: ActiveConversation | null;
  messages: WhatsAppMessage[];
  draft?: string;
}

export type ConversationObserverCallback = (event: ConversationChangeEvent) => void;
export type DraftChangeCallback = (draftText: string) => void;

export interface WhatsAppAdapterConfig {
  debug?: boolean;
  defaultMessageLimit?: number;
  observerDebounceMs?: number;
}
