import { RelationshipProfile, withTimeout } from '@rapport/shared';

// Declare chrome for extension context
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;

export interface IRelationshipStorage {
  getProfile(contactId: string): Promise<RelationshipProfile | null>;
  saveProfile(profile: RelationshipProfile): Promise<void>;
  clear(): Promise<void>;
}

export class InMemoryRelationshipStorage implements IRelationshipStorage {
  private static instance: InMemoryRelationshipStorage | null = null;
  private readonly memoryStore: Map<string, RelationshipProfile> = new Map();

  public static getInstance(): InMemoryRelationshipStorage {
    if (!InMemoryRelationshipStorage.instance) {
      InMemoryRelationshipStorage.instance = new InMemoryRelationshipStorage();
    }
    return InMemoryRelationshipStorage.instance;
  }

  public async getProfile(contactId: string): Promise<RelationshipProfile | null> {
    if (!contactId) return null;
    return this.memoryStore.get(contactId) || null;
  }

  public async saveProfile(profile: RelationshipProfile): Promise<void> {
    if (!profile || !profile.contactId) return;
    this.memoryStore.set(profile.contactId, profile);
  }

  public async clear(): Promise<void> {
    this.memoryStore.clear();
  }
}

export class BrowserStorageRelationshipStorage implements IRelationshipStorage {
  private static instance: BrowserStorageRelationshipStorage | null = null;
  private static readonly STORAGE_KEY_PREFIX = 'rapport_relationship_profile_v2_';
  private readonly cachedProfiles: Map<string, RelationshipProfile> = new Map();

  public static getInstance(): BrowserStorageRelationshipStorage {
    if (!BrowserStorageRelationshipStorage.instance) {
      BrowserStorageRelationshipStorage.instance = new BrowserStorageRelationshipStorage();
    }
    return BrowserStorageRelationshipStorage.instance;
  }

  private getKey(contactId: string): string {
    return `${BrowserStorageRelationshipStorage.STORAGE_KEY_PREFIX}${contactId}`;
  }

  public async getProfile(contactId: string): Promise<RelationshipProfile | null> {
    if (!contactId) return null;
    if (this.cachedProfiles.has(contactId)) {
      return this.cachedProfiles.get(contactId) || null;
    }

    const key = this.getKey(contactId);
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const storagePromise = typeof chrome.storage.local.get === 'function'
          ? chrome.storage.local.get([key])
          : new Promise<Record<string, unknown>>((resolve) => {
              chrome.storage.local.get([key], (res: Record<string, unknown>) => resolve(res || {}));
            });
        const result = (await withTimeout(storagePromise, 2000, `BrowserStorageRelationshipStorage:get:${contactId}`)) as Record<string, unknown>;
        const raw = result?.[key];
        if (raw) {
          const profile = raw as RelationshipProfile;
          this.cachedProfiles.set(contactId, profile);
          return profile;
        }
      } else if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(key);
        if (raw) {
          const profile = JSON.parse(raw) as RelationshipProfile;
          this.cachedProfiles.set(contactId, profile);
          return profile;
        }
      }
    } catch (err) {
      console.warn(`[BrowserStorageRelationshipStorage] Error loading profile for ${contactId}:`, err);
    }
    return null;
  }

  public async saveProfile(profile: RelationshipProfile): Promise<void> {
    if (!profile || !profile.contactId) return;
    this.cachedProfiles.set(profile.contactId, profile);
    const key = this.getKey(profile.contactId);

    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const storagePromise = typeof chrome.storage.local.set === 'function'
          ? chrome.storage.local.set({ [key]: profile })
          : new Promise<void>((resolve) => {
              chrome.storage.local.set({ [key]: profile }, () => resolve());
            });
        await withTimeout(storagePromise, 2000, `BrowserStorageRelationshipStorage:save:${profile.contactId}`);
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(profile));
      }
    } catch (err) {
      console.warn(`[BrowserStorageRelationshipStorage] Error saving profile for ${profile.contactId}:`, err);
    }
  }

  public async clear(): Promise<void> {
    this.cachedProfiles.clear();
    try {
      if (typeof localStorage !== 'undefined') {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(BrowserStorageRelationshipStorage.STORAGE_KEY_PREFIX)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      }
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const local = chrome.storage.local;
        local.get(null, (items: Record<string, unknown>) => {
          const keys = Object.keys(items).filter((k) => k.startsWith(BrowserStorageRelationshipStorage.STORAGE_KEY_PREFIX));
          if (keys.length > 0) {
            local.remove(keys);
          }
        });
      }
    } catch (err) {
      console.warn('[BrowserStorageRelationshipStorage] Error clearing profiles:', err);
    }
  }
}
