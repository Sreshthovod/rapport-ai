import { SELECTORS } from './selectors.js';

export interface Logger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

export function createLogger(debugEnabled: boolean): Logger {
  return {
    info: (msg: string, ...args: unknown[]) => {
      if (debugEnabled) {
        console.log(`[WhatsAppAdapter] ${msg}`, ...args);
      }
    },
    warn: (msg: string, ...args: unknown[]) => {
      if (debugEnabled) {
        console.warn(`[WhatsAppAdapter:WARN] ${msg}`, ...args);
      }
    },
    error: (msg: string, ...args: unknown[]) => {
      if (debugEnabled) {
        console.error(`[WhatsAppAdapter:ERROR] ${msg}`, ...args);
      }
    },
  };
}

export function queryFirstElement<T extends HTMLElement = HTMLElement>(
  selectors: string[],
  root: Document | HTMLElement = document
): T | null {
  for (const selector of selectors) {
    const el = root.querySelector<T>(selector);
    if (el) {
      return el;
    }
  }
  return null;
}

export function queryAllElements<T extends HTMLElement = HTMLElement>(
  selectors: string[],
  root: Document | HTMLElement = document
): T[] {
  for (const selector of selectors) {
    const elements = Array.from(root.querySelectorAll<T>(selector));
    if (elements.length > 0) {
      return elements;
    }
  }
  return [];
}

export function sanitizeText(rawText: string): string {
  return rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

export function extractTextWithEmojis(element: HTMLElement): string {
  const clone = element.cloneNode(true) as HTMLElement;
  const emojiImgs = Array.from(clone.querySelectorAll<HTMLImageElement>('img[alt]'));
  
  for (const img of emojiImgs) {
    const alt = img.getAttribute('alt');
    if (alt) {
      const textNode = document.createTextNode(alt);
      img.parentNode?.replaceChild(textNode, img);
    }
  }

  return sanitizeText(clone.textContent || '');
}

export function parsePrePlainTextTimestamp(prePlainText: string): number {
  // Format: "[10:45 AM, 7/21/2026] Sender: "
  const match = prePlainText.match(/\[(.*?)\]/);
  if (match && match[1]) {
    const parsedDate = Date.parse(match[1]);
    if (!isNaN(parsedDate)) {
      return parsedDate;
    }
  }
  return Date.now();
}
