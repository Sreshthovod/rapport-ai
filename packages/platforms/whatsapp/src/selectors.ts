export interface SelectorGroup {
  primary: string;
  secondary: string;
  tertiary: string;
}

export const SELECTORS = {
  chatHeader: [
    'div[data-testid="conversation-header"]',
    '#main header',
    'header[role="region"]',
  ],
  chatTitle: [
    'span[data-testid="conversation-info-header-chat-title"]',
    '#main header span[title]',
    '#main header div[role="button"] span[dir="auto"]',
  ],
  inputArea: [
    'footer div[contenteditable="true"][data-tab="10"]',
    '#main footer div[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"][data-tab="10"]',
    'footer div[contenteditable="true"]',
  ],
  messageListContainer: [
    'div[data-testid="conversation-panel-wrapper"]',
    '#main div[role="region"]',
    '#main div[tabindex="-1"]',
    '#main div.copyable-area',
  ],
  messageRow: [
    'div[data-testid="msg-container"]',
    'div[role="row"]',
    'div[data-id]',
  ],
  messageText: [
    'span.selectable-text[dir]',
    'div.copyable-text span[dir]',
    'span[dir="ltr"]',
    'span[dir="rtl"]',
  ],
  messageSender: [
    'span[data-testid="author"]',
    'span.aria-label',
    'div[data-pre-plain-text]',
  ],
  systemMessage: [
    'div[data-testid="system-message"]',
    'div[role="alert"]',
  ],
};
