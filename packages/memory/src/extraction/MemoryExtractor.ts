import { ConversationIntelligence, RelationshipContext, StructuredAIContext } from '@rapport/shared';
import { MemoryCandidate } from '../types/MemoryTypes.js';
import { ExtractionRules } from './ExtractionRules.js';

export class MemoryExtractor {
  private static instance: MemoryExtractor | null = null;

  public static getInstance(): MemoryExtractor {
    if (!MemoryExtractor.instance) {
      MemoryExtractor.instance = new MemoryExtractor();
    }
    return MemoryExtractor.instance;
  }

  public extractCandidates(params: {
    context: StructuredAIContext;
    intelligence?: ConversationIntelligence;
    relationship?: RelationshipContext;
  }): MemoryCandidate[] {
    const { context } = params;
    const messages = context.recentMessages || [];

    // Extract candidates via heuristic rules
    const candidates = ExtractionRules.extractFromMessages(messages);

    return candidates;
  }
}
