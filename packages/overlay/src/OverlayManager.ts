import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { CompiledPromptSpec, FakeAIResponse } from '@rapport/shared';
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

  // Unified Workspace States
  private workspaceVisible: boolean = false;
  private activeTab: 'AI' | 'Tone' | 'Strategy' | 'Memory' | 'Settings' = 'AI';
  private aiModalLoading: boolean = false;
  private aiModalShowSettings: boolean = false;
  private streamingText: string = '';
  private aiModalData: FakeAIResponse | null = null;
  private aiModalError: string | null = null;
  private aiModalCopilotTip: string | undefined = undefined;
  private compiledPrompt: CompiledPromptSpec | null = null;

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

  public setCompiledPrompt(spec: CompiledPromptSpec | null): void {
    this.compiledPrompt = spec;
    if (this.workspaceVisible) this.render();
  }

  /** Set a live copilot tip to display inside the AI modal. Pass undefined to hide the chip. */
  public setCopilotTip(tip: string | undefined): void {
    this.aiModalCopilotTip = tip;
    if (this.workspaceVisible) {
      this.render();
    }
  }

  public openAIModal(): void {
    this.workspaceVisible = true;
    this.activeTab = 'AI';
    if (this.onAIClickCallback) {
      this.onAIClickCallback();
    } else {
      this.showAILoading();
    }
  }

  public showAISettings(): void {
    this.workspaceVisible = true;
    this.activeTab = 'Settings';
    this.render();
  }

  public showAILoading(): void {
    this.workspaceVisible = true;
    this.activeTab = 'AI';
    this.aiModalLoading = true;
    this.streamingText = '';
    this.aiModalData = null;
    this.aiModalError = null;
    this.render();
  }

  public updateStreamingText(chunk: string): void {
    this.streamingText += chunk;
    this.workspaceVisible = true;
    this.activeTab = 'AI';
    this.aiModalLoading = true;
    this.render();
  }

  public showAIResponse(data: FakeAIResponse): void {
    this.workspaceVisible = true;
    this.activeTab = 'AI';
    this.aiModalLoading = false;
    this.streamingText = '';
    this.aiModalData = data;
    this.aiModalError = null;
    this.render();
  }

  public showAIError(error: string): void {
    this.workspaceVisible = true;
    this.activeTab = 'AI';
    this.aiModalLoading = false;
    this.streamingText = '';
    this.aiModalData = null;
    this.aiModalError = error;
    this.render();
  }

  public closeAIModal(): void {
    this.workspaceVisible = false;
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

    this.customPosition = {
      top: Math.min(Math.max(10, newTop), maxTop),
      left: Math.min(Math.max(10, newLeft), maxLeft),
    };

    const container = this.shadowHost.containerElement;
    container.style.top = `${this.customPosition.top}px`;
    container.style.left = `${this.customPosition.left}px`;
  };

  private handlePointerUp = (e: PointerEvent): void => {
    this.isDragging = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
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
    if (event.key === 'Escape') {
      if (this.workspaceVisible) {
        this.workspaceVisible = false;
        event.preventDefault();
        event.stopPropagation();
        this.render();
        return;
      } else if (this.isVisible) {
        this.isVisible = false;
        event.preventDefault();
        event.stopPropagation();
        this.render();
        return;
      }
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
        React.StrictMode,
        null,
        React.createElement(
          React.Fragment,
          null,
          React.createElement(FloatingToolbar, {
            visible: this.isVisible,
            isWorkspaceOpen: this.workspaceVisible,
            activeTab: this.activeTab,
            pendingCommitmentText: this.pendingCommitmentText,
            onDragStart: this.handleDragStart,
            onLogoClick: () => {
              this.workspaceVisible = !this.workspaceVisible;
              this.render();
            },
            onAIClick: () => {
              if (this.workspaceVisible && this.activeTab === 'AI') {
                this.workspaceVisible = false;
              } else {
                this.workspaceVisible = true;
                this.activeTab = 'AI';
              }
              this.render();
            },
            onToneClick: () => {
              if (this.workspaceVisible && this.activeTab === 'Tone') {
                this.workspaceVisible = false;
              } else {
                this.workspaceVisible = true;
                this.activeTab = 'Tone';
              }
              this.render();
            },
            onStrategyClick: () => {
              if (this.workspaceVisible && this.activeTab === 'Strategy') {
                this.workspaceVisible = false;
              } else {
                this.workspaceVisible = true;
                this.activeTab = 'Strategy';
              }
              this.render();
            },
            onMemoryClick: () => {
              if (this.workspaceVisible && this.activeTab === 'Memory') {
                this.workspaceVisible = false;
              } else {
                this.workspaceVisible = true;
                this.activeTab = 'Memory';
              }
              this.render();
            },
            onSettingsClick: () => {
              if (this.workspaceVisible && this.activeTab === 'Settings') {
                this.workspaceVisible = false;
              } else {
                this.workspaceVisible = true;
                this.activeTab = 'Settings';
              }
              this.render();
            },
          }),
          React.createElement(AIModal, {
            visible: this.workspaceVisible,
            activeTab: this.activeTab,
            onTabChange: (tab) => {
              this.activeTab = tab;
              this.render();
            },
            loading: this.aiModalLoading,
            initialShowSettings: this.activeTab === 'Settings',
            streamingText: this.streamingText,
            data: this.aiModalData,
            error: this.aiModalError,
            compiledPrompt: this.compiledPrompt,
            copilotTip: this.aiModalCopilotTip,
            anchorTop: this.customPosition ? this.customPosition.top : this.anchoredPosition.top,
            onClose: () => this.closeAIModal(),
            onRegenerate: () => {
              this.showAILoading();
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
