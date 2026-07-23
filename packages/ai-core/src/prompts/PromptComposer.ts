import { MemoryContext } from '@rapport/memory';
import {
  AIPipelineInspector,
  CompiledPromptSpec,
  PromptConstraints,
  PromptGoal,
  StructuredAIContext,
} from '@rapport/shared';
import { MemoryPromptBudget } from './MemoryPromptBudget.js';
import { TemplateRegistry } from './TemplateRegistry.js';
import { SettingsManager } from '../services/SettingsManager.js';
import { ReplyTargetResolver } from '../context/ReplyTargetResolver.js';
import { WritingStyleEngine } from '../style/WritingStyleEngine.js';

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
      ...TemplateRegistry.getTemplate(goal).defaultConstraints,
      ...overrideConstraints,
    };

    const inspector = (typeof AIPipelineInspector !== 'undefined' && AIPipelineInspector && typeof AIPipelineInspector.getInstance === 'function')
      ? AIPipelineInspector.getInstance()
      : null;
    inspector?.startStage('[5] Prompt Builder');

    const spec = ((): CompiledPromptSpec => {
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
      // 2. Resolve Prompt Template
      // ----------------------------------------------------------------

      const template = TemplateRegistry.getTemplate(goal);

      // ----------------------------------------------------------------
      // 3. Build the System Prompt — all relationship + style signals
      // ----------------------------------------------------------------

      const settings = SettingsManager.getInstance().getSettings();
      const activeLanguage = context.language || (settings.language && settings.language !== 'auto' ? settings.language : 'English');
      const modeInstruction = PromptComposer.getConversationModeInstruction(settings.conversationMode || 'natural');
      const personalityInstruction = PromptComposer.getPersonalityInstruction(settings.suggestionPersonality || 'balanced');

      // Learn writing style integration
      let styleInstruction = PromptComposer.getWritingStyleInstruction(settings.writingStyle || 'usual');
      let learnedStyleSection = '';
      if (
        (settings.writingStyle === 'usual' || !settings.writingStyle) &&
        context.writingStyleProfile &&
        context.writingStyleProfile.samplesAnalyzed >= 10
      ) {
        const desc = WritingStyleEngine.getInstance().toPromptDescriptor(context.writingStyleProfile);
        learnedStyleSection = [
          `=== LEARNED USER WRITING STYLE (BASED ON ${context.writingStyleProfile.samplesAnalyzed} OUTGOING MESSAGES) ===`,
          `MESSAGE LENGTH: ${desc.lengthGuidance}`,
          `EMOJI USAGE: ${desc.emojiGuidance}`,
          `FORMALITY: ${desc.formalityGuidance}`,
          `SLANG: ${desc.slangGuidance}`,
          `LANGUAGE MIX: ${desc.hinglishGuidance}`,
          `CAPITALIZATION: ${desc.capitalizationGuidance}`,
          `PUNCTUATION: ${desc.punctuationGuidance}`,
          desc.greetingExample !== 'none' ? `COMMON GREETINGS: ${desc.greetingExample}` : '',
          desc.closingExample !== 'none' ? `COMMON CLOSINGS: ${desc.closingExample}` : '',
          desc.commonPhrasesStr !== 'none' ? `COMMON WORDS/PHRASES: ${desc.commonPhrasesStr}` : '',
          `MANDATORY RULE: Closely mimic these exact user writing traits in all 3 suggested replies.`,
        ].filter(Boolean).join('\n');

        styleInstruction = `Learned writing style profile (attached below)`;
      }

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

      const intel = context.intelligence;
      const inferredRelationship = intel?.inferredRelationship || relationshipType;
      const stage = intel?.stage || conversationStage;
      const latestIntent = intel?.latestIntent || 'Information';
      const primaryEmotion = intel?.primaryEmotion || 'Neutral';
      const urgency = intel?.urgency || 'medium';
      const expectedReplyLength = intel?.expectedReplyLength || 'medium';
      const suggestedStrategy = intel?.suggestedStrategy || 'Continue topic';
      const styleMetrics = intel?.styleMetrics;

      const relEmoji = context.relationship?.emojiUsage || 'none';
      const relDepth = context.relationship?.conversationDepth || 40;
      const relFreq = context.relationship?.messagesPerDay || 0;
      const relLang = context.relationship?.preferredLanguage || 'English';

      const previousTopic = intel?.previousTopic || 'None';
      const conversationGoal = intel?.conversationGoal || 'Maintain casual bonding';
      const emotionalState = intel?.emotionalState || 'Neutral';
      const energyLevel = intel?.energyLevel || 'medium';
      const sentiment = intel?.sentiment || 'neutral';
      const dominantParticipant = intel?.dominantParticipant || 'Equal';
      const speakingBalance = intel?.speakingBalance || 'Me: 50%, Other: 50%';
      const conversationHealthScore = intel?.conversationHealthScore ?? 100;
      
      const stratReplyNow = intel?.replyStrategy?.shouldReplyNow ? 'Yes' : 'No';
      const stratAskQ = intel?.replyStrategy?.shouldAskQuestion ? 'Yes' : 'No';
      const stratReassure = intel?.replyStrategy?.shouldReassure ? 'Yes' : 'No';
      const stratChangeTopic = intel?.replyStrategy?.shouldChangeTopic ? 'Yes' : 'No';
      const stratConcise = intel?.replyStrategy?.shouldBeConcise ? 'Yes' : 'No';
      const stratAvoid = (intel?.replyStrategy?.subjectsToAvoid || []).join(', ') || 'None';

      const timelineEventsText = (intel?.timelineEvents || []).map((e) => `- [${e.type.toUpperCase()}] ${e.description}`).join('\n') || 'None';

      const systemPrompt = [
        `You are Rapport AI (version ${PromptComposer.CURRENT_VERSION}), a world-class conversation copilot.`,
        `GOAL: ${goal}`,
        `DIRECTIVE: ${template.systemDirective}`,
        ``,
        `=== LANGUAGE & COMMUNICATION STYLE DIRECTIVE ===`,
        `CONVERSATION LANGUAGE: ${activeLanguage}`,
        styleMetrics ? `COMMUNICATION STYLE: Formality (${styleMetrics.formality}), Avg Length (${styleMetrics.avgLength}), Emojis (${styleMetrics.emojiUsage})` : '',
        `MANDATORY: Generate all suggested replies in ${activeLanguage}. Match the exact language and communication style used in the recent messages.`,
        ``,
        `=== USER PREFERENCES & STRATEGY ===`,
        `CONVERSATION MODE PRESET: ${modeInstruction}`,
        `WRITING STYLE PRESET: ${styleInstruction}`,
        `PERSONALITY STANCE: ${personalityInstruction}`,
        `RECOMMENDED REPLY STRATEGY: ${suggestedStrategy}`,
        ``,
        learnedStyleSection,
        ``,
        `=== RELATIONSHIP & CONTACT INTELLIGENCE ===`,
        `CONTACT NAME: ${contactName}`,
        `INFERRED RELATIONSHIP: ${String(inferredRelationship).toUpperCase()}`,
        `PREFERRED TONE: ${preferredTone}`,
        `PREFERRED LANGUAGE: ${relLang}`,
        `COMMUNICATION FREQUENCY: ${relFreq > 0 ? `${relFreq} messages/day` : 'Moderate'}`,
        `EMOJI USAGE: ${relEmoji}`,
        `CONVERSATION DEPTH SCORE: ${relDepth}/100`,
        styleSection,
        engagementSection,
        commonTopicsSection,
        memorySection,
        `=== CONVERSATION INTELLIGENCE v2 ===`,
        `CONVERSATION STAGE: ${stage}`,
        `CURRENT TOPIC: ${currentTopic}`,
        `PREVIOUS TOPIC: ${previousTopic}`,
        `CONVERSATION GOAL: ${conversationGoal}`,
        `LATEST INCOMING INTENT: ${latestIntent}`,
        `PRIMARY EMOTION: ${primaryEmotion} (Overall mood: ${emotionalState})`,
        `ENERGY LEVEL: ${energyLevel.toUpperCase()}`,
        `SENTIMENT: ${sentiment.toUpperCase()}`,
        `DOMINANT PARTICIPANT: ${dominantParticipant}`,
        `SPEAKING BALANCE: ${speakingBalance}`,
        `CONVERSATION HEALTH SCORE: ${conversationHealthScore}/100`,
        `URGENCY: ${urgency}`,
        `EXPECTED REPLY LENGTH: ${expectedReplyLength}`,
        detectedTones ? `DETECTED TONES: ${detectedTones}` : '',
        ``,
        `=== REPLY STRATEGY ===`,
        `- Should Reply Now: ${stratReplyNow}`,
        `- Should Ask Question: ${stratAskQ}`,
        `- Should Reassure/Comfort: ${stratReassure}`,
        `- Should Change Topic: ${stratChangeTopic}`,
        `- Should Be Concise: ${stratConcise}`,
        `- Sensitive Subjects to Avoid: ${stratAvoid}`,
        ``,
        `=== DETECTED CONTEXT TIMELINE ===`,
        timelineEventsText,
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

      const replyTarget = context.replyTarget || ReplyTargetResolver.resolve(context.recentMessages || []);

      let targetSection = '';
      if (replyTarget.hasTargetMessages) {
        targetSection = [
          `=== 4. REPLY TARGET (LATEST INCOMING MESSAGES REQUIRING A RESPONSE) ===`,
          `MESSAGES TO ANSWER:`,
          ...replyTarget.targetIncomingMessages.map((m) => `  - ${m.sender || contactName}: "${m.text}"`),
          ``,
          `DIRECTIVE: Respond ONLY to the message(s) in this REPLY TARGET section. Use the background history above for context only. Do NOT reply to your own messages or old context.`,
        ].join('\n');
      } else if (replyTarget.isAwaitingContactReply) {
        const lastMsgText = replyTarget.lastOutgoingMessage?.text || '';
        targetSection = [
          `=== 4. REPLY TARGET (NO NEW INCOMING MESSAGES) ===`,
          `Status: ${contactName} has not sent any new messages since your last message: "${lastMsgText}".`,
          ``,
          `DIRECTIVE: Do NOT reply to your own last message ("${lastMsgText}"). Provide proactive follow-up options or natural conversation starters to re-engage ${contactName} on "${currentTopic}".`,
        ].join('\n');
      } else {
        targetSection = [
          `=== 4. REPLY TARGET ===`,
          `LATEST MESSAGES:`,
          ...latestMessages.map((m) => `  ${m}`),
          ``,
          `DIRECTIVE: Provide helpful, direct response options based on the latest messages.`,
        ].join('\n');
      }

      const userPrompt = [
        `=== 1. CONVERSATION SUMMARY ===`,
        conversationSummary,
        ``,
        `=== 2. RELEVANT CONTEXT ===`,
        `CONVERSATION STAGE: ${conversationStage}`,
        `CURRENT TOPIC: ${currentTopic}`,
        intentSection,
        intentGoalSection,
        `SUGGESTED REPLY GOAL: ${suggestedGoal}`,
        healthSection,
        factsLines,
        ...pendingLines,
        ``,
        `=== 3. RECENT HISTORY (FOR BACKGROUND CONTEXT ONLY) ===`,
        ...latestMessages.map((m) => `  ${m}`),
        ``,
        targetSection,
      ]
        .filter((line) => line !== '')
        .join('\n')
        .trim();

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
    })();

    inspector?.endStage('[5] Prompt Builder', {
      systemPromptLength: spec.systemPrompt.length,
      userPromptLength: spec.userPrompt.length,
    });

    return spec;
  }

  private static getConversationModeInstruction(mode: string): string {
    switch (mode) {
      case 'natural':
        return 'Match the typical, effortless rhythm of WhatsApp messaging. Avoid over-explaining or overly formal phrases.';
      case 'professional':
        return 'Maintain a polite, clear, and business-appropriate tone while remaining accessible on WhatsApp.';
      case 'warm':
        return 'Be friendly, inviting, and emotionally close. Use warm greetings and show genuine care.';
      case 'playful':
        return 'Inject light humor, wit, and energetic responses where appropriate.';
      case 'flirty':
        return 'Be charming, engaging, and subtly playful to build a close, personal connection.';
      case 'supportive':
        return 'Focus on empathy, active listening, and offering help or emotional encouragement.';
      case 'confident':
        return 'Speak clearly, assertively, and directly, conveying competence and assurance.';
      default:
        return 'Maintain a natural, balanced conversational style.';
    }
  }

  private static getWritingStyleInstruction(style: string): string {
    switch (style) {
      case 'usual':
        return "Adapt dynamic style matching. Leverage the detected relationship context (formality, playfulness, engagement), conversation intelligence (detected tones/intents), and user preferences found in memory to mirror the user's natural communication patterns.";
      case 'casual':
        return 'Relaxed, informal, everyday language with common abbreviations and contractions.';
      case 'friendly':
        return 'Warm, pleasant, and highly approachable style.';
      case 'professional':
        return 'Polished, grammatically pristine, and respectful style.';
      case 'short-direct':
        return 'Very concise, omitting fluff, getting straight to the point.';
      case 'detailed':
        return 'Thorough, structured, and comprehensive explanations.';
      case 'humorous':
        return 'Witty, lighthearted, and amusing responses.';
      case 'respectful':
        return 'Deferential, highly polite, and honoring boundaries.';
      case 'romantic':
        return 'Affectionate, intimate, and deeply personal style.';
      case 'motivational':
        return 'Inspiring, encouraging, and positive reinforcement.';
      default:
        return 'Standard natural message phrasing.';
    }
  }

  private static getPersonalityInstruction(personality: string): string {
    switch (personality) {
      case 'safe':
        return 'Polite, low-risk, agreeable response ensuring safe rapport.';
      case 'balanced':
        return 'Naturally engaging response balancing warmth and directness.';
      case 'creative':
        return 'Witty, intriguing, or charismatic response with higher creative styling.';
      default:
        return 'Balanced response stance.';
    }
  }
}
