import { CanonicalMessage, ConversationHealthMetrics } from '@rapport/shared';

export class HealthAnalyzer {
  public static analyzeHealth(messages: CanonicalMessage[]): ConversationHealthMetrics {
    if (!messages || messages.length === 0) {
      return {
        balanceScore: 1.0,
        balanceStatus: 'Balanced conversation',
        engagementLevel: 'Low engagement',
        replyPace: 'Moderate replies',
        isRecentlyInactive: false,
      };
    }

    const incoming = messages.filter((m) => m.direction === 'incoming').length;
    const outgoing = messages.filter((m) => m.direction === 'outgoing').length;
    const total = messages.length;

    const minMsg = Math.min(incoming, outgoing);
    const maxMsg = Math.max(incoming, outgoing);
    const balanceScore = maxMsg > 0 ? parseFloat((minMsg / maxMsg).toFixed(2)) : 1.0;

    const balanceStatus: 'Balanced conversation' | 'One-sided conversation' =
      total >= 4 && balanceScore < 0.3 ? 'One-sided conversation' : 'Balanced conversation';

    const engagementLevel: 'High engagement' | 'Low engagement' =
      total >= 6 ? 'High engagement' : 'Low engagement';

    const latest = messages[messages.length - 1];
    const timeSinceLastMsg = Date.now() - latest.timestamp;
    const isRecentlyInactive = timeSinceLastMsg > 12 * 60 * 60 * 1000;

    let replyPace: 'Fast replies' | 'Slow replies' | 'Moderate replies' = 'Moderate replies';
    if (messages.length >= 2) {
      const avgDiff = (messages[messages.length - 1].timestamp - messages[0].timestamp) / messages.length;
      if (avgDiff < 2 * 60 * 1000) {
        replyPace = 'Fast replies';
      } else if (avgDiff > 60 * 60 * 1000) {
        replyPace = 'Slow replies';
      }
    }

    return {
      balanceScore,
      balanceStatus,
      engagementLevel,
      replyPace,
      isRecentlyInactive,
    };
  }
}
