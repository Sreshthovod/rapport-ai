import { SELECTORS } from './selectors.js';
import {
  ActiveConversation,
  ChatType,
  WhatsAppChat,
  WhatsAppDOMValidationResult,
  WhatsAppMessage,
  WhatsAppVisibleMessage,
} from './types.js';
import {
  DEFAULT_MESSAGE_LIMIT,
  UNKNOWN_CHAT,
  UNKNOWN_SENDER,
} from './constants.js';
import {
  extractTextWithEmojis,
  Logger,
  parsePrePlainTextTimestamp,
  queryAllElements,
  queryFirstElement,
  sanitizeText,
} from './utils.js';

export function validateWhatsAppDOM(logger?: Logger): WhatsAppDOMValidationResult {
  const dummyLogger: Logger = { warn: () => {}, info: () => {}, error: () => {} };
  const log = logger || dummyLogger;

  const activeChat = parseActiveConversation(log);
  const inputEl = queryFirstElement(SELECTORS.inputArea);
  const containerEl = queryFirstElement(SELECTORS.messageListContainer);
  const messages = getVisibleMessages(20, log);

  const result: WhatsAppDOMValidationResult = {
    chatFound: activeChat !== null,
    inputFound: inputEl !== null,
    messageContainerFound: containerEl !== null,
    messagesFound: messages.length > 0,
    title: activeChat?.name || null,
    messageCount: messages.length,
  };

  logDOMDiagnostics(result);
  return result;
}

export function logDOMDiagnostics(result: WhatsAppDOMValidationResult): void {
  const lines: string[] = ['[WhatsApp DOM Inspector]'];

  if (result.chatFound) {
    lines.push(`  ✓ Chat title found: "${result.title}"`);
  } else {
    lines.push('  ✗ Missing: Chat title');
  }

  if (result.inputFound) {
    lines.push('  ✓ Input found');
  } else {
    lines.push('  ✗ Missing: Input');
  }

  if (result.messageContainerFound) {
    lines.push('  ✓ Message container found');
  } else {
    lines.push('  ✗ Missing: Message container');
  }

  if (result.messagesFound) {
    lines.push(`  ✓ Messages extracted (${result.messageCount})`);
  } else {
    lines.push('  ✗ Messages extracted (0)');
  }

  console.log(lines.join('\n'));
}

export function getCurrentChat(logger: Logger): WhatsAppChat | null {
  const activeConv = parseActiveConversation(logger);
  if (!activeConv) return null;

  return {
    id: activeConv.id,
    contactName: activeConv.name,
    isGroup: activeConv.chatType === 'group',
  };
}

export function parseActiveConversation(logger: Logger): ActiveConversation | null {
  const headerEl = queryFirstElement(SELECTORS.chatHeader);
  if (!headerEl) {
    return null;
  }

  const titleEl = queryFirstElement(SELECTORS.chatTitle, headerEl) || queryFirstElement(SELECTORS.chatTitle);
  const name = titleEl ? sanitizeText(titleEl.textContent || '') : UNKNOWN_CHAT;

  if (!name || name === UNKNOWN_CHAT) {
    return null;
  }

  const subtitleEl = headerEl.querySelector('span[title*=","], span[title*="You"]');
  const chatType: ChatType = subtitleEl ? 'group' : 'direct';

  const safeId = `${chatType}_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

  return {
    id: safeId,
    name,
    chatType,
  };
}

export function parseMessageRow(
  rowEl: HTMLElement,
  index: number,
  logger: Logger
): WhatsAppMessage | null {
  const isSystem = queryFirstElement(SELECTORS.systemMessage, rowEl);
  if (isSystem) {
    return null;
  }

  const textEl = queryFirstElement(SELECTORS.messageText, rowEl);
  if (!textEl) {
    return null;
  }

  const text = extractTextWithEmojis(textEl);
  if (!text) {
    return null;
  }

  const isOutgoing =
    rowEl.classList.contains('message-out') ||
    rowEl.getAttribute('data-testid') === 'msg-out' ||
    rowEl.querySelector('div[data-id*="true_"]') !== null;

  const copyableContainer = queryFirstElement(['div[data-pre-plain-text]'], rowEl);
  const prePlainText = copyableContainer?.getAttribute('data-pre-plain-text') || '';

  let sender = isOutgoing ? 'Me' : UNKNOWN_SENDER;
  let timestamp = Date.now();

  if (prePlainText) {
    timestamp = parsePrePlainTextTimestamp(prePlainText);
    if (!isOutgoing) {
      const senderMatch = prePlainText.match(/\]\s*(.*?):/);
      if (senderMatch && senderMatch[1]) {
        sender = sanitizeText(senderMatch[1]);
      }
    }
  } else {
    const senderEl = queryFirstElement(SELECTORS.messageSender, rowEl);
    if (senderEl && !isOutgoing) {
      sender = sanitizeText(senderEl.textContent || UNKNOWN_SENDER);
    }
  }

  const dataId = rowEl.getAttribute('data-id') || `msg_${timestamp}_${index}`;

  return {
    id: dataId,
    sender,
    timestamp,
    text,
    isOutgoing,
  };
}

export function getVisibleMessages(
  limit: number = DEFAULT_MESSAGE_LIMIT,
  logger: Logger
): WhatsAppVisibleMessage[] {
  const rawMessages = parseMessages(limit, logger);
  return rawMessages.map((msg) => ({
    id: msg.id,
    author: msg.sender,
    text: msg.text,
    timestamp: msg.timestamp,
    direction: msg.isOutgoing ? 'outgoing' : 'incoming',
  }));
}

export function parseMessages(
  limit: number = DEFAULT_MESSAGE_LIMIT,
  logger: Logger
): WhatsAppMessage[] {
  const containerEl = queryFirstElement(SELECTORS.messageListContainer);
  if (!containerEl) {
    return [];
  }

  const rowElements = queryAllElements(SELECTORS.messageRow, containerEl);
  if (rowElements.length === 0) {
    return [];
  }

  const targetRows = rowElements.slice(-limit);
  const messages: WhatsAppMessage[] = [];

  targetRows.forEach((rowEl, idx) => {
    const parsed = parseMessageRow(rowEl, idx, logger);
    if (parsed) {
      messages.push(parsed);
    }
  });

  return messages;
}
