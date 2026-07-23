import { CanonicalMessage } from '@rapport/shared';

export class LanguageDetector {
  public static detectLanguage(messages: CanonicalMessage[], draftText: string = ''): string {
    const combinedText = [...messages.map((m) => m.text), draftText].join(' ');

    if (!combinedText.trim()) {
      return 'English';
    }

    // 1. Script checks
    if (/[\u0400-\u04FF]/.test(combinedText)) return 'Russian';
    if (/[\u0600-\u06FF]/.test(combinedText)) return 'Arabic';
    if (/[\u4E00-\u9FFF]/.test(combinedText)) return 'Chinese';
    if (/[\u3040-\u30FF]/.test(combinedText)) return 'Japanese';
    if (/[\uac00-\ud7af]/.test(combinedText)) return 'Korean';
    if (/[\u0900-\u097F]/.test(combinedText)) return 'Hindi';

    // 2. Keyword heuristic checks for Latin-based languages
    const lower = combinedText.toLowerCase();

    const spanishPattern = /\b(hola|gracias|por|favor|buenos|dias|tardes|amigo|como|esta|estás|estàs|que|qué|para|con|pero|bien|mucho|nada|este|esta|todo|hacer|tengo|quiero)\b/gi;
    const frenchPattern = /\b(bonjour|merci|salut|oui|comment|avec|pour|mais|bien|voilà|suis|est|faire|tout|mon|ma|mes|cette|monde|aujourd'hui)\b/gi;
    const germanPattern = /\b(hallo|danke|guten|tag|morgen|bitte|wie|gehts|geht's|ja|nein|mit|und|oder|ich|nicht|ist|das|dass|alles|gut|willkommen)\b/gi;
    const portuguesePattern = /\b(olá|ola|obrigado|obrigada|por|favor|sim|como|está|esta|tudo|bem|muito|para|com|mais|fazer|tenho)\b/gi;
    const italianPattern = /\b(ciao|grazie|prego|per|favore|come|stai|bene|tutto|sono|anche|questo|molto|fare|buongiorno)\b/gi;
    const dutchPattern = /\b(hallo|dank|dankjewel|alsjeblieft|hoe|gaat|het|met|jou|ook|niet|is|een|voor|maar|welkom)\b/gi;
    const hinglishPattern = /\b(namaste|kaise|ho|kya|hai|bhai|kaisa|ha|haan|acha|accha|thiik|kuch|batao|kar|rahe|karo)\b/gi;

    const scoreEs = (lower.match(spanishPattern) || []).length;
    const scoreFr = (lower.match(frenchPattern) || []).length;
    const scoreDe = (lower.match(germanPattern) || []).length;
    const scorePt = (lower.match(portuguesePattern) || []).length;
    const scoreIt = (lower.match(italianPattern) || []).length;
    const scoreNl = (lower.match(dutchPattern) || []).length;
    const scoreHinglish = (lower.match(hinglishPattern) || []).length;

    const scores = [
      { lang: 'Spanish', score: scoreEs },
      { lang: 'French', score: scoreFr },
      { lang: 'German', score: scoreDe },
      { lang: 'Portuguese', score: scorePt },
      { lang: 'Italian', score: scoreIt },
      { lang: 'Dutch', score: scoreNl },
      { lang: 'Hinglish', score: scoreHinglish },
    ];

    scores.sort((a, b) => b.score - a.score);

    if (scores[0].score >= 2) {
      return scores[0].lang;
    }

    return 'English';
  }
}
