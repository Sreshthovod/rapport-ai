import { CanonicalMessage, DetectedToneScore } from '@rapport/shared';

export class MultiToneAnalyzer {
  public static analyzeTones(messages: CanonicalMessage[], draftText: string = ''): DetectedToneScore[] {
    const combinedText = [...messages.map((m) => m.text), draftText].join(' ').toLowerCase();
    if (!combinedText.trim()) {
      return [{ tone: 'Neutral', confidence: 0.8 }];
    }

    const scores: DetectedToneScore[] = [];

    // Friendly
    if (/(thanks|thank you|awesome|great|sounds good|nice|cool|cheers|😊|👍)/i.test(combinedText)) {
      scores.push({ tone: 'Friendly', confidence: 0.9 });
    }

    // Professional
    if (/(regards|schedule|deadline|deliverable|meeting|agenda|asap|update|attached)/i.test(combinedText)) {
      scores.push({ tone: 'Professional', confidence: 0.92 });
    }

    // Flirty / Romantic
    if (/(love|miss you|babe|sweetheart|darling|cutie|❤️|💖|😘)/i.test(combinedText)) {
      scores.push({ tone: 'Romantic', confidence: 0.95 });
      scores.push({ tone: 'Flirty', confidence: 0.88 });
    }

    // Playful
    if (/(haha|lol|rofl|funny|joke|😜|😂|🤣|🤪)/i.test(combinedText)) {
      scores.push({ tone: 'Playful', confidence: 0.91 });
    }

    // Formal
    if (/(dear|sincerely|kindly|furthermore|accordingly|please find)/i.test(combinedText)) {
      scores.push({ tone: 'Formal', confidence: 0.94 });
    }

    // Supportive
    if (/(here for you|no problem|got your back|don't worry|take care|proud)/i.test(combinedText)) {
      scores.push({ tone: 'Supportive', confidence: 0.89 });
    }

    // Serious / Emotional
    if (/(sorry|sad|upset|angry|frustrated|hurt|crying|urgent|problem|😭|💔)/i.test(combinedText)) {
      scores.push({ tone: 'Emotional', confidence: 0.87 });
      scores.push({ tone: 'Serious', confidence: 0.85 });
    }

    if (scores.length === 0) {
      scores.push({ tone: 'Neutral', confidence: 0.85 });
    }

    return scores.sort((a, b) => b.confidence - a.confidence);
  }
}
