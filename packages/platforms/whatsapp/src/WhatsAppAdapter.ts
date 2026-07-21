import { DEFAULT_MESSAGE_LIMIT, WHATSAPP_DOMAIN } from './constants.js';
import { WhatsAppObserver } from './observer.js';
import { parseActiveConversation, parseMessages } from './parser.js';
import { SELECTORS } from './selectors.js';
import {
  ActiveConversation,
  ConversationObserverCallback,
  WhatsAppAdapterConfig,
  WhatsAppMessage,
} from './types.js';
import { createLogger, Logger, queryFirstElement } from './utils.js';

export class WhatsAppAdapter {
  private readonly logger: Logger;
  private readonly defaultLimit: number;
  private observer: WhatsAppObserver | null = null;

  constructor(config: WhatsAppAdapterConfig = {}) {
    const debug = config.debug ?? false;
    this.logger = createLogger(debug);
    this.defaultLimit = config.defaultMessageLimit ?? DEFAULT_MESSAGE_LIMIT;
  }

  public isSupported(windowLocation: Location = window.location): boolean {
    if (!windowLocation.hostname.includes(WHATSAPP_DOMAIN)) {
      this.logger.warn(`Unsupported hostname: ${windowLocation.hostname}`);
      return false;
    }

    const appContainer = document.getElementById('app') || document.querySelector('#main');
    if (!appContainer) {
      this.logger.warn('WhatsApp App container not detected in DOM.');
      return false;
    }

    return true;
  }

  public getActiveConversation(): ActiveConversation | null {
    return parseActiveConversation(this.logger);
  }

  public getMessages(limit: number = this.defaultLimit): WhatsAppMessage[] {
    return parseMessages(limit, this.logger);
  }

  public getInputElement(): HTMLElement | null {
    const inputEl = queryFirstElement(SELECTORS.inputArea);
    if (!inputEl) {
      this.logger.warn('WhatsApp editable input element not found.');
    }
    return inputEl;
  }

  public observeConversation(callback: ConversationObserverCallback): void {
    if (this.observer) {
      this.observer.stop();
    }

    this.observer = new WhatsAppObserver(callback, this.logger);
    this.observer.start();
  }

  public dispose(): void {
    if (this.observer) {
      this.observer.stop();
      this.observer = null;
    }
    this.logger.info('WhatsAppAdapter disposed.');
  }
}
