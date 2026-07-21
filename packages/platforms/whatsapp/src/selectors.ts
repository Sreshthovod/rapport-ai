export interface SelectorGroup {
  readonly chatHeader: string[];
  readonly chatTitle: string[];
  readonly inputArea: string[];
  readonly messageListContainer: string[];
  readonly messageRow: string[];
  readonly outgoingMessageRow: string[];
  readonly incomingMessageRow: string[];
  readonly messageText: string[];
  readonly messageTimestamp: string[];
  readonly messageSender: string[];
  readonly systemMessage: string[];
}

export const SELECTORS: SelectorGroup = {
  chatHeader: [
    'header[data-id]',
    '#main header',
    'div[data-testid="conversation-header"]',
    'header',
  ],
  chatTitle: [
    '#main header span[dir="auto"][title]',
    '#main header div[role="button"] span[dir="auto"]',
    'header div[title]',
    '#main header span[dir="auto"]',
  ],
  inputArea: [
    '#main footer div[contenteditable="true"][data-tab]',
    '#main footer div[contenteditable="true"]',
    'div[contenteditable="true"][data-tab="10"]',
    'div[contenteditable="true"][data-tab="6"]',
    'div[contenteditable="true"][role="textbox"]',
  ],
  messageListContainer: [
    '#main div[data-testid="conversation-panel-wrapper"]',
    '#main div[role="region"]',
    '#main div[data-tab="8"]',
    '#main div.copyable-area',
  ],
  messageRow: [
    'div[role="row"]',
    'div.message-in',
    'div.message-out',
    'div[data-id]',
  ],
  outgoingMessageRow: [
    'div.message-out',
    'div[data-id*="true_"]',
    'div[data-testid="msg-out"]',
  ],
  incomingMessageRow: [
    'div.message-in',
    'div[data-id*="false_"]',
    'div[data-testid="msg-in"]',
  ],
  messageText: [
    'span.selectable-text.copyable-text',
    'span.selectable-text',
    'div.copyable-text span',
    'span[dir="auto"]',
  ],
  messageTimestamp: [
    'div[data-pre-plain-text]',
    'span[data-testid="msg-meta"]',
    'div.copyable-text',
  ],
  messageSender: [
    'span[data-testid="author"]',
    'div[data-pre-plain-text]',
    'span.selectable-text.copyable-text',
  ],
  systemMessage: [
    'div[data-testid="system-message"]',
    'div.system-message',
    'span[data-icon="lock"]',
  ],
};
