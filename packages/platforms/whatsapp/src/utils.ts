import { SelectorGroup, SELECTORS } from './selectors.js';

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

export function findElementWithFallback<T extends HTMLElement = HTMLElement>(
  group: SelectorGroup | string[],
  root: Document | HTMLElement = document
): T | null {
  try {
    if (Array.isArray(group)) {
      return queryFirstElement<T>(group, root);
    }

    const tiers = [group.primary, group.secondary, group.tertiary];
    for (const selectorList of tiers) {
      if (!selectorList || !Array.isArray(selectorList)) continue;
      for (const selector of selectorList) {
        try {
          const element = root.querySelector<T>(selector);
          if (element) {
            return element;
          }
        } catch {
          // Ignore invalid selector error safely
        }
      }
    }
  } catch {
    // Never throw errors
  }
  return null;
}

export function findAllElementsWithFallback<T extends HTMLElement = HTMLElement>(
  group: SelectorGroup | string[],
  root: Document | HTMLElement = document
): T[] {
  try {
    if (Array.isArray(group)) {
      return queryAllElements<T>(group, root);
    }

    const tiers = [group.primary, group.secondary, group.tertiary];
    for (const selectorList of tiers) {
      if (!selectorList || !Array.isArray(selectorList)) continue;
      for (const selector of selectorList) {
        try {
          const elements = Array.from(root.querySelectorAll<T>(selector));
          if (elements.length > 0) {
            return elements;
          }
        } catch {
          // Ignore invalid selector error safely
        }
      }
    }
  } catch {
    // Never throw errors
  }
  return [];
}

export function queryFirstElement<T extends HTMLElement = HTMLElement>(
  selectors: string[] | SelectorGroup,
  root: Document | HTMLElement = document
): T | null {
  if (!Array.isArray(selectors)) {
    return findElementWithFallback<T>(selectors, root);
  }
  try {
    for (const selector of selectors) {
      try {
        const el = root.querySelector<T>(selector);
        if (el) {
          return el;
        }
      } catch {
        // Ignore selector error safely
      }
    }
  } catch {
    // Never throw errors
  }
  return null;
}

export function queryAllElements<T extends HTMLElement = HTMLElement>(
  selectors: string[] | SelectorGroup,
  root: Document | HTMLElement = document
): T[] {
  if (!Array.isArray(selectors)) {
    return findAllElementsWithFallback<T>(selectors, root);
  }
  try {
    for (const selector of selectors) {
      try {
        const elements = Array.from(root.querySelectorAll<T>(selector));
        if (elements.length > 0) {
          return elements;
        }
      } catch {
        // Ignore selector error safely
      }
    }
  } catch {
    // Never throw errors
  }
  return [];
}

export function sanitizeText(rawText: string): string {
  return rawText
    .replace(/[\u200b\u200e\u200f\uFEFF]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

export function extractTextWithEmojis(element: HTMLElement): string {
  const clone = element.cloneNode(true) as HTMLElement;

  // Convert <br> elements to linebreaks
  const brElements = Array.from(clone.querySelectorAll('br'));
  for (const br of brElements) {
    br.parentNode?.replaceChild(document.createTextNode('\n'), br);
  }

  // Convert emoji images to alt text
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
  // Format: "[10:45 AM, 7/21/2026] Sender: " or localized equivalents
  const match = prePlainText.match(/\[(.*?)\]/);
  if (match && match[1]) {
    const dateStr = match[1].trim();
    const parsedDate = Date.parse(dateStr);
    if (!isNaN(parsedDate)) {
      return parsedDate;
    }

    // Fallback: Extract time component (e.g., "10:45 AM" or "22:45")
    const timeMatch = dateStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)?/);
    if (timeMatch) {
      const now = new Date();
      let hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
      const meridiem = timeMatch[4];

      if (meridiem) {
        if (meridiem.toUpperCase() === 'PM' && hours < 12) hours += 12;
        if (meridiem.toUpperCase() === 'AM' && hours === 12) hours = 0;
      }

      now.setHours(hours, minutes, seconds, 0);
      return now.getTime();
    }
  }
  return Date.now();
}
