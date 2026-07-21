import { DEFAULT_MESSAGE_LIMIT, WHATSAPP_DOMAIN } from './constants.js';
import { inspectWhatsAppDOM } from './inspector.js';
import { ChatObserver } from './observers/ChatObserver.js';
import { ConversationObserver } from './observers/ConversationObserver.js';
import { DraftObserver } from './observers/DraftObserver.js';
import {
  getCurrentChat,
  getVisibleMessages,
  parseActiveConversation,
  parseMessages,
  validateWhatsAppDOM,
} from './parser.js';
import { SELECTORS, WhatsAppSelectors } from './selectors.js';
import {
  ActiveConversation,
  ConversationObserverCallback,
  DraftChangeCallback,
  WhatsAppAdapterConfig,
  WhatsAppChat,
  WhatsAppDOMValidationResult,
  WhatsAppMessage,
  WhatsAppVisibleMessage,
} from './types.js';
import { createLogger, findElementWithFallback, findAllElementsWithFallback, Logger } from './utils.js';

export class WhatsAppAdapter {
  private readonly logger: Logger;
  private readonly defaultLimit: number;

  private chatObserver: ChatObserver | null = null;
  private conversationObserver: ConversationObserver | null = null;
  private draftObserver: DraftObserver | null = null;

  private activeChatState: WhatsAppChat | null = null;
  private messagesState: WhatsAppVisibleMessage[] = [];
  private draftState: string = '';

  private chatCallbacks: Set<(chat: WhatsAppChat | null) => void> = new Set();
  private domStatusCallbacks: Set<(result: WhatsAppDOMValidationResult) => void> = new Set();

  constructor(config: WhatsAppAdapterConfig = {}) {
    const debug = config.debug ?? false;
    this.logger = createLogger(debug);
    this.defaultLimit = config.defaultMessageLimit ?? DEFAULT_MESSAGE_LIMIT;
  }

