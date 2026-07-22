// Declare chrome for browser extension context
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;

export class ApiKeyManager {
  private static instance: ApiKeyManager | null = null;
  private readonly memoryKeys: Map<string, string> = new Map();

  public static getInstance(): ApiKeyManager {
    if (!ApiKeyManager.instance) {
      ApiKeyManager.instance = new ApiKeyManager();
    }
    return ApiKeyManager.instance;
  }

  public async setKey(providerId: string, apiKey: string): Promise<void> {
    const cleanKey = (apiKey || '').trim();
    this.memoryKeys.set(providerId, cleanKey);

    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await new Promise<void>((resolve) => {
          chrome.storage.local.set({ [`rapport_key_${providerId}`]: cleanKey }, () => resolve());
        });
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`rapport_key_${providerId}`, cleanKey);
      }
    } catch {
      // Storage unavailable, retained in memory
    }
  }

  public async getKey(providerId: string): Promise<string | null> {
    if (this.memoryKeys.has(providerId)) {
      return this.memoryKeys.get(providerId) || null;
    }

    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const result = await new Promise<Record<string, unknown>>((resolve) => {
          chrome.storage.local.get([`rapport_key_${providerId}`], (res: Record<string, unknown>) => resolve(res || {}));
        });
        const key = (result[`rapport_key_${providerId}`] as string) || null;
        if (key) this.memoryKeys.set(providerId, key);
        return key;
      } else if (typeof localStorage !== 'undefined') {
        const key = localStorage.getItem(`rapport_key_${providerId}`);
        if (key) this.memoryKeys.set(providerId, key);
        return key;
      }
    } catch {
      // Storage unavailable
    }

    return null;
  }

  public async deleteKey(providerId: string): Promise<void> {
    this.memoryKeys.delete(providerId);
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await new Promise<void>((resolve) => {
          chrome.storage.local.remove([`rapport_key_${providerId}`], () => resolve());
        });
      } else if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(`rapport_key_${providerId}`);
      }
    } catch {
      // Storage unavailable
    }
  }
}
