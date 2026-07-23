import { CopilotDecision, StructuredAIContext } from '@rapport/shared';
import { CopilotCache } from './CopilotCache.js';
import { CopilotHeuristics } from './CopilotHeuristics.js';

export class CopilotEngine {
  private static instance: CopilotEngine | null = null;
  private readonly cache = CopilotCache.getInstance();

  public static getInstance(): CopilotEngine {
    if (!CopilotEngine.instance) {
      CopilotEngine.instance = new CopilotEngine();
    }
    return CopilotEngine.instance;
  }

  public evaluateCopilot(context: StructuredAIContext, contactId: string = 'unknown'): CopilotDecision {
    const msgCount = context.recentMessages?.length || 0;
    const latestTimestamp = msgCount > 0 ? context.recentMessages[msgCount - 1].timestamp : 0;
    const cacheKey = `${contactId}_${msgCount}_${latestTimestamp}`;

    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const allRecommendations = CopilotHeuristics.evaluateRecommendations(context);
    const primaryRecommendation = allRecommendations.length > 0 ? allRecommendations[0] : null;

    const decision: CopilotDecision = {
      timestamp: Date.now(),
      shouldAssist: primaryRecommendation !== null,
      primaryRecommendation,
      allRecommendations,
    };

    this.cache.set(cacheKey, decision);
    return decision;
  }
}
