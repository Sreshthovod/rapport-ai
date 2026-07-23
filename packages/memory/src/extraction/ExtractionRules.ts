import { CanonicalMessage } from '@rapport/shared';
import { MemoryCandidate, MemoryCategory, MemoryType } from '../types/MemoryTypes.js';
import { ImportanceScorer } from './ImportanceScorer.js';

const FILLER_REGEX = /^(hi|hello|hey|good morning|goodnight|goodnight|bye|thanks|thank you|ok|okay|cool|yeah|yep|nope|sure|hmm|lol|haha|k|got it|sounds good)$/i;

function makeCandidate(params: {
  type: MemoryType;
  category: MemoryCategory;
  title: string;
  content: string;
  tags: string[];
  hasCommitment?: boolean;
  isTemporary?: boolean;
  confidence?: number;
  expiresAt?: number;
}): MemoryCandidate {
  const scored = ImportanceScorer.calculateImportance({
    type: params.type,
    content: params.content,
    hasCommitment: params.hasCommitment,
    isTemporary: params.isTemporary,
  });

  return {
    type: params.type,
    category: params.category,
    title: params.title,
    content: params.content,
    importance: scored.importance,
    importanceScore: scored.importanceScore,
    confidence: params.confidence ?? 0.88,
    reason: `Matched extraction rule: ${params.title}`,
    tags: params.tags,
    source: 'extracted_heuristic',
    expiresAt: params.expiresAt,
  };
}

