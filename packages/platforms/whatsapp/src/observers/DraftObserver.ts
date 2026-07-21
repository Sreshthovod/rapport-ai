import { extractTextWithEmojis, Logger } from '../utils.js';

export type DraftChangeCallback = (draftText: string) => void;

export class DraftObserver {
  private inputElement: HTMLElement | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private currentDraft: string = '';
  private isComposing: boolean = false;

  constructor(
    private readonly callback: DraftChangeCallback,
    private readonly logger: Logger,
    private readonly debounceMs: number = 50
  ) {}

  public start(inputElement: HTMLElement): void {
    if (this.inputElement === inputElement) return;

    this.stop();
    this.inputElement = inputElement;

    this.inputElement.addEventListener('input', this.handleInput);
    this.inputElement.addEventListener('beforeinput', this.handleInput);
    this.inputElement.addEventListener('keyup', this.handleInput);
    this.inputElement.addEventListener('compositionstart', this.handleCompositionStart);
    this.inputElement.addEventListener('compositionend', this.handleCompositionEnd);

    this.logger.info('[DraftObserver] Started listening to textarea input events.');
    this.evaluate();
  }

  public stop(): void {
    if (this.inputElement) {
      this.inputElement.removeEventListener('input', this.handleInput);
      this.inputElement.removeEventListener('beforeinput', this.handleInput);
      this.inputElement.removeEventListener('keyup', this.handleInput);
      this.inputElement.removeEventListener('compositionstart', this.handleCompositionStart);
      this.inputElement.removeEventListener('compositionend', this.handleCompositionEnd);
      this.inputElement = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.currentDraft = '';
    this.logger.info('[DraftObserver] Stopped.');
  }

  public getCurrentDraft(): string {
    if (!this.inputElement) return '';
    return extractTextWithEmojis(this.inputElement);
  }

  private handleCompositionStart = (): void => {
    this.isComposing = true;
  };

  private handleCompositionEnd = (): void => {
    this.isComposing = false;
    this.handleInput();
  };

  private handleInput = (): void => {
    if (this.isComposing) return;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.evaluate();
    }, this.debounceMs);
  };

  private evaluate(): void {
    const freshDraft = this.getCurrentDraft();
    if (freshDraft !== this.currentDraft) {
      this.currentDraft = freshDraft;
      this.logger.info(`[DraftObserver] Draft: "${freshDraft}"`);
      this.callback(freshDraft);
    }
  }
}
