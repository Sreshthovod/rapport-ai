import { CanonicalMessage, PendingContextItems } from '@rapport/shared';

export class PendingContextAnalyzer {
  public static analyzePendingItems(messages: CanonicalMessage[]): PendingContextItems {
    const questionsAwaitingReply: string[] = [];
    const unconfirmedPlans: string[] = [];
    const datesMentioned: string[] = [];
    const commitments: string[] = [];
    const tasks: string[] = [];
    const promises: string[] = [];

    if (!messages || messages.length === 0) {
      return {
        questionsAwaitingReply,
        unconfirmedPlans,
        datesMentioned,
        commitments,
        tasks,
        promises,
      };
    }

    messages.forEach((msg) => {
      const text = msg.text;
      if (!text) return;

      // Questions awaiting reply (incoming msg with ?)
      if (msg.direction === 'incoming' && text.includes('?')) {
        questionsAwaitingReply.push(text);
      }

      // Unconfirmed plans
      if (/(should we|want to|how about|let's meet|free tomorrow)/i.test(text)) {
        unconfirmedPlans.push(text);
      }

      // Dates mentioned
      const dateMatch = text.match(/(?:tomorrow|today|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\b\d{1,2}:\d{2}\b)/i);
      if (dateMatch) {
        datesMentioned.push(dateMatch[0]);
      }

      // Promises & Commitments
      if (/(i will|i'll|promise|let me|i can send)/i.test(text)) {
        if (msg.direction === 'outgoing') {
          promises.push(text);
        } else {
          commitments.push(text);
        }
      }

      // Tasks
      if (/(send me|please check|can you send|remind me)/i.test(text)) {
        tasks.push(text);
      }
    });

    return {
      questionsAwaitingReply,
      unconfirmedPlans: Array.from(new Set(unconfirmedPlans)),
      datesMentioned: Array.from(new Set(datesMentioned)),
      commitments: Array.from(new Set(commitments)),
      tasks: Array.from(new Set(tasks)),
      promises: Array.from(new Set(promises)),
    };
  }
}
