import { CanonicalMessage, ToneType } from '@rapport/shared';

export class HeuristicToneDetector {
  public static detectTone(messages: CanonicalMessage[], draftText: string = ''): ToneType {
    const combinedText = [...messages.map((m) => m.text), draftText].join(' ').toLowerCase();

    if (!combinedText.trim()) {
      return 'Unknown';
    }

    const romanticRegex = /(love|miss you|babe|sweetheart|darling|❤️|💖|😘)/i;
    const playfulRegex = /(haha|lol|rofl|funny|joke|😜|😂|🤣|🤪)/i;
    const emotionalRegex = /(sorry|sad|upset|angry|frustrated|hurt|crying|😭|💔)/i;
    const professionalRegex = /(regards|schedule|deadline|deliverable|meeting|agenda|asap|update|attached)/i;
    const formalRegex = /(dear|sincerely|kindly|furthermore|accordingly|please find)/i;
    const friendlyRegex = /(thanks|thank you|awesome|great|sounds good|nice|cool|cheers|😊|👍)/i;

    if (romanticRegex.test(combinedText)) return 'Romantic';
    if (playfulRegex.test(combinedText)) return 'Playful';
    if (emotionalRegex.test(combinedText)) return 'Emotional';
    if (formalRegex.test(combinedText)) return 'Formal';
    if (professionalRegex.test(combinedText)) return 'Professional';
    if (friendlyRegex.test(combinedText)) return 'Friendly';

    return 'Neutral';
  }
}
