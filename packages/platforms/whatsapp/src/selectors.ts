export interface SelectorGroup {
  primary: string[];
  secondary: string[];
  tertiary: string[];
}

export const WhatsAppSelectors = {
  chatHeader: {
    primary: [
      'div[data-testid="conversation-header"]',
      'header[data-testid="conversation-header"]',
    ],
    secondary: [
      '#main header',
      'header[role="region"]',
      'div[role="region"] header',
    ],
    tertiary: [
      'header',
      '#main > div > header',
    ],
  },
  chatTitle: {
    primary: [
      'span[data-testid="conversation-info-header-chat-title"]',
      'div[data-testid="conversation-header"] span[title]',
    ],
    secondary: [
      '#main header span[title]',
      'header[role="region"] span[title]',
      'header div[role="button"] span[dir="auto"]',
      '#main header div[role="button"] span[dir="auto"]',
    ],
    tertiary: [
      '#main header span[dir="auto"]',
      'header span[dir]',
      '#main header span',
    ],
  },
  input: {
    primary: [
      'div[data-testid="conversation-compose-box"] div[contenteditable="true"]',
      'footer div[contenteditable="true"][data-tab="10"]',
      'div[data-testid="chat-input"]',
    ],
    secondary: [
      '#main footer div[contenteditable="true"][role="textbox"]',
      'footer div[contenteditable="true"]',
      'div[contenteditable="true"][role="textbox"]',
      'footer [contenteditable="true"]',
    ],
    tertiary: [
      'div[contenteditable="true"][data-tab="10"]',
      'div[contenteditable="true"]',
      'footer [contenteditable]',
    ],
  },
  messageContainer: {
    primary: [
      'div[data-testid="conversation-panel-wrapper"]',
      'div[data-testid="message-list"]',
    ],
    secondary: [
      '#main div[role="region"][tabindex="-1"]',
      '#main div.copyable-area',
      'div[role="application"] div[role="region"]',
      '#main div[role="region"]',
    ],
    tertiary: [
      '#main div[tabindex="-1"]',
      'div.copyable-area',
      '#main > div > div',
    ],
  },
  messages: {
    primary: [
      'div[data-testid="msg-container"]',
      'div[data-id][role="row"]',
    ],
    secondary: [
      'div[role="row"]',
      'div[data-id].focusable-list-item',
      'div[data-id]',
    ],
    tertiary: [
      'div.focusable-list-item',
      'div[tabindex="-1"][data-id]',
    ],
  },
  messageText: {
    primary: [
      'span.selectable-text.copyable-text[dir]',
      'span.selectable-text[dir]',
    ],
    secondary: [
      'div.copyable-text span[dir]',
      'span[dir="auto"]',
    ],
    tertiary: [
      'span[dir]',
    ],
  },
  messageSender: {
    primary: [
      'span[data-testid="author"]',
      'div[data-pre-plain-text]',
    ],
    secondary: [
      'span[aria-label]',
      'span.aria-label',
    ],
    tertiary: [
      'span[dir="auto"]',
    ],
  },
  quotedContainer: {
    primary: [
      'div[data-testid="quoted-message"]',
    ],
    secondary: [
      'div.quoted-mention',
    ],
    tertiary: [
      'div[role="button"][tabindex="-1"]',
    ],
  },
  systemMessage: {
    primary: [
      'div[data-testid="system-message"]',
    ],
    secondary: [
      'div[role="alert"]',
    ],
    tertiary: [
      'div[data-id*="system"]',
    ],
  },
};

const flattenGroup = (group: SelectorGroup): string[] => [
  ...group.primary,
  ...group.secondary,
  ...group.tertiary,
];

export const SELECTORS = {
  chatHeader: flattenGroup(WhatsAppSelectors.chatHeader),
  chatTitle: flattenGroup(WhatsAppSelectors.chatTitle),
  inputArea: flattenGroup(WhatsAppSelectors.input),
  input: flattenGroup(WhatsAppSelectors.input),
  messageListContainer: flattenGroup(WhatsAppSelectors.messageContainer),
  messageContainer: flattenGroup(WhatsAppSelectors.messageContainer),
  messageRow: flattenGroup(WhatsAppSelectors.messages),
  messages: flattenGroup(WhatsAppSelectors.messages),
  messageText: flattenGroup(WhatsAppSelectors.messageText),
  messageSender: flattenGroup(WhatsAppSelectors.messageSender),
  quotedContainer: flattenGroup(WhatsAppSelectors.quotedContainer),
  systemMessage: flattenGroup(WhatsAppSelectors.systemMessage),
};
