import { MemoryImportance, MemoryType } from '../types/MemoryTypes.js';

export class ImportanceScorer {
  /**
   * Returns both the enum-level importance and a numeric score 0–100.
   */
  public static calculateImportance(params: {
    type: MemoryType;
    content: string;
    hasCommitment?: boolean;
    isTemporary?: boolean;
  }): { importance: MemoryImportance; importanceScore: number } {
    const { type, content, hasCommitment, isTemporary } = params;
    const clean = content.toLowerCase();

    // Modifier: emphatic phrasing boosts score
    const hasEmphasis = /(important|remember|definitely|must|never forget|critical|promise)/i.test(clean);
    const emphasisBonus = hasEmphasis ? 20 : 0;

    // CRITICAL: Promises, birthdays, explicit commitments, anniversaries
    if (
      type === 'PROMISE' ||
      type === 'EVENT' ||
      hasCommitment ||
      clean.includes('birthday') ||
      clean.includes('anniversary') ||
      clean.includes('promise')
    ) {
      const base = 80;
      return {
        importance: 'CRITICAL',
        importanceScore: Math.min(100, base + emphasisBonus),
      };
    }

    // HIGH: Plans (non-temporary), goals, important dates, relationship facts
    if (type === 'PLAN' || type === 'GOAL' || type === 'DATE' || type === 'RELATIONSHIP') {
      if (isTemporary) {
        return {
          importance: 'NORMAL',
          importanceScore: Math.min(70, 35 + emphasisBonus),
        };
      }
      const base = 60;
      return {
        importance: 'HIGH',
        importanceScore: Math.min(80, base + emphasisBonus),
      };
    }

    // NORMAL: Preferences, interests, locations, person facts
    if (type === 'PREFERENCE' || type === 'INTEREST' || type === 'LOCATION' || type === 'PERSON') {
      const base = 35;
      return {
        importance: 'NORMAL',
        importanceScore: Math.min(59, base + emphasisBonus),
      };
    }

    // LOW: Custom or unclassified memories
    return {
      importance: 'LOW',
      importanceScore: Math.min(34, 10 + emphasisBonus),
    };
  }
}
