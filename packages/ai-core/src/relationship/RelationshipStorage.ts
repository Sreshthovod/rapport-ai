import { RelationshipProfile } from '@rapport/shared';

export interface IRelationshipStorage {
  getProfile(contactId: string): Promise<RelationshipProfile | null>;
  saveProfile(profile: RelationshipProfile): Promise<void>;
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
}
