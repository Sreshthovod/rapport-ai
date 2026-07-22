import { CanonicalMessage, ConversationModel } from '@rapport/shared';

export class ConversationModelBuilder {
  public static buildModel(messages: CanonicalMessage[]): ConversationModel {
    if (!messages || messages.length === 0) {
      return {
        participants: [],
        messageCount: 0,
        lastActive: Date.now(),
        firstMessage: null,
        latestMessage: null,
        conversationDurationMs: 0,
        conversationHealth: 'healthy',
      };
    }

    const participantsSet = new Set<string>();
    messages.forEach((m) => {
      if (m.sender) participantsSet.add(m.sender);
    });

    const firstMessage = messages[0];
    const latestMessage = messages[messages.length - 1];
    const duration = latestMessage.timestamp - firstMessage.timestamp;

    // Calculate conversation health
    let health: 'healthy' | 'stale' | 'one_sided' | 'conflict' = 'healthy';
    const now = Date.now();
    const timeSinceLastMsg = now - latestMessage.timestamp;

    const incomingCount = messages.filter((m) => m.direction === 'incoming').length;
    const outgoingCount = messages.filter((m) => m.direction === 'outgoing').length;

    if (timeSinceLastMsg > 24 * 60 * 60 * 1000) {
      health = 'stale';
    } else if (messages.length >= 4 && (incomingCount === 0 || outgoingCount === 0)) {
      health = 'one_sided';
    }

    return {
      participants: Array.from(participantsSet),
      messageCount: messages.length,
      lastActive: latestMessage.timestamp,
      firstMessage,
      latestMessage,
      conversationDurationMs: Math.max(0, duration),
      conversationHealth: health,
    };
  }
}
