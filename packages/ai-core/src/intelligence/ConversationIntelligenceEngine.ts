import { CanonicalMessage, ConversationIntelligence } from '@rapport/shared';
import { ConversationAnalyzer } from './ConversationAnalyzer.js';
import { HealthAnalyzer } from './HealthAnalyzer.js';
import { IntelligenceCache } from './IntelligenceCache.js';
import { IntentAnalyzer } from './IntentAnalyzer.js';
import { MultiToneAnalyzer } from './MultiToneAnalyzer.js';
import { ObjectiveRecommender } from './ObjectiveRecommender.js';
import { PendingContextAnalyzer } from './PendingContextAnalyzer.js';

export class ConversationIntelligenceEngine {
  private static cache = IntelligenceCache.getInstance();

  public static analyze(params: {
    messages: CanonicalMessage[];
    contactId?: string;
    draftText?: string;
  }): ConversationIntelligence {
    const { messages, contactId = 'unknown', draftText = '' } = params;

    // Build cache key based on state
    const latestTimestamp = messages.length > 0 ? messages[messages.length - 1].timestamp : 0;
    const cacheKey = `${contactId}_${messages.length}_${latestTimestamp}_${draftText.slice(0, 10)}`;

    const cached = ConversationIntelligenceEngine.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 1. Basic Analysis
    const analysis = ConversationAnalyzer.analyze(messages);

    // 2. Multi-Tone Analysis
    const tones = MultiToneAnalyzer.analyzeTones(messages, draftText);

    // 3. Intent Analysis
    const intents = IntentAnalyzer.analyzeIntents(messages, draftText);

    // 4. Conversation Health Scoring
    const health = HealthAnalyzer.analyzeHealth(messages);

    // 5. Pending Context Items
    const pendingItems = PendingContextAnalyzer.analyzePendingItems(messages);

    // 6. Recommended AI Objective Goal
    const suggestedGoal = ObjectiveRecommender.recommendGoal({
      tones,
      intents,
      pendingItems,
    });

    const confidenceScores: Record<string, number> = {
      toneConfidence: tones[0]?.confidence || 0.8,
      intentConfidence: intents[0]?.confidence || 0.8,
      healthBalanceScore: health.balanceScore,
    };

    const intelligence: ConversationIntelligence = {
      topic: analysis.topic,
      tones,
      intents,
      health,
      pendingItems,
      suggestedGoal,
      confidenceScores,
    };

    ConversationIntelligenceEngine.cache.set(cacheKey, intelligence);
    return intelligence;
  }
}
