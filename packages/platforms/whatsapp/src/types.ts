export type ChatType = 'direct' | 'group';

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

export type ConversationChangeEventReason =
  | 'chat_switched'
  | 'message_received'
  | 'message_sent'
  | 'dom_refreshed';

export interface ConversationChangeEvent {
  reason: ConversationChangeEventReason;
  conversation: ActiveConversation | null;
  messages: WhatsAppMessage[];
}

export type ConversationObserverCallback = (event: ConversationChangeEvent) => void;

export interface WhatsAppAdapterConfig {
  debug?: boolean;
  defaultMessageLimit?: number;
  observerDebounceMs?: number;
}
