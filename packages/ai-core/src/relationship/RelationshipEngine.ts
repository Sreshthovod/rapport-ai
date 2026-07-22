import {
  CanonicalMessage,
  RelationshipContext,
  RelationshipProfile,
} from '@rapport/shared';
import { RelationshipHeuristics } from './RelationshipHeuristics.js';
import {
  InMemoryRelationshipStorage,
  IRelationshipStorage,
} from './RelationshipStorage.js';

export class RelationshipEngine {
  private static instance: RelationshipEngine | null = null;
  private readonly storage: IRelationshipStorage;

  constructor(storage?: IRelationshipStorage) {
    this.storage = storage || InMemoryRelationshipStorage.getInstance();
  }

  public static getInstance(): RelationshipEngine {
    if (!RelationshipEngine.instance) {
      RelationshipEngine.instance = new RelationshipEngine();
    }
    return RelationshipEngine.instance;
  }

  public getRelationshipContextSync(params: {
    contactId: string;
    contactName?: string;
    messages: CanonicalMessage[];
  }): RelationshipContext {
    const { contactId, contactName = 'Contact', messages } = params;

    const context = RelationshipHeuristics.buildRelationshipContext({
      messages,
      profile: null,
    });

    // Update profile asynchronously in non-blocking background
    this.updateProfileAsync(contactId, contactName, messages, context).catch(() => {});

    return context;
  }

  public async getRelationshipContext(params: {
    contactId: string;
    contactName?: string;
    messages: CanonicalMessage[];
  }): Promise<RelationshipContext> {
    const { contactId, contactName = 'Contact', messages } = params;
    const existingProfile = await this.storage.getProfile(contactId);

    const context = RelationshipHeuristics.buildRelationshipContext({
      messages,
      profile: existingProfile,
    });

    await this.updateProfileAsync(contactId, contactName, messages, context);
    return context;
  }

  private async updateProfileAsync(
    contactId: string,
    contactName: string,
    messages: CanonicalMessage[],
    context: RelationshipContext
  ): Promise<void> {
    const existingProfile = await this.storage.getProfile(contactId);

    const avgLen = messages.length > 0
      ? Math.round(messages.reduce((sum, m) => sum + m.text.length, 0) / messages.length)
      : existingProfile?.averageMessageLength || 0;

    const updatedProfile: RelationshipProfile = {
      contactId,
      contactName,
      relationshipType: context.relationshipType,
      totalInteractions: (existingProfile?.totalInteractions || 0) + messages.length,
      firstSeenTimestamp: existingProfile?.firstSeenTimestamp || Date.now(),
      lastSeenTimestamp: Date.now(),
      averageMessageLength: avgLen,
      commonTopics: context.commonTopics,
      recurringPhrases: existingProfile?.recurringPhrases || [],
      preferredLanguage: existingProfile?.preferredLanguage || 'English',
      interactionScore: context.interactionScore,
    };

    await this.storage.saveProfile(updatedProfile);
  }
}
