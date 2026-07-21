import { parseActiveConversation, validateWhatsAppDOM } from '../parser.js';
import { ActiveConversation, WhatsAppDOMValidationResult } from '../types.js';
import { Logger } from '../utils.js';

export type ChatChangeCallback = (
  chat: ActiveConversation | null,
  validationResult: WhatsAppDOMValidationResult
) => void;

export class ChatObserver {
  private observer: MutationObserver | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastChatId: string | null = null;
  private lastConnectedState: boolean | null = null;

  constructor(
    private readonly callback: ChatChangeCallback,
    private readonly logger: Logger,
    private readonly debounceMs: number = 50
  ) {}

  public start(headerContainer: HTMLElement = document.body): void {
    this.stop();

    this.observer = new MutationObserver(() => {
      this.scheduleEvaluation();
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
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
      this.logger.info('[ChatObserver] Stopped.');
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
    const activeChat = parseActiveConversation(this.logger);
    const chatId = activeChat?.id || null;
    const validationResult = validateWhatsAppDOM(this.logger);
    const connectedState = validationResult.connected;

    if (chatId !== this.lastChatId || connectedState !== this.lastConnectedState) {
      this.lastChatId = chatId;
      this.lastConnectedState = connectedState;
      this.logger.info(`[ChatObserver] Chat/Status update: ${activeChat?.name || 'None'} (connected=${connectedState})`);
      this.callback(activeChat, validationResult);
    }
  }
}
