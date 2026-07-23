import { ProviderKeyStatus, withTimeout } from '@rapport/shared';

// Declare chrome for browser extension context
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;

export class ApiKeyManager {
  private static instance: ApiKeyManager | null = null;
  private readonly memoryKeys: Map<string, string> = new Map();
  private readonly validationCache: Map<string, ProviderKeyStatus> = new Map();

  public static getInstance(): ApiKeyManager {
    if (!ApiKeyManager.instance) {
      ApiKeyManager.instance = new ApiKeyManager();
    }
    return ApiKeyManager.instance;
  }

  /**
   * Helper to obfuscate keys prior to browser storage
   */
  private encodeKey(key: string): string {
    if (!key) return '';
    try {
      return btoa(`rapport_sec_${key}`);
    } catch {
      return key;
    }
  }

  /**
   * Helper to deobfuscate stored keys
   */
  private decodeKey(encoded: string): string {
    if (!encoded) return '';
    try {
      const decoded = atob(encoded);
      if (decoded.startsWith('rapport_sec_')) {
        return decoded.slice('rapport_sec_'.length);
      }
      return encoded;
    } catch {
      return encoded;
    }
  }

  public async setKey(providerId: string, apiKey: string): Promise<void> {
    const cleanKey = (apiKey || '').trim();
    if (!cleanKey) {
      await this.deleteKey(providerId);
      return;
    }

    this.memoryKeys.set(providerId, cleanKey);
    const obfuscated = this.encodeKey(cleanKey);

    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const storagePromise = typeof chrome.storage.local.set === 'function'
          ? chrome.storage.local.set({ [`rapport_key_${providerId}`]: obfuscated })
          : new Promise<void>((resolve) => {
              chrome.storage.local.set({ [`rapport_key_${providerId}`]: obfuscated }, () => resolve());
            });
        await withTimeout(storagePromise, 3000, `ApiKeyManager:setKey:${providerId}`);
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`rapport_key_${providerId}`, obfuscated);
      }
    } catch (err) {
      console.warn(`[ApiKeyManager] Storage error/timeout setting key for ${providerId}:`, err);
    }

    this.validationCache.set(providerId, {
      hasKey: true,
      isValidated: true,
      lastChecked: Date.now(),
    });
  }

  public async getKey(providerId: string): Promise<string | null> {
    if (this.memoryKeys.has(providerId)) {
      return this.memoryKeys.get(providerId) || null;
    }

    try {
      let rawStored: string | null = null;
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const storagePromise = typeof chrome.storage.local.get === 'function'
          ? chrome.storage.local.get([`rapport_key_${providerId}`])
          : new Promise<Record<string, unknown>>((resolve) => {
              chrome.storage.local.get([`rapport_key_${providerId}`], (res: Record<string, unknown>) => resolve(res || {}));
            });
        const result = (await withTimeout(storagePromise, 3000, `ApiKeyManager:getKey:${providerId}`)) as Record<string, unknown>;
        rawStored = (result?.[`rapport_key_${providerId}`] as string) || null;
      } else if (typeof localStorage !== 'undefined') {
        rawStored = localStorage.getItem(`rapport_key_${providerId}`);
      }

      if (rawStored) {
        const key = this.decodeKey(rawStored);
        if (key) {
          this.memoryKeys.set(providerId, key);
          return key;
        }
      }
    } catch (err) {
      console.warn(`[ApiKeyManager] Storage error/timeout getting key for ${providerId}:`, err);
    }

    return null;
  }

  public async deleteKey(providerId: string): Promise<void> {
    this.memoryKeys.delete(providerId);
    this.validationCache.delete(providerId);
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const storagePromise = typeof chrome.storage.local.remove === 'function'
          ? chrome.storage.local.remove([`rapport_key_${providerId}`])
          : new Promise<void>((resolve) => {
              chrome.storage.local.remove([`rapport_key_${providerId}`], () => resolve());
            });
        await withTimeout(storagePromise, 3000, `ApiKeyManager:deleteKey:${providerId}`);
      } else if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(`rapport_key_${providerId}`);
      }
    } catch (err) {
      console.warn(`[ApiKeyManager] Storage error/timeout deleting key for ${providerId}:`, err);
    }
  }

  public async getKeyStatus(providerId: string): Promise<ProviderKeyStatus> {
    const key = await this.getKey(providerId);
    const cached = this.validationCache.get(providerId);
    return {
      hasKey: Boolean(key && key.length > 0),
      isValidated: cached ? cached.isValidated : Boolean(key && key.length > 0),
      lastChecked: cached?.lastChecked,
    };
  }

  public clearMemoryCache(): void {
    this.memoryKeys.clear();
    this.validationCache.clear();
  }
}