  public isSupported(windowLocation: Location = window.location): boolean {
    try {
      if (!windowLocation || !windowLocation.hostname || !windowLocation.hostname.includes(WHATSAPP_DOMAIN)) {
        return false;
      }

      const appContainer = document.getElementById('app') || document.querySelector('#main');
      if (!appContainer) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  public validateWhatsAppDOM(): WhatsAppDOMValidationResult {
    return validateWhatsAppDOM(this.logger);
  }

  public inspectWhatsAppDOM(): WhatsAppDOMValidationResult {
    return inspectWhatsAppDOM(this.logger);
  }

  public getCurrentChat(): WhatsAppChat | null {
    return getCurrentChat(this.logger);
  }

  public getActiveConversation(): ActiveConversation | null {
    return parseActiveConversation(this.logger);
  }

  public getVisibleMessages(limit: number = this.defaultLimit): WhatsAppVisibleMessage[] {
    return getVisibleMessages(limit, this.logger);
  }

  public getMessages(limit: number = this.defaultLimit): WhatsAppMessage[] {
    return parseMessages(limit, this.logger);
  }

  public getChatTitle(): HTMLElement | null {
    const headerEl = findElementWithFallback(WhatsAppSelectors.chatHeader);
    if (headerEl) {
      const titleEl = findElementWithFallback(WhatsAppSelectors.chatTitle, headerEl);
      if (titleEl) return titleEl;
    }
    return findElementWithFallback(WhatsAppSelectors.chatTitle);
  }

  public getInput(): HTMLElement | null {
    return findElementWithFallback(WhatsAppSelectors.input);
  }

  public getInputElement(): HTMLElement | null {
    return this.getInput();
  }

  public getMessageElements(): HTMLElement[] {
    const container = findElementWithFallback(WhatsAppSelectors.messageContainer);
    if (!container) return [];
    return findAllElementsWithFallback(WhatsAppSelectors.messages, container);
  }

  public getDraftText(): string {
    if (this.draftObserver) {
      return this.draftObserver.getCurrentDraft();
    }
    const inputEl = this.getInput();
    if (!inputEl) return '';
    return (inputEl as HTMLElement).innerText || inputEl.textContent || '';
  }

  public observeDraft(callback: DraftChangeCallback): () => void {
    if (!this.draftObserver) {
      this.draftObserver = new DraftObserver((draftText) => {
        this.draftState = draftText;
        callback(draftText);
      }, this.logger);
    }

    const inputEl = this.getInput();
    if (inputEl) {
      this.draftObserver.start(inputEl);
    }

    return () => {
      if (this.draftObserver) {
        this.draftObserver.stop();
        this.draftObserver = null;
      }
    };
  }

  public observeDOMStatus(callback: (result: WhatsAppDOMValidationResult) => void): () => void {
    this.domStatusCallbacks.add(callback);
    callback(this.validateWhatsAppDOM());

    this.ensureChatObserver();

    return () => {
      this.domStatusCallbacks.delete(callback);
    };
  }

  public observeChat(callback: (chat: WhatsAppChat | null) => void): () => void {
    this.chatCallbacks.add(callback);
    callback(this.activeChatState || this.getCurrentChat());

    this.ensureChatObserver();

    return () => {
      this.chatCallbacks.delete(callback);
    };
  }

  private ensureChatObserver(): void {
    if (!this.chatObserver) {
      this.chatObserver = new ChatObserver((activeConv, valResult) => {
        const chat = activeConv
          ? { id: activeConv.id, contactName: activeConv.name, isGroup: activeConv.chatType === 'group' }
          : null;
        this.activeChatState = chat;

        this.reattachSubObservers();

        for (const cb of this.chatCallbacks) {
          cb(chat);
        }

        for (const cb of this.domStatusCallbacks) {
          cb(valResult);
        }
      }, this.logger);

      this.chatObserver.start(document.body);
    }
  }

  public observeMessages(callback: (messages: WhatsAppVisibleMessage[]) => void): () => void {
    if (!this.conversationObserver) {
      this.conversationObserver = new ConversationObserver((messages) => {
        this.messagesState = messages;
        callback(messages);
      }, this.logger);
    }

    const msgContainer = findElementWithFallback(WhatsAppSelectors.messageContainer);
    if (msgContainer) {
      this.conversationObserver.start(msgContainer);
    }

    return () => {
      if (this.conversationObserver) {
        this.conversationObserver.stop();
        this.conversationObserver = null;
      }
    };
  }

  public observeConversation(callback: ConversationObserverCallback): void {
    this.observeChat((chat) => {
      const activeConv = chat
        ? { id: chat.id, name: chat.contactName, chatType: (chat.isGroup ? 'group' : 'direct') as 'group' | 'direct' }
        : null;
      const messages = this.getMessages(this.defaultLimit);
      callback({
        reason: 'chat_switched',
        conversation: activeConv,
        messages,
      });
    });
  }

  private reattachSubObservers(attempt: number = 0): void {
    const inputEl = this.getInput();
    if (inputEl && this.draftObserver) {
      this.draftObserver.start(inputEl);
    }

    const msgContainer = findElementWithFallback(WhatsAppSelectors.messageContainer);
    if (msgContainer && this.conversationObserver) {
      this.conversationObserver.start(msgContainer);
    }

    if ((!inputEl || !msgContainer) && attempt < 3) {
      setTimeout(() => {
        this.reattachSubObservers(attempt + 1);
      }, 100);
    }
  }

  public dispose(): void {
    if (this.draftObserver) {
      this.draftObserver.stop();
      this.draftObserver = null;
    }
    if (this.conversationObserver) {
      this.conversationObserver.stop();
      this.conversationObserver = null;
    }
    if (this.chatObserver) {
      this.chatObserver.stop();
      this.chatObserver = null;
    }
    this.chatCallbacks.clear();
    this.domStatusCallbacks.clear();
    this.logger.info('WhatsAppAdapter disposed.');
  }
}
