import { ThemeMode } from './types.js';

export const THEME_VARIABLES = `
  :host {
    --rapport-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    --rapport-radius: 12px;
    --rapport-transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
    --rapport-transition-normal: 200ms cubic-bezier(0.4, 0, 0.2, 1);
    --rapport-z-index: 999999;
  }

  :host([data-theme="light"]) {
    --rapport-bg: #ffffff;
    --rapport-border: #e0e0e0;
    --rapport-text-primary: #111b21;
    --rapport-text-secondary: #667781;
    --rapport-hover-bg: #f0f2f5;
    --rapport-accent: #00a884;
    --rapport-accent-disabled: #a0a0a0;
    --rapport-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  }

  :host([data-theme="dark"]) {
    --rapport-bg: #111b21;
    --rapport-border: #222d34;
    --rapport-text-primary: #e9edef;
    --rapport-text-secondary: #8696a0;
    --rapport-hover-bg: #202c33;
    --rapport-accent: #00a884;
    --rapport-accent-disabled: #54656f;
    --rapport-shadow: 0 4px 16px rgba(0, 0, 0, 0.45);
  }
`;

export function detectSystemTheme(): ThemeMode {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}
