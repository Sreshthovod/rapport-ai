import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { FakeAIResponse } from '@rapport/shared';
import { AIModal } from './components/AIModal.js';
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
  private pendingCommitmentText?: string;

  // Dragging State
  private isDragging: boolean = false;
  private dragStartPos: { x: number; y: number } = { x: 0, y: 0 };
  private customPosition: { top: number; left: number } | null = null;
  private anchoredPosition: PositionCoordinates = { top: 0, left: 0, width: 0, visible: false };

  // AI Modal States
  private aiModalVisible: boolean = false;
  private aiModalLoading: boolean = false;
  private aiModalData: FakeAIResponse | null = null;
  private aiModalError: string | null = null;

  private onAIClickCallback?: () => void;
  private onInsertDraftCallback?: (text: string) => void;

  constructor(options: OverlayManagerOptions = {}) {
    this.currentTheme = options.theme || detectSystemTheme();
    this.targetElement = options.targetElement || null;
    this.positioningEngine = createPositioningEngine();
  }

  public mount(parentContainer: HTMLElement = document.body): void {
    if (this.shadowHost) return;

    this.shadowHost = createShadowHost(this.currentTheme);
    parentContainer.appendChild(this.shadowHost.hostElement);

    this.reactRoot = createRoot(this.shadowHost.containerElement);

    this.registerShortcutListener();
    this.updatePositioning();
    this.render();
  }

  public setTargetElement(target: HTMLElement | null): void {
    this.targetElement = target;
    this.updatePositioning();
  }

  public setPendingCommitmentText(text?: string): void {
    this.pendingCommitmentText = text;
    this.render();
  }

  public onAIClick(callback: () => void): void {
    this.onAIClickCallback = callback;
  }

  public onInsertDraft(callback: (text: string) => void): void {
    this.onInsertDraftCallback = callback;
  }

  public showAILoading(): void {
    this.aiModalVisible = true;
    this.aiModalLoading = true;
    this.aiModalData = null;
    this.aiModalError = null;
    this.render();
  }

  public showAIResponse(data: FakeAIResponse): void {
    this.aiModalVisible = true;
    this.aiModalLoading = false;
    this.aiModalData = data;
    this.aiModalError = null;
    this.render();
  }

  public showAIError(error: string): void {
    this.aiModalVisible = true;
    this.aiModalLoading = false;
    this.aiModalData = null;
    this.aiModalError = error;
    this.render();
  }

  public closeAIModal(): void {
    this.aiModalVisible = false;
    this.aiModalLoading = false;
    this.render();
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

  private handleDragStart = (e: React.PointerEvent): void => {
    if (!this.shadowHost) return;
    const container = this.shadowHost.containerElement;

    this.isDragging = true;
    const currentTop = this.customPosition ? this.customPosition.top : this.anchoredPosition.top;
    const currentLeft = this.customPosition ? this.customPosition.left : this.anchoredPosition.left;

    this.dragStartPos = {
      x: e.clientX - currentLeft,
      y: e.clientY - currentTop,
    };

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Ignore if capture fails
    }

    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('pointercancel', this.handlePointerUp);
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (!this.isDragging || !this.shadowHost) return;

    const newLeft = e.clientX - this.dragStartPos.x;
    const newTop = e.clientY - this.dragStartPos.y;

    const maxLeft = Math.max(10, window.innerWidth - 100);
    const maxTop = Math.max(10, window.innerHeight - 50);

    const clampedLeft = Math.max(10, Math.min(newLeft, maxLeft));
    const clampedTop = Math.max(10, Math.min(newTop, maxTop));

    this.customPosition = { top: clampedTop, left: clampedLeft };

    const container = this.shadowHost.containerElement;
    container.style.top = `${clampedTop}px`;
    container.style.left = `${clampedLeft}px`;
  };

  private handlePointerUp = (): void => {
    if (!this.isDragging) return;
    this.isDragging = false;

    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('pointercancel', this.handlePointerUp);
  };

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
        this.anchoredPosition = pos;

        const container = this.shadowHost.containerElement;
        if (pos.visible && this.isVisible) {
          container.style.display = 'block';
          const top = this.customPosition ? this.customPosition.top : pos.top;
          const left = this.customPosition ? this.customPosition.left : pos.left;
          container.style.top = `${top}px`;
          container.style.left = `${left}px`;
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
    if (event.key === 'Escape' && this.aiModalVisible) {
      this.closeAIModal();
      return;
    }

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
      React.createElement(
        React.Fragment,
        null,
        React.createElement(FloatingToolbar, {
          visible: this.isVisible,
          pendingCommitmentText: this.pendingCommitmentText,
          onDragStart: this.handleDragStart,
          onAIClick: () => {
            if (this.onAIClickCallback) {
              this.onAIClickCallback();
            }
          },
          onSettingsClick: () => {
            console.log('[RapportOverlay] Settings clicked');
          },
        }),
        React.createElement(AIModal, {
          visible: this.aiModalVisible,
          loading: this.aiModalLoading,
          data: this.aiModalData,
          error: this.aiModalError,
          onClose: () => this.closeAIModal(),
          onRegenerate: () => {
            if (this.onAIClickCallback) {
              this.onAIClickCallback();
            }
          },
          onInsert: (text: string) => {
            if (this.onInsertDraftCallback) {
              this.onInsertDraftCallback(text);
            }
            this.closeAIModal();
          },
        })
      )
    );
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown, true);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('pointercancel', this.handlePointerUp);

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
