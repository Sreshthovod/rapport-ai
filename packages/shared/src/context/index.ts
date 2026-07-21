import {
  ChatMessage,
  ConversationContext,
  ConversationContextContact,
} from '../types/conversation.js';

export function buildConversationContext(params: {
  contact: ConversationContextContact | null;
  recentMessages: ChatMessage[];
  draft: string;
}): ConversationContext {
  const { contact, recentMessages, draft } = params;

  let lastIncomingMessage: ChatMessage | null = null;
  let lastOutgoingMessage: ChatMessage | null = null;

  for (let i = recentMessages.length - 1; i >= 0; i--) {
    const msg = recentMessages[i];
    if (!lastIncomingMessage && msg.direction === 'incoming') {
      lastIncomingMessage = msg;
    }
    if (!lastOutgoingMessage && msg.direction === 'outgoing') {
      lastOutgoingMessage = msg;
    }
    if (lastIncomingMessage && lastOutgoingMessage) {
      break;
    }
  }

  return {
    contact,
    recentMessages,
    draft,
    messageCount: recentMessages.length,
    lastIncomingMessage,
    lastOutgoingMessage,
  };
}

export function formatContextLog(context: ConversationContext): string {
  const lines: string[] = [];
  lines.push('========== RAPPORT ==========');
  if (context.contact) {
    lines.push(`Contact: ${context.contact.contactName} (isGroup: ${context.contact.isGroup})`);
  } else {
    lines.push('Contact: None');
  }
  lines.push(`Draft: "${context.draft}"`);
  lines.push(`Messages (${context.messageCount}):`);
  
  context.recentMessages.slice(-5).forEach((msg) => {
    const tag = msg.direction === 'incoming' ? '[Incoming]' : '[Outgoing]';
    lines.push(`  - ${tag} ${msg.author}: ${msg.text.slice(0, 60)}${msg.text.length > 60 ? '...' : ''}`);
  });

  lines.push('=============================');
  return lines.join('\n');
}
