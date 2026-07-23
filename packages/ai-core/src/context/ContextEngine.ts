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
import { LanguageDetector } from './LanguageDetector.js';
import { ReplyTargetResolver } from './ReplyTargetResolver.js';

export class ContextEngine {
  public static processContext(rawContext: ConversationContext): StructuredAIContext {
    const inspector = (typeof AIPipelineInspector !== 'undefined' && AIPipelineInspector && typeof AIPipelineInspector.getInstance === 'function')
      ? AIPipelineInspector.getInstance()
      : null;
    
    // [1] Conversation Parsed
    inspector?.startStage('[1] Conversation Parsed');
    const rawMessages: ChatMessage[] = rawContext?.recentMessages || [];
    const draftText: string = rawContext?.draft || '';
    const contactId: string = rawContext?.contact?.id || 'unknown';
    const contactName: string = rawContext?.contact?.contactName || 'Contact';

    const recentMessages = MessageNormalizer.normalizeMessages(rawMessages);
    const conversation = ConversationModelBuilder.buildModel(recentMessages);
    const tone = HeuristicToneDetector.detectTone(recentMessages, draftText);
    const stage = ConversationStageAnalyzer.inferStage(recentMessages, draftText);
    const language = LanguageDetector.detectLanguage(recentMessages, draftText);
    const replyTarget = ReplyTargetResolver.resolve(recentMessages);
    const extractedFacts = ImportantFactExtractor.extractFacts(recentMessages);
    const summary = ContextSummaryGenerator.generateSummary({
      messages: recentMessages,
      tone,
      stage,
      facts: extractedFacts,
      draftText,
    });
    const pendingQuestions = summary.pendingQuestions;
    inspector?.endStage('[1] Conversation Parsed', { messageCount: recentMessages.length });

    // [2] Conversation Intelligence
    inspector?.startStage('[2] Conversation Intelligence');
    const intelligence = ConversationIntelligenceEngine.analyze({
      messages: recentMessages,
      contactId,
      draftText,
    });
    inspector?.endStage('[2] Conversation Intelligence', { intentCount: intelligence.intents?.length || 0 });

    // [3] Relationship Context
    inspector?.startStage('[3] Relationship Context');
    const relationship = RelationshipEngine.getInstance().getRelationshipContextSync({
      contactId,
      contactName,
      messages: recentMessages,
    });
    inspector?.endStage('[3] Relationship Context', { relationshipType: relationship.relationshipType });

    return {
      conversation,
      summary,
      tone,
      stage,
      language,
      replyTarget,
      recentMessages,
      extractedFacts,
      pendingQuestions,
      intelligence,
      relationship,
    };
  }

  public static async processContextAsync(rawContext: ConversationContext): Promise<StructuredAIContext> {
    const inspector = (typeof AIPipelineInspector !== 'undefined' && AIPipelineInspector && typeof AIPipelineInspector.getInstance === 'function')
      ? AIPipelineInspector.getInstance()
      : null;

    const baseContext = ContextEngine.processContext(rawContext);
    const contactId = rawContext?.contact?.id || 'unknown';

    // [4] Memory Retrieval with 3-second resilient timeout limit
    inspector?.startStage('[4] Memory Retrieval');
    try {
      const memoryPromise = MemoryRetriever.getInstance().retrieveMemoryContext({
        contactId,
        currentTopic: baseContext.summary?.currentTopic,
        recentKeywords: baseContext.summary?.pendingQuestions || [],
      });

      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Memory retrieval 3-second timeout limit exceeded')), 3000);
      });

      const memoryContext = await Promise.race([memoryPromise, timeoutPromise]);
      if (timer) clearTimeout(timer);
      inspector?.endStage('[4] Memory Retrieval', { returnedCount: memoryContext.relevantMemories.length });
      return { ...baseContext, memoryContext };
    } catch (err) {
      inspector?.endStage('[4] Memory Retrieval', { error: err instanceof Error ? err.message : String(err) }, true);
      console.warn('[ContextEngine] Memory retrieval failed/timed out — continuing with base context:', err);
      return baseContext;
    }
  }
}