export class ExtractionRules {
  public static extractFromMessages(messages: CanonicalMessage[]): MemoryCandidate[] {
    const candidates: MemoryCandidate[] = [];

    if (!messages || messages.length === 0) return candidates;

    for (const msg of messages) {
      const text = (msg.text || '').trim();
      if (!text || text.length < 10) continue;
      if (FILLER_REGEX.test(text)) continue;

      const lower = text.toLowerCase();

      // ── 1. Personal Facts: job, occupation, education ────────────────────────
      if (/(i work|i am a|i'm a|my job|my role|i work at|i'm working|i joined|i got a job|i study|i'm studying|i go to|i graduated)/i.test(lower)) {
        candidates.push(makeCandidate({
          type: 'PERSON',
          category: 'Personal',
          title: 'Work / Education',
          content: text,
          tags: ['personal', 'career', 'education'],
          confidence: 0.9,
        }));
      }

      // ── 2. Personal Facts: family, siblings, parents ─────────────────────────
      if (/(my (mom|dad|brother|sister|wife|husband|girlfriend|boyfriend|son|daughter|family|parents))/i.test(lower)) {
        candidates.push(makeCandidate({
          type: 'PERSON',
          category: 'Personal',
          title: 'Family Member',
          content: text,
          tags: ['personal', 'family'],
          confidence: 0.88,
        }));
      }

      // ── 3. Preferences: Food ─────────────────────────────────────────────────
      if (/(favorite|fave|love|prefer|enjoy|obsessed with|really like)/i.test(lower) &&
          /(pizza|sushi|pasta|burger|coffee|tacos|ramen|tea|chocolate|biryani|noodles|food|eat|diet)/i.test(lower)) {
        candidates.push(makeCandidate({
          type: 'PREFERENCE',
          category: 'Preferences',
          title: 'Food Preference',
          content: text,
          tags: ['food', 'preference'],
          confidence: 0.9,
        }));
      }

      // ── 4. Preferences: Entertainment ────────────────────────────────────────
      if (/(favorite|fave|love|prefer|enjoy|obsessed with|really like)/i.test(lower) &&
          /(movie|film|show|series|anime|netflix|cinema|music|song|album|artist|band|podcast|book|novel)/i.test(lower)) {
        candidates.push(makeCandidate({
          type: 'INTEREST',
          category: 'Interests',
          title: 'Entertainment Preference',
          content: text,
          tags: ['entertainment', 'interest'],
          confidence: 0.88,
        }));
      }

      // ── 5. Interests: Hobbies & Activities ───────────────────────────────────
      if (/(i (love|enjoy|like|do|practice|play|am into)|my hobby|i'm into|i follow)/i.test(lower) &&
          /(gym|running|hiking|gaming|cycling|reading|cooking|drawing|photography|yoga|cricket|football|tennis)/i.test(lower)) {
        candidates.push(makeCandidate({
          type: 'INTEREST',
          category: 'Interests',
          title: 'Hobby / Activity',
          content: text,
          tags: ['hobby', 'interest', 'activity'],
          confidence: 0.87,
        }));
      }

      // ── 6. Important Dates: Birthdays & Anniversaries ────────────────────────
      if (/(birthday|bday|born on|anniversary)/i.test(lower)) {
        candidates.push(makeCandidate({
          type: 'EVENT',
          category: 'Important dates',
          title: 'Birthday / Special Date',
          content: text,
          tags: ['birthday', 'event', 'date'],
          confidence: 0.95,
        }));
      }

      // ── 7. Important Dates: Deadlines, Exams, Milestones ─────────────────────
      if (/(exam|deadline|submission|presentation|interview|milestone|launch|result)/i.test(lower)) {
        candidates.push(makeCandidate({
          type: 'DATE',
          category: 'Important dates',
          title: 'Deadline / Milestone',
          content: text,
          tags: ['deadline', 'date', 'milestone'],
          confidence: 0.9,
        }));
      }

      // ── 8. Plans & Meetings ───────────────────────────────────────────────────
      if (/(meet|schedule|lunch|dinner|coffee|party|flight|trip|vacation|planning|weekend|tomorrow|next week|on friday|on monday|on sunday)/i.test(lower)) {
        const isTemp = /(tomorrow|tonight|this weekend|this friday|next week|this monday)/i.test(lower);
        const expiresAt = isTemp ? Date.now() + 7 * 24 * 60 * 60 * 1000 : undefined;

        candidates.push(makeCandidate({
          type: 'PLAN',
          category: 'Plans',
          title: 'Upcoming Plan / Meeting',
          content: text,
          tags: ['plan', 'meeting'],
          isTemporary: isTemp,
          expiresAt,
          confidence: 0.91,
        }));
      }

      // ── 9. Travel & Location ─────────────────────────────────────────────────
      if (/(living in|moving to|traveling to|visiting|located in|based in|going to|flying to|shifted to)/i.test(lower)) {
        candidates.push(makeCandidate({
          type: 'LOCATION',
          category: 'Personal',
          title: 'Location Reference',
          content: text,
          tags: ['location', 'travel'],
          confidence: 0.89,
        }));
      }

      // ── 10. Promises & Commitments ───────────────────────────────────────────
      if (/(i will|i'll|i promise|let me send|i can share|will deliver|count on me|i'll make sure)/i.test(lower)) {
        candidates.push(makeCandidate({
          type: 'PROMISE',
          category: 'Plans',
          title: 'Promised Commitment',
          content: text,
          tags: ['promise', 'commitment'],
          hasCommitment: true,
          confidence: 0.93,
        }));
      }

      // ── 11. Relationship Context ─────────────────────────────────────────────
      if (/(we've known|we met|we've been friends|we've been together|since we|known each other|how long)/i.test(lower)) {
        candidates.push(makeCandidate({
          type: 'RELATIONSHIP',
          category: 'Relationships',
          title: 'Relationship Context',
          content: text,
          tags: ['relationship', 'history'],
          confidence: 0.85,
        }));
      }

      // ── 12. Goals & Aspirations ──────────────────────────────────────────────
      if (/(my goal|i want to|i plan to|i'm trying to|dream of|aspire to|hoping to|i'm aiming)/i.test(lower)) {
        candidates.push(makeCandidate({
          type: 'GOAL',
          category: 'Personal',
          title: 'Goal / Aspiration',
          content: text,
          tags: ['goal', 'aspiration'],
          confidence: 0.87,
        }));
      }
    }

    return candidates;
  }
}
