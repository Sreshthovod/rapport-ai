import { MemoryCandidate, MemoryImportance, MemoryType } from '../types/MemoryTypes.js';

export class ImportanceScorer {
  public static calculateImportance(params: {
    type: MemoryType;
    content: string;
    hasCommitment?: boolean;
    isTemporary?: boolean;
  }): MemoryImportance {
    const { type, content, hasCommitment, isTemporary } = params;
    const clean = content.toLowerCase();

    // Critical: Promises, birthdays, explicit commitments
    if (type === 'PROMISE' || type === 'EVENT' || hasCommitment || clean.includes('birthday') || clean.includes('promise')) {
      return 'CRITICAL';
    }

    // High: Future plans, goals, important dates
    if (type === 'PLAN' || type === 'GOAL' || type === 'DATE') {
      return isTemporary ? 'NORMAL' : 'HIGH';
    }

    // Normal: Preferences, interests, locations, person facts
    if (type === 'PREFERENCE' || type === 'INTEREST' || type === 'LOCATION' || type === 'PERSON') {
      return 'NORMAL';
    }

    return 'LOW';
  }
}
