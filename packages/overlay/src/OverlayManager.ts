import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { FloatingToolbar } from './FloatingToolbar.js';
import { createPositioningEngine, PositioningEngine } from './Positioning.js';
import { createShadowHost, ShadowRootHost } from './ShadowRoot.js';
import { detectSystemTheme } from './Theme.js';
import { OverlayManagerOptions, PositionCoordinates, ThemeMode } from './types.js';

export class OverlayManager {
  private shadowHost: ShadowRootHost | null = null;
  private reactRoot: Root | null = null;
  private positioningEngine: PositioningEngine;
  private stopPositionObserver: (() => void) | null = null;

  private isVisible: boolean = true;
  private currentTheme: ThemeMode;
  private targetElement: HTMLElement | null = null;

  constructor(options: OverlayManagerOptions = {}) {
    this.currentTheme = options.theme || detectSystemTheme();
    this.targetElement = options.targetElement || null;
    this.positioningEngine = createPositioningEngine();
  }

  public mount(parentContainer: HTMLElement = document.body): void {
    if (this.shadowHost) return;

    // 1. Create closed ShadowRoot DOM host
    this.shadowHost = createShadowHost(this.currentTheme);
    parentContainer.appendChild(this.shadowHost.hostElement);

    // 2. Create React root inside Shadow DOM container
    this.reactRoot = createRoot(this.shadowHost.containerElement);

    // 3. Register global Cmd+K / Ctrl+K listener
    this.registerShortcutListener();

    // 4. Start positioning engine observer
    this.updatePositioning();

    // 5. Initial render
    this.render();
  }

  public setTargetElement(target: HTMLElement | null): void {
    this.targetElement = target;
    this.updatePositioning();
  }

  public setTheme(theme: ThemeMode): void {
    this.currentTheme = theme;
    if (this.shadowHost) {
      this.shadowHost.setTheme(theme);
    }
    this.render();
  }

  public toggleVisibility(): void {
    this.isVisible = !this.isVisible;
    this.render();
  }

  public setVisibility(visible: boolean): void {
    this.isVisible = visible;
    this.render();
  }

  private updatePositioning(): void {
    if (this.stopPositionObserver) {
      this.stopPositionObserver();
      this.stopPositionObserver = null;
    }

    if (!this.targetElement) return;

    this.stopPositionObserver = this.positioningEngine.observe(
      this.targetElement,
      (pos: PositionCoordinates) => {
        if (!this.shadowHost) return;
        const container = this.shadowHost.containerElement;
        if (pos.visible && this.isVisible) {
          container.style.display = 'block';
          container.style.top = `${pos.top}px`;
          container.style.left = `${pos.left}px`;
        } else {
          container.style.display = 'none';
        }
      }
    );
  }

  private registerShortcutListener(): void {
    window.addEventListener('keydown', this.handleKeyDown, true);
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    const isCmdOrCtrl = event.metaKey || event.ctrlKey;
    if (isCmdOrCtrl && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      event.stopPropagation();
      this.toggleVisibility();
    }
  };

  private render(): void {
    if (!this.reactRoot) return;

    this.reactRoot.render(
      React.createElement(FloatingToolbar, {
        visible: this.isVisible,
        onSettingsClick: () => {
          console.log('[RapportOverlay] Settings clicked');
        },
      })
    );
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown, true);

    if (this.stopPositionObserver) {
      this.stopPositionObserver();
      this.stopPositionObserver = null;
    }

    if (this.reactRoot) {
      this.reactRoot.unmount();
      this.reactRoot = null;
    }

    if (this.shadowHost) {
      this.shadowHost.destroy();
      this.shadowHost = null;
    }
  }
}
