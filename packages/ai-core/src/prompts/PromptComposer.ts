import { MemoryContext } from '@rapport/memory';
import {
  CompiledPromptSpec,
  PromptConstraints,
  PromptGoal,
  StructuredAIContext,
} from '@rapport/shared';
import { MemoryPromptBudget } from './MemoryPromptBudget.js';
import { TemplateRegistry } from './TemplateRegistry.js';

export const DEBUG_AI_PIPELINE = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';

export class PromptComposer {
  public static readonly CURRENT_VERSION = 'v1.1.0';

  public static compose(params: {
    context: StructuredAIContext;
    goal?: PromptGoal;
    overrideConstraints?: Partial<PromptConstraints>;
  }): CompiledPromptSpec {
    const { context, goal: requestedGoal, overrideConstraints } = params;

    const goal: PromptGoal = requestedGoal || 'Reply Suggestions';
    const template = TemplateRegistry.getTemplate(goal);

    const constraints: PromptConstraints = {
      ...template.defaultConstraints,
      ...overrideConstraints,
    };

    // ----------------------------------------------------------------
    // 1. Extract all available context signals
    // ----------------------------------------------------------------

    const contactName = context.conversation?.latestMessage?.sender
      || context.recentMessages?.[0]?.sender
      || 'them';

    const conversationSummary = context.summary?.recentSummary || 'Recent thread snippet.';
    const latestMessages = context.recentMessages?.map((m) => `${m.sender}: ${m.text}`) || [];
    const detectedTone = context.tone || 'Friendly';
    const conversationStage = context.stage || 'Unknown';
    const currentTopic = context.summary?.currentTopic || 'General Conversation';
    const userIntent = context.summary?.userIntent || '';
    const suggestedGoal = context.intelligence?.suggestedGoal
      || context.summary?.suggestedGoal
      || 'General Alignment';

    // Relationship signals
    const relationshipType = context.relationship?.relationshipType || 'unknown';
    const preferredTone = context.relationship?.preferredTone || detectedTone;
    const communicationStyle = context.relationship?.communicationStyle;
    const engagementLevel = context.relationship?.engagementLevel || 'medium';
    const commonTopics = context.relationship?.commonTopics?.join(', ') || '';
    const interactionScore = context.relationship?.interactionScore ?? null;

    // Intelligence signals
    const detectedIntents = context.intelligence?.intents
      ?.map((i) => `${i.intent} (${Math.round(i.confidence * 100)}%)`)
      .join(', ') || '';
    const detectedTones = context.intelligence?.tones
      ?.map((t) => `${t.tone} (${Math.round(t.confidence * 100)}%)`)
      .join(', ') || '';
    const conversationHealth = context.intelligence?.health;
    const pendingItems = context.intelligence?.pendingItems;

    // Extracted facts from current conversation
    const extractedFacts = context.extractedFacts || [];

    // Budget long-term memories
    const memoryContext = context.memoryContext as MemoryContext | undefined;
    const budgetedMemory = MemoryPromptBudget.budgetMemories(memoryContext);

    // ----------------------------------------------------------------
    // 2. Dev-Mode Completeness Validation
    // ----------------------------------------------------------------
    if (DEBUG_AI_PIPELINE) {
      if (budgetedMemory.selectedMemories.length > 0) {
        console.debug('[PromptComposer] Selected Memories:', budgetedMemory.selectedMemories.map((m) => m.title));
        console.debug('[PromptComposer] Discarded Memories:', budgetedMemory.discardedMemories.map((m) => m.title));
        console.debug(`[PromptComposer] Memory Chars: ${budgetedMemory.charCountBefore} -> ${budgetedMemory.charCountAfter}`);
      }
      if (!context.intelligence) {
        console.warn('[PromptComposer] ⚠️ Missing: ConversationIntelligence — context.intelligence is undefined.');
      }
      if (!context.relationship) {
        console.warn('[PromptComposer] ⚠️ Missing: RelationshipContext — context.relationship is undefined.');
      }
      if (!context.memoryContext) {
        console.warn('[PromptComposer] ⚠️ Missing: MemoryContext — context.memoryContext is undefined. Ensure processContextAsync() was used.');
      }
      if (!context.summary?.currentTopic) {
        console.warn('[PromptComposer] ⚠️ Missing: currentTopic in context.summary — topic detection may have failed.');
      }
    }

    // ----------------------------------------------------------------
    // 3. Build the System Prompt — all relationship + style signals
    // ----------------------------------------------------------------

    const styleSection = communicationStyle
      ? `COMMUNICATION STYLE: ${communicationStyle.formality} | ${communicationStyle.playfulness} | ${communicationStyle.expressiveness}`
      : '';

    const memorySection = budgetedMemory.promptSection
      ? `\n${budgetedMemory.promptSection}\n`
      : '';

    const commonTopicsSection = commonTopics
      ? `COMMON TOPICS WITH THIS PERSON: ${commonTopics}`
      : '';

    const engagementSection = interactionScore !== null
      ? `RELATIONSHIP ENGAGEMENT: ${engagementLevel} (score: ${interactionScore}/100)`
      : `RELATIONSHIP ENGAGEMENT: ${engagementLevel}`;

    const systemPrompt = [
      `You are Rapport AI (version ${PromptComposer.CURRENT_VERSION}), a world-class conversation copilot.`,
      `GOAL: ${goal}`,
      `DIRECTIVE: ${template.systemDirective}`,
      ``,
      `=== RELATIONSHIP CONTEXT ===`,
      `CONTACT NAME: ${contactName}`,
      `RELATIONSHIP TYPE: ${relationshipType.toUpperCase()}`,
      `PREFERRED TONE: ${preferredTone}`,
      styleSection,
      engagementSection,
      commonTopicsSection,
      memorySection,
      `=== CONVERSATION CONTEXT ===`,
      `DETECTED TONE: ${detectedTone}`,
      `CONVERSATION STAGE: ${conversationStage}`,
      `CURRENT TOPIC: ${currentTopic}`,
      detectedTones ? `DETECTED TONES: ${detectedTones}` : '',
      ``,
      `=== OUTPUT CONSTRAINTS ===`,
      `- Never sound robotic: ${constraints.neverSoundRobotic}`,
      `- Avoid repetition: ${constraints.avoidRepetition}`,
      `- Match relationship tone: ${constraints.matchRelationshipTone}`,
      `- Preserve user style: ${constraints.preserveUserStyle}`,
      `- Response length: ${constraints.responseLength}`,
      `- Allow emojis: ${constraints.allowEmojis}`,
    ]
      .filter((line) => line !== '')
      .join('\n')
      .trim();

    // ----------------------------------------------------------------
    // 4. Build the User Prompt — all current conversation signals
    // ----------------------------------------------------------------

    // Format pending items that need to be addressed
    const pendingLines: string[] = [];
    if (pendingItems) {
      if (pendingItems.questionsAwaitingReply.length > 0) {
        pendingLines.push(`UNANSWERED QUESTIONS:\n${pendingItems.questionsAwaitingReply.map((q) => `  - "${q}"`).join('\n')}`);
      }
      if (pendingItems.unconfirmedPlans.length > 0) {
        pendingLines.push(`UNCONFIRMED PLANS:\n${pendingItems.unconfirmedPlans.map((p) => `  - "${p}"`).join('\n')}`);
      }
      if (pendingItems.datesMentioned.length > 0) {
        pendingLines.push(`DATES/TIMES MENTIONED: ${pendingItems.datesMentioned.join(', ')}`);
      }
      if (pendingItems.promises.length > 0) {
        pendingLines.push(`YOUR PENDING PROMISES:\n${pendingItems.promises.map((p) => `  - "${p}"`).join('\n')}`);
      }
      if (pendingItems.tasks.length > 0) {
        pendingLines.push(`TASKS REQUESTED:\n${pendingItems.tasks.map((t) => `  - "${t}"`).join('\n')}`);
      }
    }

    // Format extracted facts from the current conversation
    const factsLines = extractedFacts.length > 0
      ? `FACTS FROM THIS CONVERSATION:\n${extractedFacts.map((f) => `  - ${f.fact}`).join('\n')}`
      : '';

    const healthSection = conversationHealth
      ? `CONVERSATION HEALTH: ${conversationHealth.balanceStatus} | ${conversationHealth.engagementLevel} | ${conversationHealth.replyPace}`
      : '';

    const intentSection = detectedIntents
      ? `DETECTED INTENTS: ${detectedIntents}`
      : '';

    const intentGoalSection = userIntent
      ? `USER INTENT: ${userIntent}`
      : '';

    const userPrompt = [
      `CONVERSATION SUMMARY: ${conversationSummary}`,
      ``,
      `LATEST MESSAGES:`,
      ...latestMessages.map((m) => `  ${m}`),
      ``,
      intentSection,
      intentGoalSection,
      `SUGGESTED REPLY GOAL: ${suggestedGoal}`,
      healthSection,
      factsLines,
      ...pendingLines,
    ]
      .filter((line) => line !== '')
      .join('\n')
      .trim();

    // ----------------------------------------------------------------
    // 5. Assemble the compiled spec
    // ----------------------------------------------------------------

    const variants = [
      {
        variant: 'Safe' as const,
        description: 'Polite, low-risk, agreeable response ensuring safe rapport.',
        instruction: 'Generate a standard, polite reply that maintains positive connection.',
      },
      {
        variant: 'Balanced' as const,
        description: 'Naturally engaging response balancing warmth and directness.',
        instruction: 'Generate a conversational reply that moves the dialogue forward.',
      },
      {
        variant: 'Creative' as const,
        description: 'Witty, intriguing, or charismatic response.',
        instruction: 'Generate a creative reply with personality or light humor.',
      },
    ];

    return {
      version: PromptComposer.CURRENT_VERSION,
      goal,
      systemPrompt,
      userPrompt,
      variants,
      constraints,
      contextSnapshot: {
        conversationSummary,
        latestMessages,
        detectedTone,
        suggestedGoal,
        relationshipType,
      },
    };
  }
}
