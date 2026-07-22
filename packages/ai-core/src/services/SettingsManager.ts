import { DEFAULT_RAPPORT_SETTINGS, MemoryStatistics, RapportSettings } from '@rapport/shared';
import { ApiKeyManager } from '../providers/ApiKeyManager.js';
import { ProviderManager } from '../providers/ProviderManager.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;

/**
 * SettingsManager — the single source of truth for all Rapport AI configuration.
 *
 * Responsibilities:
 *  - Load/save settings from chrome.storage.local or localStorage
 *  - Validate & clamp values before persisting
 *  - Sync active settings with ProviderManager
 *  - Publish change notifications to subscribers
 *  - Export settings for debug reports
 *  - Reset to defaults and clear all stored data
 */
export class SettingsManager {
  private static instance: SettingsManager | null = null;
  private settings: RapportSettings = { ...DEFAULT_RAPPORT_SETTINGS };
  private readonly listeners: Set<(settings: RapportSettings) => void> = new Set();
  private readonly providerManager = ProviderManager.getInstance();
  private readonly keyManager = ApiKeyManager.getInstance();
  private saveToastCallback?: (message: string, type: 'success' | 'error') => void;

  constructor() {
    this.loadSettings();
  }

  public static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  /** Register a callback to display toast messages in the UI */
  public onSaveToast(callback: (message: string, type: 'success' | 'error') => void): void {
    this.saveToastCallback = callback;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Load
  // ────────────────────────────────────────────────────────────────────────────

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
      // Storage load error — fallback to defaults
    }

    this.syncWithProviderManager();
    return { ...this.settings };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Read
  // ────────────────────────────────────────────────────────────────────────────

  public getSettings(): RapportSettings {
    return { ...this.settings };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Update
  // ────────────────────────────────────────────────────────────────────────────

  public async updateSettings(updates: Partial<RapportSettings>): Promise<RapportSettings> {
    const validated = this.validateSettings(updates);

    this.settings = {
      ...this.settings,
      ...validated,
    };

    await this.persistSettings();
    this.syncWithProviderManager();
    this.notifyListeners();

    return { ...this.settings };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Validate — clamp values to safe ranges before saving
  // ────────────────────────────────────────────────────────────────────────────

  public validateSettings(updates: Partial<RapportSettings>): Partial<RapportSettings> {
    const safe = { ...updates };

    // Numeric clamping
    if (safe.temperature !== undefined) {
      safe.temperature = Math.max(0, Math.min(1, safe.temperature));
    }
    if (safe.maxTokens !== undefined) {
      safe.maxTokens = Math.max(50, Math.min(4000, safe.maxTokens));
    }
    if (safe.suggestionCount !== undefined) {
      safe.suggestionCount = Math.max(1, Math.min(8, Math.floor(safe.suggestionCount)));
    }
    if (safe.requestTimeoutMs !== undefined) {
      safe.requestTimeoutMs = Math.max(3000, Math.min(120000, safe.requestTimeoutMs));
    }
    if (safe.maxRetries !== undefined) {
      safe.maxRetries = Math.max(0, Math.min(10, Math.floor(safe.maxRetries)));
    }
    if (safe.maxMemoriesInBudget !== undefined) {
      safe.maxMemoriesInBudget = Math.max(1, Math.min(20, Math.floor(safe.maxMemoriesInBudget)));
    }
    if (safe.promptContextBudget !== undefined) {
      safe.promptContextBudget = Math.max(500, Math.min(32000, safe.promptContextBudget));
    }
    if (safe.cacheDurationMs !== undefined) {
      safe.cacheDurationMs = Math.max(0, Math.min(3600000, safe.cacheDurationMs));
    }

    // Local-only mode enforcement — force offline provider
    if (safe.localOnlyMode === true) {
      safe.activeProviderId = 'fake-provider';
    }

    return safe;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Reset
  // ────────────────────────────────────────────────────────────────────────────

  public async resetToDefaults(): Promise<RapportSettings> {
    this.settings = { ...DEFAULT_RAPPORT_SETTINGS };
    await this.persistSettings();
    this.syncWithProviderManager();
    this.notifyListeners();
    this.saveToastCallback?.('Settings restored to defaults', 'success');
    return { ...this.settings };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Export (for debug reports)
  // ────────────────────────────────────────────────────────────────────────────

  public exportSettings(): string {
    const exportData = {
      settings: { ...this.settings },
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };
    return JSON.stringify(exportData, null, 2);
  }

  public exportDebugReport(): string {
    const report = {
      settings: { ...this.settings },
      providers: {
        active: this.settings.activeProviderId,
        fallback: this.settings.fallbackProviderId,
      },
      environment: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        timestamp: new Date().toISOString(),
        chromeStorageAvailable: typeof chrome !== 'undefined' && !!chrome?.storage?.local,
        localStorageAvailable: typeof localStorage !== 'undefined',
      },
    };
    return JSON.stringify(report, null, 2);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Clear All Data — destructive
  // ────────────────────────────────────────────────────────────────────────────

  public async clearAllData(): Promise<void> {
    // Clear settings
    this.settings = { ...DEFAULT_RAPPORT_SETTINGS };

    // Clear API keys
    await this.keyManager.deleteKey('openai');
    await this.keyManager.deleteKey('claude');
    await this.keyManager.deleteKey('gemini');

    // Clear storage
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await new Promise<void>((resolve) => {
          chrome.storage.local.clear(() => resolve());
        });
      } else if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
    } catch {
      // Storage unavailable
    }

    this.syncWithProviderManager();
    this.notifyListeners();
    this.saveToastCallback?.('All data cleared successfully', 'success');
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Memory Statistics (delegated — placeholder for MemoryStore integration)
  // ────────────────────────────────────────────────────────────────────────────

  public getMemoryStatistics(): MemoryStatistics {
    // In production this would query MemoryStore.getInstance()
    // For now return a safe placeholder that the UI can display
    return {
      totalMemories: 0,
      totalContacts: 0,
      storageSizeBytes: 0,
    };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Subscribe / Notify
  // ────────────────────────────────────────────────────────────────────────────

  public subscribe(listener: (settings: RapportSettings) => void): () => void {
    this.listeners.add(listener);
    listener({ ...this.settings });
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const copy = { ...this.settings };
    this.listeners.forEach((fn) => fn(copy));
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Persist
  // ────────────────────────────────────────────────────────────────────────────

  private async persistSettings(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await new Promise<void>((resolve) => {
          chrome.storage.local.set({ rapport_user_settings: this.settings }, () => resolve());
        });
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem('rapport_user_settings', JSON.stringify(this.settings));
      }
    } catch {
      // Storage save error — settings retained in memory
      this.saveToastCallback?.('Failed to save settings to storage', 'error');
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Sync Provider Manager
  // ────────────────────────────────────────────────────────────────────────────

  private syncWithProviderManager(): void {
    const activeProvider = this.settings.activeProviderId;
    let selectedModel = this.settings.openaiModel;
    if (activeProvider === 'claude') selectedModel = this.settings.claudeModel;
    if (activeProvider === 'gemini') selectedModel = this.settings.geminiModel;
    if (activeProvider === 'fake-provider') selectedModel = 'fake-deterministic';

    this.providerManager.setConfig({
      activeProviderId: activeProvider,
      fallbackProviderId: this.settings.enableProviderFallback
        ? this.settings.fallbackProviderId
        : undefined,
      model: selectedModel,
      temperature: this.settings.temperature,
      maxTokens: this.settings.maxTokens,
      maxRetries: this.settings.maxRetries,
      timeoutMs: this.settings.requestTimeoutMs,
    });
  }
}
