import { ThemeMode } from './types.js';

export const THEME_VARIABLES = `
  :host {
    --rapport-font-family: "Outfit", -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    --rapport-radius-sm: 6px;
    --rapport-radius: 10px;
    --rapport-radius-lg: 16px;
    --rapport-transition-fast: 120ms cubic-bezier(0.16, 1, 0.3, 1);
    --rapport-transition-normal: 200ms cubic-bezier(0.16, 1, 0.3, 1);
    --rapport-z-index: 999999;
  }

  :host([data-theme="light"]) {
    --rapport-bg: rgba(255, 255, 255, 0.82);
    --rapport-bg-solid: #ffffff;
    --rapport-bg-hover: rgba(0, 0, 0, 0.04);
    --rapport-bg-input: rgba(0, 0, 0, 0.02);
    --rapport-border: rgba(0, 0, 0, 0.06);
    --rapport-border-hover: rgba(0, 0, 0, 0.12);
    --rapport-text-primary: #1c1c1e;
    --rapport-text-secondary: #575757;
    --rapport-text-tertiary: #9ca3af;
    --rapport-accent: #00b894;
    --rapport-accent-muted: rgba(0, 184, 148, 0.08);
    --rapport-accent-hover: #00a884;
    --rapport-accent-disabled: #a0a0a0;
    --rapport-shadow: 0 12px 32px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04);
    --rapport-blur: blur(20px);
    --rapport-shimmer-bg: linear-gradient(90deg, rgba(0,0,0,0.03) 25%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.03) 75%);
  }

  :host([data-theme="dark"]) {
    --rapport-bg: rgba(22, 22, 26, 0.84);
    --rapport-bg-solid: #16161a;
    --rapport-bg-hover: rgba(255, 255, 255, 0.05);
    --rapport-bg-input: rgba(255, 255, 255, 0.02);
    --rapport-border: rgba(255, 255, 255, 0.08);
    --rapport-border-hover: rgba(255, 255, 255, 0.15);
    --rapport-text-primary: #f5f5f7;
    --rapport-text-secondary: #a1a1a6;
    --rapport-text-tertiary: #68686e;
    --rapport-accent: #00b894;
    --rapport-accent-muted: rgba(0, 184, 148, 0.12);
    --rapport-accent-hover: #00d2a4;
    --rapport-accent-disabled: #48484e;
    --rapport-shadow: 0 20px 48px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.05);
    --rapport-blur: blur(24px);
    --rapport-shimmer-bg: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
  }
`;

export function detectSystemTheme(): ThemeMode {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}
