import { CanonicalMessage, DetectedIntentScore } from '@rapport/shared';

export class IntentAnalyzer {
  public static analyzeIntents(messages: CanonicalMessage[], draftText: string = ''): DetectedIntentScore[] {
    if (!messages || messages.length === 0) {
      return [{ intent: 'Unknown', confidence: 0.5 }];
    }

    const latest = messages[messages.length - 1];
    const text = latest.text.toLowerCase();
    const allText = [...messages.map((m) => m.text), draftText].join(' ').toLowerCase();

    const intents: DetectedIntentScore[] = [];

    if (text.includes('?')) {
      intents.push({ intent: 'Asking Question', confidence: 0.95 });
    }

    if (/(when|where|what time|meet|schedule|plan|tomorrow|weekend|lunch|dinner)/i.test(text)) {
      intents.push({ intent: 'Making Plans', confidence: 0.92 });
    }

    if (/(sorry|apologize|my bad|forgive me)/i.test(text)) {
      intents.push({ intent: 'Apologizing', confidence: 0.96 });
    }

    if (/(want to join|come over|invited|see you at|join us)/i.test(text)) {
      intents.push({ intent: 'Inviting', confidence: 0.9 });
    }

    if (/(hi|hello|hey|good morning|good evening)/i.test(text) && messages.length <= 3) {
      intents.push({ intent: 'Greeting', confidence: 0.93 });
    }

    if (/(just checking|how are you|how's it going|thinking of you)/i.test(text)) {
      intents.push({ intent: 'Checking In', confidence: 0.88 });
    }

    if (/(following up|any update|status on|checking in on)/i.test(text)) {
      intents.push({ intent: 'Following Up', confidence: 0.91 });
    }

    if (/(bye|talk later|goodnight|see ya|gotta go)/i.test(text)) {
      intents.push({ intent: 'Ending Conversation', confidence: 0.95 });
    }

    if (intents.length === 0) {
      if (allText.includes('because') || allText.includes('due to') || allText.includes('so basically')) {
        intents.push({ intent: 'Explaining', confidence: 0.82 });
      } else {
        intents.push({ intent: 'General Dialogue', confidence: 0.75 });
      }
    }

    return intents.sort((a, b) => b.confidence - a.confidence);
  }
}
