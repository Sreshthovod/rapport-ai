import { MemoryRetriever } from '@rapport/memory';
import {
  AIPipelineInspector,
  ChatMessage,
  ConversationContext,
  StructuredAIContext,
} from '@rapport/shared';
import { DEBUG_AI_PIPELINE } from '../prompts/PromptComposer.js';
import { ConversationIntelligenceEngine } from '../intelligence/ConversationIntelligenceEngine.js';
import { RelationshipEngine } from '../relationship/RelationshipEngine.js';
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
    const contactName: string = rawContext?.contact?.contactName || 'Contact';

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

    // 8. Relationship Context Engine Evaluation
    const relationship = RelationshipEngine.getInstance().getRelationshipContextSync({
      contactId,
      contactName,
      messages: recentMessages,
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
      relationship,
    };
  }

  public static async processContextAsync(rawContext: ConversationContext): Promise<StructuredAIContext> {
    const inspector = AIPipelineInspector.getInstance();

    // Run synchronous pipeline stages
    const t0 = Date.now();
    const baseContext = ContextEngine.processContext(rawContext);

    if (DEBUG_AI_PIPELINE) {
      inspector.trace('ContextEngine:sync', {
        tone: baseContext.tone,
        stage: baseContext.stage,
        messageCount: baseContext.recentMessages.length,
        topic: baseContext.summary?.currentTopic,
      }, Date.now() - t0);
    }

    const contactId = rawContext?.contact?.id || 'unknown';

    // Resilient async memory retrieval — failure never blocks the AI request
    try {
      const t1 = Date.now();
      const memoryContext = await MemoryRetriever.getInstance().retrieveMemoryContext({
        contactId,
        currentTopic: baseContext.summary?.currentTopic,
        recentKeywords: baseContext.summary?.pendingQuestions || [],
      });

      if (DEBUG_AI_PIPELINE) {
        inspector.trace('MemoryRetriever', {
          totalEvaluated: memoryContext.retrievalMetadata.totalEvaluated,
          totalReturned: memoryContext.retrievalMetadata.totalReturned,
          relevantMemoryTitles: memoryContext.relevantMemories.map((m) => m.title),
        }, Date.now() - t1);
      }

      // Warn in dev if no memories were found for a known contact
      if (DEBUG_AI_PIPELINE && memoryContext.relevantMemories.length === 0 && contactId !== 'unknown') {
        console.debug(`[ContextEngine] ⚠️ No memories retrieved for contact "${contactId}". Memory store may be empty.`);
      }

      return { ...baseContext, memoryContext };
    } catch (err) {
      // Resilient fallback: memory failure must never break the AI request
      if (DEBUG_AI_PIPELINE) {
        console.warn('[ContextEngine] Memory retrieval failed — continuing without memory context:', err);
      }
      return baseContext;
    }
  }
}
