import { ANIMATION_STYLES } from './Animation.js';
import { THEME_VARIABLES } from './Theme.js';
import { ThemeMode } from './types.js';

export interface ShadowRootHost {
  hostElement: HTMLElement;
  shadowRoot: ShadowRoot;
  containerElement: HTMLElement;
  setTheme(theme: ThemeMode): void;
  destroy(): void;
}

export function createShadowHost(theme: ThemeMode = 'dark'): ShadowRootHost {
  const hostElement = document.createElement('rapport-overlay-host');
  hostElement.style.cssText = 'position: absolute; top: 0; left: 0; width: 0; height: 0; z-index: 99999; pointer-events: none;';

  // Attach closed Shadow Root for 100% CSS isolation
  const shadowRoot = hostElement.attachShadow({ mode: 'closed' });

  // Create internal style element
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    ${THEME_VARIABLES}
    ${ANIMATION_STYLES}

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    .rapport-toolbar-container {
      position: fixed;
      pointer-events: auto;
      font-family: var(--rapport-font-family);
      font-size: 13px;
      user-select: none;
      z-index: var(--rapport-z-index);
    }
  `;

  // Create inner container
  const containerElement = document.createElement('div');
  containerElement.className = 'rapport-toolbar-container';

  shadowRoot.appendChild(styleEl);
  shadowRoot.appendChild(containerElement);

  const setTheme = (mode: ThemeMode) => {
    hostElement.setAttribute('data-theme', mode);
  };

  setTheme(theme);

  return {
    hostElement,
    shadowRoot,
    containerElement,
    setTheme,
    destroy() {
      if (hostElement.parentNode) {
        hostElement.parentNode.removeChild(hostElement);
      }
    },
  };
}
