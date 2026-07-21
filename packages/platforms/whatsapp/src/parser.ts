import { SELECTORS } from './selectors.js';
import { ActiveConversation, ChatType, WhatsAppMessage } from './types.js';
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

export function parseActiveConversation(logger: Logger): ActiveConversation | null {
  const headerEl = queryFirstElement(SELECTORS.chatHeader);
  if (!headerEl) {
    logger.warn('Chat header element not found.');
    return null;
  }

  const titleEl = queryFirstElement(SELECTORS.chatTitle, headerEl);
  const name = titleEl ? sanitizeText(titleEl.textContent || '') : UNKNOWN_CHAT;

  if (!name || name === UNKNOWN_CHAT) {
    logger.warn('Could not extract active conversation title.');
    return null;
  }

  // Detect group chat by checking subtitle/member list indicator or icon
  const subtitleEl = headerEl.querySelector('span[title*=","], span[title*="You"]');
  const chatType: ChatType = subtitleEl ? 'group' : 'direct';

  // Construct stable ID from name & type
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
  // Check if system message (e.g., E2EE notice or call status)
  const isSystem = queryFirstElement(SELECTORS.systemMessage, rowEl);
  if (isSystem) {
    return null;
  }

  // Extract text container
  const textEl = queryFirstElement(SELECTORS.messageText, rowEl);
  if (!textEl) {
    return null;
  }

  const text = extractTextWithEmojis(textEl);
  if (!text) {
    return null;
  }

  // Detect direction (outgoing vs incoming)
  const isOutgoing =
    rowEl.classList.contains('message-out') ||
    rowEl.getAttribute('data-testid') === 'msg-out' ||
    rowEl.querySelector('div[data-id*="true_"]') !== null;

  // Extract pre-plain text metadata if present: "[10:15 AM, 7/21/2026] Sender: "
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
    // Fallback sender extraction for groups
    const senderEl = queryFirstElement(SELECTORS.messageSender, rowEl);
    if (senderEl && !isOutgoing) {
      sender = sanitizeText(senderEl.textContent || UNKNOWN_SENDER);
    }
  }

  // Stable message ID
  const dataId = rowEl.getAttribute('data-id') || `msg_${timestamp}_${index}`;

  return {
    id: dataId,
    sender,
    timestamp,
    text,
    isOutgoing,
  };
}

export function parseMessages(
  limit: number = DEFAULT_MESSAGE_LIMIT,
  logger: Logger
): WhatsAppMessage[] {
  const containerEl = queryFirstElement(SELECTORS.messageListContainer);
  if (!containerEl) {
    logger.warn('Message list container not found.');
    return [];
  }

  const rowElements = queryAllElements(SELECTORS.messageRow, containerEl);
  if (rowElements.length === 0) {
    return [];
  }

  // Select last N rows up to limit
  const targetRows = rowElements.slice(-limit);
  const messages: WhatsAppMessage[] = [];

  targetRows.forEach((rowEl, idx) => {
    const parsed = parseMessageRow(rowEl, idx, logger);
    if (parsed) {
      messages.push(parsed);
    }
  });

  logger.info(`Extracted ${messages.length} messages from DOM.`);
  return messages;
}
