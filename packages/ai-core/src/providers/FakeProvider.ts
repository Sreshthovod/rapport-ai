import {
  AIRequest,
  AISuggestion,
  ProviderCapabilities,
  ProviderPromptRequest,
  ProviderResult,
} from '@rapport/shared';
import { ResponseEvaluator } from '../prompts/ResponseEvaluator.js';
import { AIProvider } from './AIProvider.js';

export class FakeProvider implements AIProvider {
  public readonly id = 'fake-provider';
  public readonly name = 'Deterministic Fake AI Provider';

  public readonly capabilities: ProviderCapabilities = {
    supportsStreaming: true,
    supportsVision: false,
    supportsCustomSystemPrompts: true,
    maxContextTokens: 4096,
    supportedModels: ['fake-deterministic'],
  };

  public async generateReply(request: AIRequest): Promise<ProviderResult> {
    try {
      // Simulate realistic async pipeline execution delay (300ms)
      await new Promise((resolve) => setTimeout(resolve, 300));

      const structured = request.structuredContext;
      const compiledPrompt = request.compiledPrompt;

      // Extract all available context signals for context-aware responses
      const contactName = structured?.conversation?.latestMessage?.sender
        || request.conversation?.contact?.contactName
        || 'them';

      const lastMsg = structured?.conversation?.latestMessage?.text
        || request.conversation?.lastIncomingMessage?.text
        || '';
      const detectedTone = structured?.tone || 'Friendly';
      const stage = structured?.stage || 'Small Talk';
      const relationshipType = structured?.relationship?.relationshipType || 'unknown';
      const preferredTone = structured?.relationship?.preferredTone || detectedTone;
      const engagementLevel = structured?.relationship?.engagementLevel || 'medium';
      const pendingItems = structured?.intelligence?.pendingItems;
      const suggestedGoal = structured?.intelligence?.suggestedGoal
        || structured?.summary?.suggestedGoal
        || 'Friendly Engagement';
      const extractedFacts = structured?.extractedFacts || [];
      const intents = structured?.intelligence?.intents || [];
      const primaryIntent = intents[0]?.intent || 'General Dialogue';
      const conversationHealth = structured?.intelligence?.health;
      const isOneSided = conversationHealth?.balanceStatus === 'One-sided conversation';

      // Build standardized ProviderPromptRequest enriched with PromptSpec
      const promptRequest: ProviderPromptRequest = {
        conversationSummary: structured?.summary?.recentSummary || 'Recent conversation thread.',
        latestMessages: structured?.recentMessages?.map((m) => `${m.sender}: ${m.text}`) || [],
        detectedTone: preferredTone,
        objective: suggestedGoal,
        maxSuggestions: 4,
        intelligence: structured?.intelligence,
        relationship: structured?.relationship,
        compiledPrompt,
      };

      const suggestions: AISuggestion[] = [];

      const hasUnansweredQuestion =
        pendingItems?.questionsAwaitingReply && pendingItems.questionsAwaitingReply.length > 0;
      const hasUnconfirmedPlan =
        pendingItems?.unconfirmedPlans && pendingItems.unconfirmedPlans.length > 0;
      const hasPlanningIntent = primaryIntent === 'Making Plans' || stage === 'Planning';
      const hasThanksIntent =
        lastMsg.toLowerCase().includes('thanks') || lastMsg.toLowerCase().includes('thank you');
      const hasGreetingIntent = primaryIntent === 'Greeting';
      const isWorkRelationship = relationshipType === 'work';
      const isFamilyRelationship = relationshipType === 'family';
      const isOneSidedConversation = isOneSided;

      const nameLabel = contactName && contactName !== 'Unknown' ? contactName : '';
      const nameGreet = nameLabel ? `, ${nameLabel}` : '';

      if (hasUnansweredQuestion && pendingItems?.questionsAwaitingReply) {
        const q = pendingItems.questionsAwaitingReply[pendingItems.questionsAwaitingReply.length - 1];
        const shortQ = q.slice(0, 50);

        if (isWorkRelationship) {
          suggestions.push(
            {
              id: 'sug_1',
              category: 'Professional Reply',
              tone: 'Professional',
              style: 'Direct & Clear',
              text: `Regarding "${shortQ}" — I'll have an update for you shortly.`,
              explanation: 'Professional acknowledgment of pending question.',
              confidence: 0.94,
            },
            {
              id: 'sug_2',
              category: 'Natural Reply',
              tone: 'Friendly',
              style: 'Warm & Direct',
              text: `Good question${nameGreet}! Let me look into that and get back to you.`,
              explanation: 'Friendly acknowledgment buying time for a proper answer.',
              confidence: 0.91,
            },
            {
              id: 'sug_3',
              category: 'Quick Reply',
              tone: 'Professional',
              style: 'Concise',
              text: `I'll follow up on this before EOD.`,
              explanation: 'Crisp professional commitment.',
              confidence: 0.89,
            },
            {
              id: 'sug_4',
              category: 'Short Reply',
              tone: 'Short',
              style: 'Quick',
              text: `On it — will update you shortly!`,
              explanation: 'Fast acknowledgment.',
              confidence: 0.88,
            }
          );
        } else {
          suggestions.push(
            {
              id: 'sug_1',
              category: 'Natural Reply',
              tone: 'Friendly',
              style: 'Warm & Helpful',
              text: `Great question${nameGreet}! Let me think about that and get back to you in a bit.`,
              explanation: 'Friendly acknowledgment of the unanswered question.',
              confidence: 0.93,
            },
            {
              id: 'sug_2',
              category: 'Empathetic Reply',
              tone: 'Casual',
              style: 'Honest',
              text: `Hmm, let me figure that out${nameGreet} — I want to give you a proper answer!`,
              explanation: 'Genuine response showing thoughtfulness.',
              confidence: 0.9,
            },
            {
              id: 'sug_3',
              category: 'Funny Reply',
              tone: 'Playful',
              style: 'Light',
              text: `Give me a sec to think on that one! 🤔`,
              explanation: 'Light-hearted acknowledgment.',
              confidence: 0.86,
            },
            {
              id: 'sug_4',
              category: 'Quick Reply',
              tone: 'Short',
              style: 'Concise',
              text: `On it! Give me a moment.`,
              explanation: 'Quick acknowledgment.',
              confidence: 0.88,
            }
          );
        }
      } else if (hasPlanningIntent || hasUnconfirmedPlan) {
        const planHint = pendingItems?.unconfirmedPlans?.[0]?.slice(0, 40) || 'the plan';

        if (isWorkRelationship) {
          suggestions.push(
            {
              id: 'sug_1',
              category: 'Professional Reply',
              tone: 'Professional',
              style: 'Structured & Clear',
              text: `I'll check my calendar and confirm our availability for ${planHint}.`,
              explanation: 'Professional scheduling response with concrete commitment.',
              confidence: 0.95,
            },
            {
              id: 'sug_2',
              category: 'Natural Reply',
              tone: 'Professional',
              style: 'Collaborative',
              text: `Sounds like a plan${nameGreet}. Let me review the timing and confirm shortly.`,
              explanation: 'Collaborative professional acknowledgment.',
              confidence: 0.92,
            },
            {
              id: 'sug_3',
              category: 'Quick Reply',
              tone: 'Friendly',
              style: 'Warm',
              text: `That works for me! Let me double-check my schedule and I'll confirm.`,
              explanation: 'Positive and actionable.',
              confidence: 0.9,
            },
            {
              id: 'sug_4',
              category: 'Short Reply',
              tone: 'Short',
              style: 'Concise',
              text: `Checking calendar now! 🗓️`,
              explanation: 'Ultra-concise status update.',
              confidence: 0.88,
            }
          );
        } else {
          suggestions.push(
            {
              id: 'sug_1',
              category: 'Natural Reply',
              tone: 'Friendly',
              style: 'Warm & Enthusiastic',
              text: `That sounds great${nameGreet}! Let me check my calendar real quick — I'll get back to you.`,
              explanation: 'Warm acknowledgment with commitment.',
              confidence: 0.93,
            },
            {
              id: 'sug_2',
              category: 'Quick Reply',
              tone: 'Casual',
              style: 'Relaxed',
              text: `Yeah let's do it! I'll just confirm timing and let you know.`,
              explanation: 'Casual enthusiastic agreement.',
              confidence: 0.91,
            },
            {
              id: 'sug_3',
              category: 'Funny Reply',
              tone: 'Playful',
              style: 'Fun',
              text: `Consulting my very busy imaginary schedule right now 🔮 — pretty sure I'm free!`,
              explanation: 'Playful response keeping the energy light.',
              confidence: 0.87,
            },
            {
              id: 'sug_4',
              category: 'Short Reply',
              tone: 'Short',
              style: 'Concise',
              text: `Sounds good! Checking now 🗓️`,
              explanation: 'Short and direct.',
              confidence: 0.9,
            }
          );
        }
      } else if (hasThanksIntent) {
        if (isFamilyRelationship) {
          suggestions.push(
            {
              id: 'sug_1',
              category: 'Empathetic Reply',
              tone: 'Warm',
              style: 'Family-like',
              text: `Of course${nameGreet}! That's what family's for. 😊`,
              explanation: 'Warm family-appropriate response.',
              confidence: 0.96,
            },
            {
              id: 'sug_2',
              category: 'Natural Reply',
              tone: 'Friendly',
              style: 'Heartfelt',
              text: `Always${nameGreet}! No need to thank me.`,
              explanation: 'Natural close response.',
              confidence: 0.94,
            },
            {
              id: 'sug_3',
              category: 'Funny Reply',
              tone: 'Playful',
              style: 'Light',
              text: `You owe me dinner though! 😄`,
              explanation: 'Playful family banter.',
              confidence: 0.88,
            },
            {
              id: 'sug_4',
              category: 'Short Reply',
              tone: 'Short',
              style: 'Quick',
              text: `Anytime! ❤️`,
              explanation: 'Simple warm reply.',
              confidence: 0.92,
            }
          );
        } else if (isWorkRelationship) {
          suggestions.push(
            {
              id: 'sug_1',
              category: 'Professional Reply',
              tone: 'Professional',
              style: 'Courteous',
              text: `You're welcome${nameGreet}. Please don't hesitate to reach out if you need anything else.`,
              explanation: 'Professional courtesy.',
              confidence: 0.95,
            },
            {
              id: 'sug_2',
              category: 'Natural Reply',
              tone: 'Friendly',
              style: 'Warm Professional',
              text: `Happy to help${nameGreet}! Let me know if there's anything else I can do.`,
              explanation: 'Warm but professional follow-up offer.',
              confidence: 0.93,
            },
            {
              id: 'sug_3',
              category: 'Quick Reply',
              tone: 'Professional',
              style: 'Direct',
              text: `Of course. Happy to support whenever needed.`,
              explanation: 'Crisp professional acknowledgment.',
              confidence: 0.9,
            },
            {
              id: 'sug_4',
              category: 'Short Reply',
              tone: 'Short',
              style: 'Concise',
              text: `Of course! Always happy to help. 👍`,
              explanation: 'Short warm reply.',
              confidence: 0.91,
            }
          );
        } else {
          suggestions.push(
            {
              id: 'sug_1',
              category: 'Natural Reply',
              tone: 'Friendly',
              style: 'Warm & Natural',
              text: `Anytime${nameGreet}! Always happy to help. 😊`,
              explanation: 'Warm, supportive acknowledgment.',
              confidence: 0.95,
            },
            {
              id: 'sug_2',
              category: 'Quick Reply',
              tone: 'Casual',
              style: 'Easy-going',
              text: `No worries at all! That's what I'm here for.`,
              explanation: 'Easy-going friendly reply.',
              confidence: 0.93,
            },
            {
              id: 'sug_3',
              category: 'Funny Reply',
              tone: 'Playful',
              style: 'Fun',
              text: `Don't mention it! Coffee is on you next time though ☕😄`,
              explanation: 'Playful banter.',
              confidence: 0.87,
            },
            {
              id: 'sug_4',
              category: 'Short Reply',
              tone: 'Short',
              style: 'Concise',
              text: `Happy to help! 👍`,
              explanation: 'Simple acknowledgment.',
              confidence: 0.91,
            }
          );
        }
      } else if (hasGreetingIntent) {
        const greeting = isWorkRelationship ? 'Hope you\'re having a productive day' : 'Hope you\'re doing well';
        suggestions.push(
          {
            id: 'sug_1',
            category: 'Natural Reply',
            tone: preferredTone,
            style: 'Natural',
            text: `Hey${nameGreet}! ${greeting} 😊`,
            explanation: 'Warm contextual greeting.',
            confidence: 0.93,
          },
          {
            id: 'sug_2',
            category: 'Follow-up Question',
            tone: 'Friendly',
            style: 'Curious',
            text: `Hey${nameGreet}! Good to hear from you — what's up?`,
            explanation: 'Friendly opening that invites conversation.',
            confidence: 0.91,
          },
          {
            id: 'sug_3',
            category: 'Funny Reply',
            tone: 'Playful',
            style: 'Fun',
            text: `Hey${nameGreet}! 👋 What's going on?`,
            explanation: 'Light casual greeting.',
            confidence: 0.88,
          },
          {
            id: 'sug_4',
            category: 'Short Reply',
            tone: 'Short',
            style: 'Concise',
            text: `Hey! 😊`,
            explanation: 'Simple, warm reply.',
            confidence: 0.87,
          }
        );
      } else if (isOneSidedConversation) {
        suggestions.push(
          {
            id: 'sug_1',
            category: 'Conversation Saver',
            tone: 'Friendly',
            style: 'Curious',
            text: `Hey${nameGreet}! Just checking in — how are things on your end?`,
            explanation: 'Re-engagement for one-sided conversation.',
            confidence: 0.91,
          },
          {
            id: 'sug_2',
            category: 'Quick Reply',
            tone: 'Casual',
            style: 'Light',
            text: `Haven't heard back${nameGreet} — all good? 😊`,
            explanation: 'Gentle nudge without pressure.',
            confidence: 0.89,
          },
          {
            id: 'sug_3',
            category: 'Funny Reply',
            tone: 'Playful',
            style: 'Light',
            text: `Sending you a virtual nudge 👋 — still there?`,
            explanation: 'Playful conversation revival.',
            confidence: 0.85,
          },
          {
            id: 'sug_4',
            category: 'Short Reply',
            tone: 'Short',
            style: 'Quick',
            text: `Hey, you there? 😄`,
            explanation: 'Ultra-short check-in.',
            confidence: 0.84,
          }
        );
      } else {
        const baseText =
          isWorkRelationship
            ? `Sounds completely aligned${nameGreet}. I'll keep you posted.`
            : isFamilyRelationship
            ? `Sounds good${nameGreet}! Let's catch up soon. 😊`
            : `Sounds great${nameGreet}! Looking forward to it. 😊`;

        suggestions.push(
          {
            id: 'sug_1',
            category: 'Natural Reply',
            tone: preferredTone,
            style: 'Natural',
            text: baseText,
            explanation: `Contextually appropriate ${relationshipType} reply.`,
            confidence: 0.93,
          },
          {
            id: 'sug_2',
            category: 'Follow-up Question',
            tone: 'Friendly',
            style: 'Engaging',
            text: `That's great${nameGreet}! What else is on your mind?`,
            explanation: 'Engaging response that moves conversation forward.',
            confidence: 0.9,
          },
          {
            id: 'sug_3',
            category: 'Funny Reply',
            tone: 'Playful',
            style: 'Fun',
            text: `100%! As long as there are good vibes involved, count me in! 🎉`,
            explanation: 'Playful positive response.',
            confidence: 0.86,
          },
          {
            id: 'sug_4',
            category: 'Short Reply',
            tone: 'Short',
            style: 'Concise',
            text: `Sounds good to me!`,
            explanation: 'Direct affirmative reply.',
            confidence: 0.9,
          }
        );
      }

      const primarySuggestion = suggestions[0];
      let evaluation = null;
      if (compiledPrompt) {
        evaluation = ResponseEvaluator.evaluateResponse({
          responseText: primarySuggestion.text,
          promptSpec: compiledPrompt,
        });
      }

      return {
        success: true,
        data: {
          suggestedReply: primarySuggestion.text,
          reasoning: `Context signals used — Intent: ${primaryIntent} | Stage: ${stage} | Relationship: ${relationshipType} | Tone: ${preferredTone}`,
          tone: primarySuggestion.tone,
          providerId: this.id,
          suggestions,
          metadata: {
            promptRequest,
            evaluation,
            contextSignals: {
              primaryIntent,
              stage,
              relationshipType,
              preferredTone,
              engagementLevel,
              pendingQuestions: pendingItems?.questionsAwaitingReply?.length ?? 0,
              unconfirmedPlans: pendingItems?.unconfirmedPlans?.length ?? 0,
              extractedFacts: extractedFacts.length,
            },
          },
        },
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'FakeProvider failed to generate response.',
      };
    }
  }

  public async generateReplyStream(
    request: AIRequest,
    onChunk: (chunkText: string) => void,
    options?: { signal?: AbortSignal }
  ): Promise<ProviderResult> {
    const fullResult = await this.generateReply(request);
    if (!fullResult.success || !fullResult.data) {
      return fullResult;
    }

    const textToStream = fullResult.data.suggestedReply;
    const words = textToStream.split(' ');

    for (let i = 0; i < words.length; i++) {
      if (options?.signal?.aborted) {
        return { success: false, error: 'Streaming cancelled by user.' };
      }
      const word = i === words.length - 1 ? words[i] : `${words[i]} `;
      onChunk(word);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    return fullResult;
  }
}
