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
  public static readonly CURRENT_VERSION = 'v1.0.0';

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

    const conversationSummary = context.summary?.recentSummary || 'Recent thread snippet.';
    const latestMessages = context.recentMessages?.map((m) => `${m.sender}: ${m.text}`) || [];
    const detectedTone = context.tone || 'Friendly';
    const suggestedGoal = context.intelligence?.suggestedGoal || context.summary?.suggestedGoal || 'General Alignment';
    const relationshipType = context.relationship?.relationshipType || 'unknown';

    // Budget long-term memories
    const memoryContext = context.memoryContext as MemoryContext | undefined;
    const budgetedMemory = MemoryPromptBudget.budgetMemories(memoryContext);

    // Dev-Mode Prompt Debugging
    if (DEBUG_AI_PIPELINE) {
      if (budgetedMemory.selectedMemories.length > 0) {
        console.debug('[PromptComposer Dev Debug] Selected Memories:', budgetedMemory.selectedMemories.map((m) => m.title));
        console.debug('[PromptComposer Dev Debug] Discarded Memories:', budgetedMemory.discardedMemories.map((m) => m.title));
        console.debug(`[PromptComposer Dev Debug] Memory Chars: ${budgetedMemory.charCountBefore} -> ${budgetedMemory.charCountAfter}`);
      }
    }

    const memorySection = budgetedMemory.promptSection ? `\n${budgetedMemory.promptSection}\n` : '';

    const systemPrompt = `
You are Rapport AI (version ${PromptComposer.CURRENT_VERSION}), a world-class conversation copilot.
GOAL: ${goal}
DIRECTIVE: ${template.systemDirective}
RELATIONSHIP TYPE: ${relationshipType.toUpperCase()}
TARGET TONE: ${detectedTone}
${memorySection}
CONSTRAINTS:
- Never sound robotic: ${constraints.neverSoundRobotic}
- Avoid repetition: ${constraints.avoidRepetition}
- Match relationship tone: ${constraints.matchRelationshipTone}
- Length preference: ${constraints.responseLength}
- Allow emojis: ${constraints.allowEmojis}
`.trim();

    const userPrompt = `
CONVERSATION SUMMARY: ${conversationSummary}
LATEST MESSAGES:
${latestMessages.join('\n')}
SUGGESTED GOAL: ${suggestedGoal}
`.trim();

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
