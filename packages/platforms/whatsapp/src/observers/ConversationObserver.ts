import { getVisibleMessages } from '../parser.js';
import { WhatsAppVisibleMessage } from '../types.js';
import { Logger } from '../utils.js';

export type MessagesChangeCallback = (messages: WhatsAppVisibleMessage[]) => void;

export class ConversationObserver {
  private observer: MutationObserver | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastLatestMessageId: string | null = null;

  constructor(
    private readonly callback: MessagesChangeCallback,
    private readonly logger: Logger,
    private readonly debounceMs: number = 100
  ) {}

  public start(messageListContainer: HTMLElement): void {
    this.stop();

    this.observer = new MutationObserver(() => {
      this.scheduleEvaluation();
    });

    // Observe strictly inside message list container
    this.observer.observe(messageListContainer, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    this.logger.info('[ConversationObserver] Started listening for message list mutations.');
    this.evaluate();
  }

  public stop(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
      this.logger.info('[ConversationObserver] Stopped.');
    }
  }

  private scheduleEvaluation(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.evaluate();
    }, this.debounceMs);
  }

  public evaluate(): void {
    const messages = getVisibleMessages(20, this.logger);
    const latestMsg = messages[messages.length - 1];
    const latestId = latestMsg?.id || null;

    // Check if message count or latest message changed
    if (latestId !== this.lastLatestMessageId || messages.length > 0) {
      this.lastLatestMessageId = latestId;
      this.callback(messages);
    }
  }
}
