import { DEFAULT_MESSAGE_LIMIT, WHATSAPP_DOMAIN } from './constants.js';
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
import { SELECTORS } from './selectors.js';
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
import { createLogger, Logger, queryFirstElement } from './utils.js';

export class WhatsAppAdapter {
  private readonly logger: Logger;
  private readonly defaultLimit: number;

  private chatObserver: ChatObserver | null = null;
  private conversationObserver: ConversationObserver | null = null;
  private draftObserver: DraftObserver | null = null;

  private activeChatState: WhatsAppChat | null = null;
  private messagesState: WhatsAppVisibleMessage[] = [];
  private draftState: string = '';

  constructor(config: WhatsAppAdapterConfig = {}) {
    const debug = config.debug ?? false;
    this.logger = createLogger(debug);
    this.defaultLimit = config.defaultMessageLimit ?? DEFAULT_MESSAGE_LIMIT;
  }

  public isSupported(windowLocation: Location = window.location): boolean {
    if (!windowLocation.hostname.includes(WHATSAPP_DOMAIN)) {
      return false;
    }

    const appContainer = document.getElementById('app') || document.querySelector('#main');
    if (!appContainer) {
      return false;
    }

    return true;
  }

  public validateWhatsAppDOM(): WhatsAppDOMValidationResult {
    return validateWhatsAppDOM(this.logger);
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

  public getInputElement(): HTMLElement | null {
    const inputEl = queryFirstElement(SELECTORS.inputArea);
    return inputEl;
  }

  public getDraftText(): string {
    if (this.draftObserver) {
      return this.draftObserver.getCurrentDraft();
    }
    const inputEl = this.getInputElement();
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

    const inputEl = this.getInputElement();
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

  public observeChat(callback: (chat: WhatsAppChat | null) => void): () => void {
    if (!this.chatObserver) {
      this.chatObserver = new ChatObserver((activeConv) => {
        const chat = activeConv
          ? { id: activeConv.id, contactName: activeConv.name, isGroup: activeConv.chatType === 'group' }
          : null;
        this.activeChatState = chat;

        this.reattachSubObservers();
        callback(chat);
      }, this.logger);
    }

    this.chatObserver.start(document.body);

    return () => {
      if (this.chatObserver) {
        this.chatObserver.stop();
        this.chatObserver = null;
      }
    };
  }

  public observeMessages(callback: (messages: WhatsAppVisibleMessage[]) => void): () => void {
    if (!this.conversationObserver) {
      this.conversationObserver = new ConversationObserver((messages) => {
        this.messagesState = messages;
        callback(messages);
      }, this.logger);
    }

    const msgContainer = queryFirstElement(SELECTORS.messageListContainer);
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

  private reattachSubObservers(): void {
    const inputEl = this.getInputElement();
    if (inputEl && this.draftObserver) {
      this.draftObserver.start(inputEl);
    }

    const msgContainer = queryFirstElement(SELECTORS.messageListContainer);
    if (msgContainer && this.conversationObserver) {
      this.conversationObserver.start(msgContainer);
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
    this.logger.info('WhatsAppAdapter disposed.');
  }
}
