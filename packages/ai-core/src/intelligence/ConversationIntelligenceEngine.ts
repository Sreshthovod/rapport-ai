import { CanonicalMessage, ConversationIntelligence } from '@rapport/shared';
import { ConversationAnalyzer } from './ConversationAnalyzer.js';
import { HealthAnalyzer } from './HealthAnalyzer.js';
import { IntelligenceCache } from './IntelligenceCache.js';
import { IntelligenceV2Analyzer } from './IntelligenceV2Analyzer.js';
import { IntentAnalyzer } from './IntentAnalyzer.js';
import { MultiToneAnalyzer } from './MultiToneAnalyzer.js';
import { ObjectiveRecommender } from './ObjectiveRecommender.js';
import { PendingContextAnalyzer } from './PendingContextAnalyzer.js';
import { ReplyTargetResolver } from '../context/ReplyTargetResolver.js';

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

    // 6. Intelligence v2 Inferences
    const replyTarget = ReplyTargetResolver.resolve(messages);
    const stage = IntelligenceV2Analyzer.analyzeStage(messages, analysis.topic);
    const latestIntent = IntelligenceV2Analyzer.analyzeLatestIntent(replyTarget, messages[messages.length - 1]);
    const primaryEmotion = IntelligenceV2Analyzer.analyzeEmotion(messages);
    const urgency = IntelligenceV2Analyzer.analyzeUrgency(messages);
    const inferredRelationship = IntelligenceV2Analyzer.inferRelationship(messages);
    const styleMetrics = IntelligenceV2Analyzer.analyzeStyle(messages);
    const expectedReplyLength = styleMetrics.avgLength;
    const suggestedStrategy = IntelligenceV2Analyzer.recommendStrategy({
      stage,
      latestIntent,
      emotion: primaryEmotion,
    });

    const previousTopic = IntelligenceV2Analyzer.analyzePreviousTopic(messages, analysis.topic);
    const conversationGoal = IntelligenceV2Analyzer.analyzeGoal(analysis.topic, stage);
    const sentiment = IntelligenceV2Analyzer.analyzeSentiment(messages);
    const energyLevel = IntelligenceV2Analyzer.analyzeEnergyLevel(messages);
    const dominantParticipant = IntelligenceV2Analyzer.analyzeDominantParticipant(messages);
    const speakingBalance = IntelligenceV2Analyzer.analyzeSpeakingBalance(messages);
    const conversationHealthScore = IntelligenceV2Analyzer.analyzeConversationHealthScore(messages, health, sentiment);
    const emotions = IntelligenceV2Analyzer.analyzeDetailedEmotions(messages);
    const timelineEvents = IntelligenceV2Analyzer.analyzeTimelineEvents(messages);

    const replyStrategy = IntelligenceV2Analyzer.analyzeReplyStrategy(messages, {
      stage,
      latestIntent,
      primaryEmotion,
      urgency,
      styleMetrics,
      health,
    });

    // 7. Recommended AI Objective Goal
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
      previousTopic,
      conversationGoal,
      emotionalState: emotions[0]?.tone || 'Neutral',
      energyLevel,
      sentiment,
      dominantParticipant,
      speakingBalance,
      conversationHealthScore,
      stage,
      latestIntent,
      primaryEmotion,
      urgency,
      expectedReplyLength,
      inferredRelationship,
      styleMetrics,
      suggestedStrategy,
      tones,
      intents,
      health,
      pendingItems,
      suggestedGoal,
      confidenceScores,
      emotions,
      replyStrategy,
      timelineEvents,
    };

    ConversationIntelligenceEngine.cache.set(cacheKey, intelligence);
    return intelligence;
  }
}
