import { CanonicalMessage, DetectedIntentScore } from '@rapport/shared';

export class IntentAnalyzer {
  public static analyzeIntents(messages: CanonicalMessage[], draftText: string = ''): DetectedIntentScore[] {
    if (!messages || messages.length === 0) {
      return [{ intent: 'General Dialogue', confidence: 0.5 }];
    }

    const latest = messages[messages.length - 1];
    const text = (latest.text || '').toLowerCase();
    const allText = [...messages.map((m) => m.text), draftText].join(' ').toLowerCase();

    const intents: DetectedIntentScore[] = [];

    // 1. Asking Question
    if (text.includes('?')) {
      intents.push({ intent: 'Question', confidence: 0.95 });
    }

    // 2. Planning
    if (/(when|where|what time|meet|schedule|plan|tomorrow|weekend|lunch|dinner|calendar|book|slot)/i.test(text)) {
      intents.push({ intent: 'Planning', confidence: 0.92 });
    }

    // 3. Greeting
    if (/(hi|hello|hey|good morning|good evening|sup|greetings)/i.test(text) && messages.length <= 3) {
      intents.push({ intent: 'Greeting', confidence: 0.94 });
    }

    // 4. Follow-up
    if (/(following up|any update|status on|checking in on|wanted to follow up|did you get a chance)/i.test(allText)) {
      intents.push({ intent: 'Follow-up', confidence: 0.93 });
    }

    // 5. Invitation
    if (/(want to join|come over|invited|see you at|join us|are you down to|wanna come)/i.test(text)) {
      intents.push({ intent: 'Invitation', confidence: 0.91 });
    }

    // 6. Reminder
    if (/(don't forget|remember to|friendly reminder|heads up|just a reminder)/i.test(text)) {
      intents.push({ intent: 'Reminder', confidence: 0.94 });
    }

    // 7. Negotiation
    if (/(discount|price|offer|terms|deal|instead of|budget|rate|trade|compromise)/i.test(allText)) {
      intents.push({ intent: 'Negotiation', confidence: 0.9 });
    }

    // 8. Conflict
    if (/(unacceptable|disagree|wrong|fault|frustrated with|angry|issue with you|stop doing)/i.test(text)) {
      intents.push({ intent: 'Conflict', confidence: 0.89 });
    }

    // 9. Apology
    if (/(sorry|apologize|my bad|forgive me|didn't mean to|pardon)/i.test(text)) {
      intents.push({ intent: 'Apology', confidence: 0.96 });
    }

    // 10. Celebration
    if (/(congrats|congratulations|happy birthday|cheers|proud of you|way to go|🎉|🥳|celebrate)/i.test(text)) {
      intents.push({ intent: 'Celebration', confidence: 0.95 });
    }

    // 11. Goodbye
    if (/(bye|talk later|goodnight|see ya|gotta go|take care|have a good one)/i.test(text)) {
      intents.push({ intent: 'Goodbye', confidence: 0.95 });
    }

    // 12. Advice
    if (/(what should i do|any advice|what do you think|recommend|suggestion for|how would you handle)/i.test(text)) {
      intents.push({ intent: 'Advice', confidence: 0.92 });
    }

    // 13. Emotional Support
    if (/(i'm here for you|feel better|everything will be ok|sending love|stay strong|lean on me)/i.test(allText)) {
      intents.push({ intent: 'Emotional Support', confidence: 0.92 });
    }

    // 14. Information Sharing
    if (/(here is the|fyi|just so you know|wanted to share|the link is|attached is)/i.test(text)) {
      intents.push({ intent: 'Information Sharing', confidence: 0.9 });
    }

    if (intents.length === 0) {
      intents.push({ intent: 'Information Sharing', confidence: 0.75 });
    }

    return intents.sort((a, b) => b.confidence - a.confidence);
  }
}
