import { withTimeout, WritingStyleProfile } from '@rapport/shared';

// Declare chrome for extension context
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;

export class WritingStyleStore {
  private static readonly STORAGE_KEY = 'rapport_style_profile_v1';
  private static cachedProfile: WritingStyleProfile | null = null;

  public static async getProfile(): Promise<WritingStyleProfile | null> {
    if (WritingStyleStore.cachedProfile) {
      return WritingStyleStore.cachedProfile;
    }

    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const storagePromise = typeof chrome.storage.local.get === 'function'
          ? chrome.storage.local.get([WritingStyleStore.STORAGE_KEY])
          : new Promise<Record<string, unknown>>((resolve) => {
              chrome.storage.local.get([WritingStyleStore.STORAGE_KEY], (res: Record<string, unknown>) => resolve(res || {}));
            });
        const result = (await withTimeout(storagePromise, 2000, 'WritingStyleStore:getProfile')) as Record<string, unknown>;
        const raw = result?.[WritingStyleStore.STORAGE_KEY];
        if (raw) {
          WritingStyleStore.cachedProfile = raw as WritingStyleProfile;
          return WritingStyleStore.cachedProfile;
        }
      } else if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(WritingStyleStore.STORAGE_KEY);
        if (raw) {
          WritingStyleStore.cachedProfile = JSON.parse(raw) as WritingStyleProfile;
          return WritingStyleStore.cachedProfile;
        }
      }
    } catch (err) {
      console.warn('[WritingStyleStore] Error loading writing style profile:', err);
    }
    return null;
  }

  public static async saveProfile(profile: WritingStyleProfile): Promise<void> {
    WritingStyleStore.cachedProfile = profile;
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const storagePromise = typeof chrome.storage.local.set === 'function'
          ? chrome.storage.local.set({ [WritingStyleStore.STORAGE_KEY]: profile })
          : new Promise<void>((resolve) => {
              chrome.storage.local.set({ [WritingStyleStore.STORAGE_KEY]: profile }, () => resolve());
            });
        await withTimeout(storagePromise, 2000, 'WritingStyleStore:saveProfile');
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(WritingStyleStore.STORAGE_KEY, JSON.stringify(profile));
      }
    } catch (err) {
      console.warn('[WritingStyleStore] Error saving writing style profile:', err);
    }
  }

  public static async resetProfile(): Promise<void> {
    WritingStyleStore.cachedProfile = null;
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const storagePromise = typeof chrome.storage.local.remove === 'function'
          ? chrome.storage.local.remove(WritingStyleStore.STORAGE_KEY)
          : new Promise<void>((resolve) => {
              chrome.storage.local.remove(WritingStyleStore.STORAGE_KEY, () => resolve());
            });
        await withTimeout(storagePromise, 2000, 'WritingStyleStore:resetProfile');
      } else if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(WritingStyleStore.STORAGE_KEY);
      }
    } catch (err) {
      console.warn('[WritingStyleStore] Error resetting writing style profile:', err);
    }
  }
}
