import { parseActiveConversation } from '../parser.js';
import { ActiveConversation } from '../types.js';
import { Logger } from '../utils.js';

export type ChatChangeCallback = (chat: ActiveConversation | null) => void;

export class ChatObserver {
  private observer: MutationObserver | null = null;
  private lastChatId: string | null = null;

  constructor(
    private readonly callback: ChatChangeCallback,
    private readonly logger: Logger
  ) {}

  public start(headerContainer: HTMLElement = document.body): void {
    this.stop();

    this.observer = new MutationObserver(() => {
      this.evaluate();
    });

    this.observer.observe(headerContainer, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    this.logger.info('[ChatObserver] Started listening for chat changes.');
    this.evaluate();
  }

  public stop(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
      this.logger.info('[ChatObserver] Stopped.');
    }
  }

  public evaluate(): void {
    const activeChat = parseActiveConversation(this.logger);
    const chatId = activeChat?.id || null;

    if (chatId !== this.lastChatId) {
      this.lastChatId = chatId;
      this.logger.info(`[ChatObserver] Active chat changed: ${activeChat?.name || 'None'}`);
      this.callback(activeChat);
    }
  }
}
