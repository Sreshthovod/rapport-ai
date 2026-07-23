import { CanonicalMessage, WritingStyleProfile } from '@rapport/shared';
import { WritingStyleAnalyzer } from './WritingStyleAnalyzer.js';

export interface StyleTestResult {
  passed: boolean;
  details?: string;
}

export class WritingStyleTest {
  public static runTests(): { passed: boolean; results: Record<string, StyleTestResult> } {
    const results: Record<string, StyleTestResult> = {};
    let allPassed = true;

    // Test Case 1: Standard English Outgoing Messages
    try {
      const messages: CanonicalMessage[] = [
        { id: 'm1', sender: 'User', timestamp: Date.now(), text: 'Hey there! How are you doing today?', direction: 'outgoing', type: 'text', attachments: [], reactions: [] },
        { id: 'm2', sender: 'User', timestamp: Date.now(), text: 'I am doing great. Let us meet up soon.', direction: 'outgoing', type: 'text', attachments: [], reactions: [] },
      ];
      const profile = WritingStyleAnalyzer.analyze(messages);
      const passed = profile.samplesAnalyzed === 2 &&
                     profile.avgMessageLength > 5 &&
                     profile.capitalizationRatio === 1.0 &&
                     profile.punctuationRatio === 1.0 &&
                     profile.hinglishRatio === 0.0;
      results['Standard English Profile'] = { passed, details: JSON.stringify(profile) };
      if (!passed) allPassed = false;
    } catch (e) {
      results['Standard English Profile'] = { passed: false, details: String(e) };
      allPassed = false;
    }

    // Test Case 2: Casual Hinglish + Emojis + Lowercase
    try {
      const messages: CanonicalMessage[] = [
        { id: 'm3', sender: 'User', timestamp: Date.now(), text: 'haan bhai kal chalte hai 🍻', direction: 'outgoing', type: 'text', attachments: [], reactions: [] },
        { id: 'm4', sender: 'User', timestamp: Date.now(), text: 'lol no way yaar, that is crazy 😂', direction: 'outgoing', type: 'text', attachments: [], reactions: [] },
      ];
      const profile = WritingStyleAnalyzer.analyze(messages);
      const passed = profile.samplesAnalyzed === 2 &&
                     profile.emojiFrequency === 100 && // 2 emojis / 2 messages * 100 = 100
                     profile.capitalizationRatio === 0.0 &&
                     profile.punctuationRatio === 0.0 &&
                     profile.hinglishRatio === 1.0 &&
                     profile.slangRatio === 0.5;
      results['Hinglish + Emojis + Lowercase Profile'] = { passed, details: JSON.stringify(profile) };
      if (!passed) allPassed = false;
    } catch (e) {
      results['Hinglish + Emojis + Lowercase Profile'] = { passed: false, details: String(e) };
      allPassed = false;
    }

    return { passed: allPassed, results };
  }
}
