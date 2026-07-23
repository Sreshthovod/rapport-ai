import { CanonicalMessage, ReplyTargetInfo } from '@rapport/shared';

export class ReplyTargetResolver {
  public static resolve(messages: CanonicalMessage[]): ReplyTargetInfo {
    if (!messages || messages.length === 0) {
      return {
        hasTargetMessages: false,
        lastOutgoingMessage: null,
        targetIncomingMessages: [],
        targetTextSummary: '',
        isAwaitingContactReply: false,
      };
    }

    // 1. Find the index of the last outgoing message (sent by 'Me')
    let lastOutgoingIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].direction === 'outgoing') {
        lastOutgoingIdx = i;
        break;
      }
    }

    const lastOutgoingMessage = lastOutgoingIdx !== -1 ? messages[lastOutgoingIdx] : null;

    // 2. Collect all consecutive incoming messages AFTER the last outgoing message
    const targetIncomingMessages: CanonicalMessage[] = [];
    const startIndex = lastOutgoingIdx !== -1 ? lastOutgoingIdx + 1 : 0;

    for (let i = startIndex; i < messages.length; i++) {
      if (messages[i].direction === 'incoming') {
        targetIncomingMessages.push(messages[i]);
      }
    }

    const hasTargetMessages = targetIncomingMessages.length > 0;
    const isAwaitingContactReply = !hasTargetMessages && lastOutgoingMessage !== null;

    const targetTextSummary = targetIncomingMessages
      .map((m) => `${m.sender || 'Contact'}: "${m.text}"`)
      .join('\n');

    return {
      hasTargetMessages,
      lastOutgoingMessage,
      targetIncomingMessages,
      targetTextSummary,
      isAwaitingContactReply,
    };
  }
}
