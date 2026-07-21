import { DEFAULT_OBSERVER_DEBOUNCE_MS } from './constants.js';
import { parseActiveConversation, parseMessages } from './parser.js';
import {
  ActiveConversation,
  ConversationChangeEvent,
  ConversationChangeEventReason,
  ConversationObserverCallback,
  WhatsAppMessage,
} from './types.js';
import { Logger } from './utils.js';

export class WhatsAppObserver {
  private observer: MutationObserver | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastConversationId: string | null = null;
  private lastMessageId: string | null = null;

  constructor(
    private readonly callback: ConversationObserverCallback,
    private readonly logger: Logger,
    private readonly debounceMs: number = DEFAULT_OBSERVER_DEBOUNCE_MS
  ) {}

  public start(rootElement: HTMLElement = document.body): void {
    this.stop();

    this.observer = new MutationObserver(() => {
      this.scheduleEvaluation();
    });

    this.observer.observe(rootElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    this.logger.info('MutationObserver started.');
    // Fire initial baseline event
    this.evaluate('dom_refreshed');
  }

  public stop(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
      this.logger.info('MutationObserver stopped.');
    }
  }

  private scheduleEvaluation(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.evaluate('dom_refreshed');
    }, this.debounceMs);
  }

  private evaluate(defaultReason: ConversationChangeEventReason): void {
    const activeChat = parseActiveConversation(this.logger);
    const messages = parseMessages(20, this.logger);

    let reason: ConversationChangeEventReason = defaultReason;

    // Check for chat switch
    if (activeChat?.id !== this.lastConversationId) {
      reason = 'chat_switched';
      this.lastConversationId = activeChat?.id || null;
    } else {
      // Check for new message
      const latestMsg = messages[messages.length - 1];
      if (latestMsg && latestMsg.id !== this.lastMessageId) {
        reason = latestMsg.isOutgoing ? 'message_sent' : 'message_received';
        this.lastMessageId = latestMsg.id;
      }
    }

    const event: ConversationChangeEvent = {
      reason,
      conversation: activeChat,
      messages,
    };

    this.callback(event);
  }
}
