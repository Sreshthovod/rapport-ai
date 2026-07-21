import { ChatMessage } from '@rapport/shared';
import { extractCommitmentDetails } from './detector.js';
import { CommitmentItem } from './types.js';

const COMPLETION_PATTERNS = [
  /\b(sent|done|uploaded|shared|completed|finished)\b/i,
  /\b(i've|i\s+have)\s+(sent|uploaded|shared|done|finished|completed)\b/i,
  /\b(here\s+is|here\s+are)\b/i,
];

export class CommitmentTracker {
  // Key: contactId -> Map<commitmentId, CommitmentItem>
  private store: Map<string, Map<string, CommitmentItem>> = new Map();
  // Set of processed outgoing message IDs to prevent redundant parsing
  private processedMessageIds: Set<string> = new Set();

  public processOutgoingMessages(
    contactId: string,
    messages: ChatMessage[]
  ): { newlyDetected: CommitmentItem[]; newlyCompleted: CommitmentItem[] } {
    if (!this.store.has(contactId)) {
      this.store.set(contactId, new Map());
    }

    const contactMap = this.store.get(contactId)!;
    const newlyDetected: CommitmentItem[] = [];
    const newlyCompleted: CommitmentItem[] = [];

    // Filter outgoing messages
    const outgoing = messages.filter((m) => m.direction === 'outgoing');

    for (const msg of outgoing) {
      if (this.processedMessageIds.has(msg.id)) {
        continue;
      }
      this.processedMessageIds.add(msg.id);

      // 1. Check for completion triggers first
      const isCompletionMsg = COMPLETION_PATTERNS.some((p) => p.test(msg.text));
      if (isCompletionMsg) {
        // Mark all pending commitments for this contact as Completed
        for (const commitment of contactMap.values()) {
          if (commitment.status === 'Pending') {
            commitment.status = 'Completed';
            newlyCompleted.push(commitment);
          }
        }
      }

      // 2. Check for new commitment promises
      const extracted = extractCommitmentDetails(msg.text);
      if (extracted) {
        const commitmentId = `cmt_${msg.id}`;
        if (!contactMap.has(commitmentId)) {
          const item: CommitmentItem = {
            id: commitmentId,
            contactId,
            messageId: msg.id,
            text: msg.text,
            action: extracted.action,
            deadline: extracted.deadline,
            status: 'Pending',
            createdAt: msg.timestamp || Date.now(),
          };
          contactMap.set(commitmentId, item);
          newlyDetected.push(item);
        }
      }
    }

    return { newlyDetected, newlyCompleted };
  }

  public getPendingCommitments(contactId: string): CommitmentItem[] {
    const contactMap = this.store.get(contactId);
    if (!contactMap) return [];

    return Array.from(contactMap.values()).filter((c) => c.status === 'Pending');
  }

  public getAllCommitments(contactId: string): CommitmentItem[] {
    const contactMap = this.store.get(contactId);
    if (!contactMap) return [];

    return Array.from(contactMap.values());
  }

  public clearContactCommitments(contactId: string): void {
    this.store.delete(contactId);
  }

  public clearAll(): void {
    this.store.clear();
    this.processedMessageIds.clear();
  }
}
