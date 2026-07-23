import { CanonicalMessage, WritingStyleProfile } from '@rapport/shared';
import { WritingStyleAnalyzer } from './WritingStyleAnalyzer.js';
import { WritingStyleStore } from './WritingStyleStore.js';

export interface StyleDescriptor {
  avgMessageLength: number;
  emojiFrequency: number;
  lengthGuidance: string;
  emojiGuidance: string;
  formalityGuidance: string;
  slangGuidance: string;
  hinglishGuidance: string;
  capitalizationGuidance: string;
  punctuationGuidance: string;
  greetingExample: string;
  closingExample: string;
  commonPhrasesStr: string;
}

export class WritingStyleEngine {
  private static instance: WritingStyleEngine | null = null;
  public static readonly MIN_MESSAGES_FOR_PROFILE = 10;

  public static getInstance(): WritingStyleEngine {
    if (!WritingStyleEngine.instance) {
      WritingStyleEngine.instance = new WritingStyleEngine();
    }
    return WritingStyleEngine.instance;
  }

  public async getProfile(): Promise<WritingStyleProfile | null> {
    return WritingStyleStore.getProfile();
  }

  public async reset(): Promise<void> {
    return WritingStyleStore.resetProfile();
  }

  /**
   * Update the writing style profile from a list of outgoing messages.
   * Merges with any existing profile using a weighted moving average.
   */
  public async updateFromMessages(messages: CanonicalMessage[]): Promise<WritingStyleProfile | null> {
    const outgoing = messages.filter((m) => m.direction === 'outgoing' && m.text && m.text.trim().length > 0);
    if (outgoing.length === 0) {
      return this.getProfile();
    }

    const freshProfile = WritingStyleAnalyzer.analyze(outgoing);
    const existing = await this.getProfile();

    let merged: WritingStyleProfile;
    if (existing && existing.samplesAnalyzed > 0) {
      merged = WritingStyleAnalyzer.merge(existing, freshProfile);
    } else {
      merged = freshProfile;
    }

    await WritingStyleStore.saveProfile(merged);
    return merged;
  }

  /**
   * Map profile metrics to human-readable directives for the system prompt.
   */
  public toPromptDescriptor(profile: WritingStyleProfile): StyleDescriptor {
    // 1. Length guidance
    let lengthGuidance = 'Medium length (8-16 words)';
    if (profile.avgMessageLength <= 5) {
      lengthGuidance = 'Very short/concise (1-5 words)';
    } else if (profile.avgMessageLength <= 9) {
      lengthGuidance = 'Short (6-9 words)';
    } else if (profile.avgMessageLength >= 18) {
      lengthGuidance = 'Detailed/long (18+ words)';
    }

    // 2. Emoji guidance
    let emojiGuidance = 'Rare/no emojis';
    if (profile.emojiFrequency >= 70) {
      emojiGuidance = 'Heavy emoji user (freely include emojis)';
    } else if (profile.emojiFrequency >= 25) {
      emojiGuidance = 'Moderate emoji user (1-2 emojis per message)';
    }

    // 3. Formality / Slang
    let slangGuidance = 'Standard/neutral vocabulary';
    if (profile.slangRatio >= 0.4) {
      slangGuidance = 'Very informal (uses internet/casual slang often)';
    } else if (profile.slangRatio >= 0.15) {
      slangGuidance = 'Casual/informal (occasional slang like lol, bro)';
    }

    // 4. Hinglish mix
    let hinglishGuidance = 'English only';
    if (profile.hinglishRatio >= 0.4) {
      hinglishGuidance = 'Hinglish (mix Hindi and English words naturally, e.g. using yaar, bhai, kya, etc.)';
    } else if (profile.hinglishRatio >= 0.15) {
      hinglishGuidance = 'English with occasional Hindi slang words';
    }

    // 5. Capitalization
    let capitalizationGuidance = 'Normal sentence capitalization';
    if (profile.capitalizationRatio <= 0.15) {
      capitalizationGuidance = 'Always lowercase (casual chat style)';
    } else if (profile.capitalizationRatio >= 0.85) {
      capitalizationGuidance = 'Standard capitalization';
    }

    // 6. Punctuation
    let punctuationGuidance = 'Standard punctuation';
    if (profile.punctuationRatio <= 0.2) {
      punctuationGuidance = 'Rarely uses terminal punctuation (no periods at the end of messages)';
    } else if (profile.punctuationRatio >= 0.8) {
      punctuationGuidance = 'Always uses proper punctuation (. ! ?)';
    }

    const greetingExample = profile.greetingPatterns.join(', ') || 'none';
    const closingExample = profile.closingPatterns.join(', ') || 'none';
    const commonPhrasesStr = profile.commonPhrases.join(', ') || 'none';

    return {
      avgMessageLength: profile.avgMessageLength,
      emojiFrequency: profile.emojiFrequency,
      lengthGuidance,
      emojiGuidance,
      formalityGuidance: profile.slangRatio >= 0.3 ? 'Very casual' : 'Casual',
      slangGuidance,
      hinglishGuidance,
      capitalizationGuidance,
      punctuationGuidance,
      greetingExample,
      closingExample,
      commonPhrasesStr,
    };
  }
}
