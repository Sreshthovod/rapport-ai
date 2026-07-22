import {
  ChatMessage,
  ConversationContext,
  StructuredAIContext,
} from '@rapport/shared';
import { ConversationIntelligenceEngine } from '../intelligence/ConversationIntelligenceEngine.js';
import { ConversationModelBuilder } from './ConversationModelBuilder.js';
import { ImportantFactExtractor } from './FactExtractor.js';
import { MessageNormalizer } from './Normalizer.js';
import { ConversationStageAnalyzer } from './StageAnalyzer.js';
import { ContextSummaryGenerator } from './SummaryGenerator.js';
import { HeuristicToneDetector } from './ToneDetector.js';

export class ContextEngine {
  public static processContext(rawContext: ConversationContext): StructuredAIContext {
    const rawMessages: ChatMessage[] = rawContext?.recentMessages || [];
    const draftText: string = rawContext?.draft || '';
    const contactId: string = rawContext?.contact?.id || 'unknown';

    // 1. Normalization
    const recentMessages = MessageNormalizer.normalizeMessages(rawMessages);

    // 2. Conversation Timeline & Model
    const conversation = ConversationModelBuilder.buildModel(recentMessages);

    // 3. Tone Detection
    const tone = HeuristicToneDetector.detectTone(recentMessages, draftText);

    // 4. Conversation Stage Inferencing
    const stage = ConversationStageAnalyzer.inferStage(recentMessages, draftText);

    // 5. Important Fact Extraction
    const extractedFacts = ImportantFactExtractor.extractFacts(recentMessages);

    // 6. Context Summary Generation
    const summary = ContextSummaryGenerator.generateSummary({
      messages: recentMessages,
      tone,
      stage,
      facts: extractedFacts,
      draftText,
    });

    const pendingQuestions = summary.pendingQuestions;

    // 7. Conversation Intelligence Engine Analysis
    const intelligence = ConversationIntelligenceEngine.analyze({
      messages: recentMessages,
      contactId,
      draftText,
    });

    return {
      conversation,
      summary,
      tone,
      stage,
      recentMessages,
      extractedFacts,
      pendingQuestions,
      intelligence,
    };
  }
}
