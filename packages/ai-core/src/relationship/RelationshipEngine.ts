import {
  CanonicalMessage,
  RelationshipContext,
  RelationshipProfile,
} from '@rapport/shared';
import { RelationshipHeuristics } from './RelationshipHeuristics.js';
import {
  BrowserStorageRelationshipStorage,
  IRelationshipStorage,
} from './RelationshipStorage.js';

import { LanguageDetector } from '../context/LanguageDetector.js';

const EMOJI_RE = /(?:[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD00-\uDDFF])/g;

export class RelationshipEngine {
  private static instance: RelationshipEngine | null = null;
  private readonly storage: IRelationshipStorage;

  constructor(storage?: IRelationshipStorage) {
    this.storage = storage || BrowserStorageRelationshipStorage.getInstance();
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

    const totalInteractions = (existingProfile?.totalInteractions || 0) + messages.length;
    const firstSeenTimestamp = existingProfile?.firstSeenTimestamp || Date.now();

    const avgLen = messages.length > 0
      ? Math.round(messages.reduce((sum, m) => sum + m.text.length, 0) / messages.length)
      : existingProfile?.averageMessageLength || 0;

    // 1. Emoji Usage Heuristic
    let emojiUsage: 'frequent' | 'rare' | 'none' = existingProfile?.emojiUsage || 'none';
    if (messages.length > 0) {
      const emojiCount = messages.reduce((sum, m) => sum + (m.text.match(EMOJI_RE) || []).length, 0);
      const emojiRatio = emojiCount / messages.length;
      emojiUsage = emojiRatio >= 0.5 ? 'frequent' : emojiRatio > 0.05 ? 'rare' : 'none';
    }

    // 2. Conversation Depth (0-100 score)
    const baseLenScore = Math.min(45, Math.round(avgLen * 0.6));
    const interactionScoreContribution = Math.min(45, Math.round(context.interactionScore * 0.5));
    const conversationDepth = Math.min(100, Math.max(10, baseLenScore + interactionScoreContribution + 10));

    // 3. Communication Frequency (messages per day)
    const daysActive = Math.max(1, (Date.now() - firstSeenTimestamp) / (1000 * 60 * 60 * 24));
    const messagesPerDay = Math.round(totalInteractions / daysActive);

    // 4. Preferred Language
    let preferredLanguage = existingProfile?.preferredLanguage || 'English';
    if (messages.length > 0) {
      preferredLanguage = LanguageDetector.detectLanguage(messages, '');
    }

    const updatedProfile: RelationshipProfile = {
      contactId,
      contactName,
      relationshipType: context.relationshipType,
      totalInteractions,
      firstSeenTimestamp,
      lastSeenTimestamp: Date.now(),
      averageMessageLength: avgLen,
      commonTopics: context.commonTopics,
      recurringPhrases: existingProfile?.recurringPhrases || [],
      preferredLanguage,
      interactionScore: context.interactionScore,
      emojiUsage,
      conversationDepth,
      messagesPerDay,
    };

    await this.storage.saveProfile(updatedProfile);
  }
}
