import { CanonicalMessage, DetectedToneScore } from '@rapport/shared';

export class MultiToneAnalyzer {
  public static analyzeTones(messages: CanonicalMessage[], draftText: string = ''): DetectedToneScore[] {
    const combinedText = [...messages.map((m) => m.text), draftText].join(' ').toLowerCase();
    if (!combinedText.trim()) {
      return [{ tone: 'Neutral', confidence: 0.8 }];
    }

    const scores: DetectedToneScore[] = [];

    // 1. Friendly
    if (/(thanks|thank you|awesome|great|sounds good|nice|cool|cheers|😊|👍|glad)/i.test(combinedText)) {
      scores.push({ tone: 'Friendly', confidence: 0.92 });
    }

    // 2. Professional
    if (/(regards|schedule|deadline|deliverable|meeting|agenda|asap|update|attached|review|client|proposal)/i.test(combinedText)) {
      scores.push({ tone: 'Professional', confidence: 0.94 });
    }

    // 3. Romantic / Flirty
    if (/(love|miss you|babe|sweetheart|darling|cutie|❤️|💖|😘|date|attractive)/i.test(combinedText)) {
      scores.push({ tone: 'Romantic', confidence: 0.95 });
      scores.push({ tone: 'Flirty', confidence: 0.9 });
    }

    // 4. Family
    if (/(mom|dad|brother|sister|grandma|grandpa|aunt|uncle|cousin|family|home)/i.test(combinedText)) {
      scores.push({ tone: 'Family', confidence: 0.93 });
    }

    // 5. Casual
    if (/(hey|yeah|cool|nope|gonna|wanna|sup|dude|bro|lol|haha|btw)/i.test(combinedText)) {
      scores.push({ tone: 'Casual', confidence: 0.91 });
    }

    // 6. Supportive / Empathetic
    if (/(here for you|no problem|got your back|don't worry|take care|proud|understandable|feel for you)/i.test(combinedText)) {
      scores.push({ tone: 'Supportive', confidence: 0.91 });
      scores.push({ tone: 'Empathetic', confidence: 0.89 });
    }

    // 7. Humorous / Playful
    if (/(haha|lol|rofl|funny|joke|crazy|wild|😜|😂|🤣|🤪|hilarious)/i.test(combinedText)) {
      scores.push({ tone: 'Humorous', confidence: 0.93 });
      scores.push({ tone: 'Playful', confidence: 0.91 });
    }

    // 8. Formal
    if (/(dear|sincerely|kindly|furthermore|accordingly|please find|respectfully)/i.test(combinedText)) {
      scores.push({ tone: 'Formal', confidence: 0.95 });
      scores.push({ tone: 'Respectful', confidence: 0.92 });
    }

    // 9. Excited
    if (/(cannot wait|can't wait|so hyped|excited|amazing|woohoo|🎉|🚀|🔥|yay)/i.test(combinedText)) {
      scores.push({ tone: 'Excited', confidence: 0.94 });
    }

    // 10. Sad / Emotional
    if (/(sorry to hear|sad|upset|crying|miss|heartbroken|😭|💔|depressed)/i.test(combinedText)) {
      scores.push({ tone: 'Sad', confidence: 0.88 });
    }

    // 11. Angry / Frustrated
    if (/(annoyed|frustrated|angry|unacceptable|ridiculous|mad|furious|😠|😡)/i.test(combinedText)) {
      scores.push({ tone: 'Angry', confidence: 0.89 });
    }

    // 12. Apologetic
    if (/(my fault|apologize|my bad|so sorry|forgive me|pardon)/i.test(combinedText)) {
      scores.push({ tone: 'Apologetic', confidence: 0.94 });
    }

    // 13. Confident
    if (/(definitely|certainly|absolutely|100%|guaranteed|no doubt|confident)/i.test(combinedText)) {
      scores.push({ tone: 'Confident', confidence: 0.92 });
    }

    if (scores.length === 0) {
      scores.push({ tone: 'Neutral', confidence: 0.85 });
    }

    return scores.sort((a, b) => b.confidence - a.confidence);
  }
}
