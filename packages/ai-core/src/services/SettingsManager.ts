import { DEFAULT_RAPPORT_SETTINGS, RapportSettings } from '@rapport/shared';
import { ApiKeyManager } from '../providers/ApiKeyManager.js';
import { ProviderManager } from '../providers/ProviderManager.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;

export class SettingsManager {
  private static instance: SettingsManager | null = null;
  private settings: RapportSettings = { ...DEFAULT_RAPPORT_SETTINGS };
  private readonly listeners: Set<(settings: RapportSettings) => void> = new Set();
  private readonly providerManager = ProviderManager.getInstance();
  private readonly keyManager = ApiKeyManager.getInstance();

  constructor() {
    this.loadSettings();
  }

  public static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  public async loadSettings(): Promise<RapportSettings> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const result = await new Promise<Record<string, unknown>>((resolve) => {
          chrome.storage.local.get(['rapport_user_settings'], (res: Record<string, unknown>) => resolve(res || {}));
        });
        if (result.rapport_user_settings) {
          this.settings = {
            ...DEFAULT_RAPPORT_SETTINGS,
            ...(result.rapport_user_settings as Partial<RapportSettings>),
          };
        }
      } else if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('rapport_user_settings');
        if (stored) {
          this.settings = {
            ...DEFAULT_RAPPORT_SETTINGS,
            ...JSON.parse(stored),
          };
        }
      }
    } catch {
      // Storage load error fallback to defaults
    }

    this.syncWithProviderManager();
    return { ...this.settings };
  }

  public getSettings(): RapportSettings {
    return { ...this.settings };
  }

  public async updateSettings(updates: Partial<RapportSettings>): Promise<RapportSettings> {
    this.settings = {
      ...this.settings,
      ...updates,
    };

    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await new Promise<void>((resolve) => {
          chrome.storage.local.set({ rapport_user_settings: this.settings }, () => resolve());
        });
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem('rapport_user_settings', JSON.stringify(this.settings));
      }
    } catch {
      // Storage save error fallback
    }

    this.syncWithProviderManager();
    this.notifyListeners();
    return { ...this.settings };
  }

  public subscribe(listener: (settings: RapportSettings) => void): () => void {
    this.listeners.add(listener);
    listener({ ...this.settings });
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const copy = { ...this.settings };
    this.listeners.forEach((fn) => fn(copy));
  }

  private syncWithProviderManager(): void {
    const activeProvider = this.settings.activeProviderId;
    let selectedModel = this.settings.openaiModel;
    if (activeProvider === 'claude') selectedModel = this.settings.claudeModel;
    if (activeProvider === 'gemini') selectedModel = this.settings.geminiModel;
    if (activeProvider === 'fake-provider') selectedModel = 'fake-deterministic';

    this.providerManager.setConfig({
      activeProviderId: activeProvider,
      fallbackProviderId: this.settings.fallbackProviderId,
      model: selectedModel,
      temperature: this.settings.temperature,
      maxTokens: this.settings.maxTokens,
      maxRetries: this.settings.maxRetries,
      timeoutMs: this.settings.requestTimeoutMs,
    });
  }
}
