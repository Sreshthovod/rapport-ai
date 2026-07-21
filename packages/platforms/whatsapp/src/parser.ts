import { SELECTORS, WhatsAppSelectors } from './selectors.js';
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
  findElementWithFallback,
  findAllElementsWithFallback,
  Logger,
  parsePrePlainTextTimestamp,
  sanitizeText,
} from './utils.js';

export function validateWhatsAppDOM(logger?: Logger): WhatsAppDOMValidationResult {
  const dummyLogger: Logger = { warn: () => {}, info: () => {}, error: () => {} };
  const log = logger || dummyLogger;

  const activeChat = parseActiveConversation(log);
  const inputEl = findElementWithFallback(WhatsAppSelectors.input);
  const containerEl = findElementWithFallback(WhatsAppSelectors.messageContainer);
  const messages = getVisibleMessages(20, log);

  const chatFound = activeChat !== null;
  const inputFound = inputEl !== null;
  const messageContainerFound = containerEl !== null;
  const connected = chatFound && inputFound && messageContainerFound;

  const result: WhatsAppDOMValidationResult = {
    chatFound,
    inputFound,
    messageContainerFound,
    messagesFound: messages.length > 0,
    title: activeChat?.name || null,
    messageCount: messages.length,
    connected,
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
  const headerEl = findElementWithFallback(WhatsAppSelectors.chatHeader);
  if (!headerEl) {
    return null;
  }

  const titleEl = findElementWithFallback(WhatsAppSelectors.chatTitle, headerEl) || findElementWithFallback(WhatsAppSelectors.chatTitle);
  const name = titleEl ? sanitizeText(titleEl.textContent || '') : UNKNOWN_CHAT;

  if (!name || name === UNKNOWN_CHAT) {
    return null;
  }

  // Detect group chat structurally or via group icon / subtitle metadata
  const hasGroupIcon = headerEl.querySelector('span[data-icon*="group"], [data-testid="default-group"], [data-icon="group"]') !== null;
  const subtitleEl = headerEl.querySelector('div[role="button"] span[title], div[role="button"] span[dir="auto"]');
  const subtitleText = subtitleEl ? sanitizeText(subtitleEl.getAttribute('title') || subtitleEl.textContent || '') : '';
  const isDirectStatus = /^(online|typing\.\.\.|last seen|online now)$/i.test(subtitleText);
  const isGroup = hasGroupIcon || (subtitleText.length > 0 && !isDirectStatus);

  const chatType: ChatType = isGroup ? 'group' : 'direct';
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
  const isSystem = findElementWithFallback(WhatsAppSelectors.systemMessage, rowEl);
  if (isSystem) {
    return null;
  }

  // Clone row element and remove quoted containers to isolate current message text
  const rowClone = rowEl.cloneNode(true) as HTMLElement;
  const quotedEls = findAllElementsWithFallback(WhatsAppSelectors.quotedContainer, rowClone);
  for (const q of quotedEls) {
    q.remove();
  }

  const textEl = findElementWithFallback(WhatsAppSelectors.messageText, rowClone);
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
    rowEl.querySelector('div[data-id*="true_"]') !== null ||
    rowEl.querySelector('[data-testid*="msg-out"]') !== null;

  const copyableContainer = findElementWithFallback({ primary: ['div[data-pre-plain-text]'], secondary: [], tertiary: [] }, rowEl);
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
    const senderEl = findElementWithFallback(WhatsAppSelectors.messageSender, rowEl);
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
  const containerEl = findElementWithFallback(WhatsAppSelectors.messageContainer);
  if (!containerEl) {
    return [];
  }

  const rowElements = findAllElementsWithFallback(WhatsAppSelectors.messages, containerEl);
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
