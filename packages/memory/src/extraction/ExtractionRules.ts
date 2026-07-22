import { CanonicalMessage } from '@rapport/shared';
import { MemoryCandidate } from '../types/MemoryTypes.js';
import { ImportanceScorer } from './ImportanceScorer.js';

export class ExtractionRules {
  public static extractFromMessages(messages: CanonicalMessage[]): MemoryCandidate[] {
    const candidates: MemoryCandidate[] = [];

    if (!messages || messages.length === 0) return candidates;

    messages.forEach((msg) => {
      const text = (msg.text || '').trim();
      if (!text || text.length < 8) return; // Skip greetings and short filler

      // Skip generic greetings
      if (/^(hi|hello|hey|good morning|goodnight|bye|thanks|thank you|ok|okay|cool|yeah)$/i.test(text)) {
        return;
      }

      const lower = text.toLowerCase();

      // 1. Food / Movie / Music Preferences & Interests
      if (/(favorite|fave|love|prefer|enjoy|obsessed with|really like)/i.test(lower)) {
        if (/(pizza|sushi|pasta|burger|coffee|tacos|ramen|tea|chocolate)/i.test(lower)) {
          candidates.push({
            type: 'PREFERENCE',
            title: 'Food Preference',
            content: text,
            importance: ImportanceScorer.calculateImportance({ type: 'PREFERENCE', content: text }),
            confidence: 0.9,
            reason: 'Detected culinary preference statement.',
            tags: ['food', 'preference'],
            source: 'extracted_heuristic',
          });
        } else if (/(movie|film|show|series|anime|netflix|cinema)/i.test(lower)) {
          candidates.push({
            type: 'INTEREST',
            title: 'Movie/Show Interest',
            content: text,
            importance: ImportanceScorer.calculateImportance({ type: 'INTEREST', content: text }),
            confidence: 0.88,
            reason: 'Detected entertainment preference statement.',
            tags: ['movie', 'interest'],
            source: 'extracted_heuristic',
          });
        }
      }

      // 2. Birthdays & Anniversaries
      if (/(birthday|bday|born on|anniversary)/i.test(lower)) {
        candidates.push({
          type: 'EVENT',
          title: 'Birthday / Special Date',
          content: text,
          importance: ImportanceScorer.calculateImportance({ type: 'EVENT', content: text }),
          confidence: 0.95,
          reason: 'Detected special event or birthday reference.',
          tags: ['birthday', 'event', 'date'],
          source: 'extracted_heuristic',
        });
      }

      // 3. Plans & Meetings (Temporary vs Permanent)
      if (/(meet|schedule|lunch|dinner|coffee|party|flight|trip|vacation|planning|weekend|tomorrow|friday|monday)/i.test(lower)) {
        const isTemp = /(tomorrow|tonight|this weekend|this friday|next week)/i.test(lower);
        // Expiration: 7 days for temporary plans
        const expiresAt = isTemp ? Date.now() + 7 * 24 * 60 * 60 * 1000 : undefined;

        candidates.push({
          type: 'PLAN',
          title: 'Upcoming Plan / Meeting',
          content: text,
          importance: ImportanceScorer.calculateImportance({ type: 'PLAN', content: text, isTemporary: isTemp }),
          confidence: 0.91,
          reason: 'Detected scheduling or plan proposal.',
          tags: ['plan', 'meeting', 'travel'],
          source: 'extracted_heuristic',
          expiresAt,
        });
      }

      // 4. Promises & Commitments
      if (/(i will|i'll|promise|let me send|i can share|will deliver)/i.test(lower)) {
        candidates.push({
          type: 'PROMISE',
          title: 'Promised Commitment',
          content: text,
          importance: ImportanceScorer.calculateImportance({ type: 'PROMISE', content: text, hasCommitment: true }),
          confidence: 0.93,
          reason: 'Detected explicit promise or task commitment.',
          tags: ['promise', 'commitment'],
          source: 'extracted_heuristic',
        });
      }

      // 5. Locations & Travel
      if (/(living in|moving to|traveling to|vacation to|visiting|located in|based in)/i.test(lower)) {
        candidates.push({
          type: 'LOCATION',
          title: 'Location Reference',
          content: text,
          importance: ImportanceScorer.calculateImportance({ type: 'LOCATION', content: text }),
          confidence: 0.89,
          reason: 'Detected geographic location reference.',
          tags: ['location', 'travel'],
          source: 'extracted_heuristic',
        });
      }
    });

    return candidates;
  }
}
