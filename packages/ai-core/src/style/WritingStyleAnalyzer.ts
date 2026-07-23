import { CanonicalMessage, WritingStyleProfile } from '@rapport/shared';

// Known English slang tokens
const SLANG_TOKENS = new Set([
  'lol', 'lmao', 'rofl', 'omg', 'wtf', 'ngl', 'imo', 'tbh', 'fr', 'idk',
  'idc', 'brb', 'gtg', 'ttyl', 'smh', 'rn', 'irl', 'fomo', 'yolo', 'lowkey',
  'highkey', 'lit', 'fire', 'vibe', 'sus', 'cap', 'no cap', 'bussin', 'slaps',
  'goat', 'bet', 'slay', 'salty', 'savage', 'mood', 'periodt', 'sksksk',
  'deadass', 'facts', 'fam', 'bruh', 'bro', 'dude', 'yo', 'yep', 'nope',
  'yeah', 'nah',
]);

// Hindi / Hinglish signal words (romanised)
const HINGLISH_TOKENS = new Set([
  'bhai', 'yaar', 'acha', 'theek', 'haan', 'nahi', 'kya', 'kaise', 'kyun',
  'matlab', 'sahi', 'bol', 'kal', 'aaj', 'abhi', 'toh', 'hai', 'hain', 'ho',
  'kar', 'karo', 'mera', 'tera', 'apna', 'tumhara', 'uska', 'unka', 'isko',
  'usko', 'chal', 'chalte', 'arrey', 'arre', 'bola', 'boli', 'likha', 'dekh',
  'dekho', 'sun', 'suno', 'mujhe', 'tujhe', 'humko', 'tumko', 'kab', 'kahan',
  'lekin', 'par', 'phir', 'aur', 'woh', 'yeh', 'waise', 'vaise', 'seedha',
  'pakka', 'bilkul', 'zaroor', 'thoda', 'bahut', 'zyada', 'kam',
]);

// Common greeting openers
const GREETING_SIGNALS = ['hi', 'hey', 'hello', 'sup', 'yo', 'hola', 'heyyy',
  'hii', 'hihi', 'wassup', 'what\'s up', 'howdy', 'namaste', 'bhai'];

// Common closing signals
const CLOSING_SIGNALS = ['bye', 'later', 'ttyl', 'gotta go', 'gtg', 'ok bye',
  'ciao', 'take care', 'good night', 'gn', 'goodnight', 'sleep', 'ttyl',
  'byee', 'bbye', 'bb', 'ok bye', 'alright bye', 'tc'];

// Emoji regex (safe cross-engine version)
const EMOJI_RE = /(?:[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD00-\uDDFF])/g;
const DEVANAGARI_RE = /[\u0900-\u097F]/;

function countEmojis(text: string): number {
  return (text.match(EMOJI_RE) || []).length;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\u0900-\u097F0-9' ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function topNgrams(texts: string[], n: number, topK: number): string[] {
  const freq = new Map<string, number>();
  for (const text of texts) {
    const words = tokenize(text);
    for (let i = 0; i <= words.length - n; i++) {
      const gram = words.slice(i, i + n).join(' ');
      // Skip pure stop-words ngrams
      if (n === 1 && ['i', 'the', 'a', 'is', 'it', 'to', 'in', 'of', 'and', 'you', 'me', 'my', 'on', 'at', 'so', 'do', 'be', 'we', 'he', 'she', 'they', 'was', 'are', 'have', 'has', 'had', 'for', 'with', 'this', 'that', 'ok', 'not', 'but', 'no', 'yes', 'just', 'get', 'got', 'oh'].includes(gram)) continue;
      freq.set(gram, (freq.get(gram) || 0) + 1);
    }
  }
  return [...freq.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([gram]) => gram);
}

export class WritingStyleAnalyzer {
  /**
   * Analyze outgoing messages and produce a WritingStyleProfile.
   * Requires at least 1 message; caller should enforce the minimum threshold.
   */
  public static analyze(outgoing: CanonicalMessage[]): WritingStyleProfile {
    const msgs = outgoing.filter((m) => m.text && m.text.trim().length > 0);
    if (msgs.length === 0) {
      return WritingStyleAnalyzer.emptyProfile();
    }

    const texts = msgs.map((m) => m.text.trim());

    // ── Average message length (words) ─────────────────────────────────────────
    const totalWords = texts.reduce((sum, t) => sum + tokenize(t).length, 0);
    const avgMessageLength = Math.round(totalWords / msgs.length);

    // ── Emoji frequency (per 100 messages) ────────────────────────────────────
    const totalEmojis = texts.reduce((sum, t) => sum + countEmojis(t), 0);
    const emojiFrequency = Math.round((totalEmojis / msgs.length) * 100);

    // ── Slang ratio ────────────────────────────────────────────────────────────
    const msgsWithSlang = texts.filter((t) => {
      const words = tokenize(t);
      return words.some((w) => SLANG_TOKENS.has(w));
    }).length;
    const slangRatio = Math.round((msgsWithSlang / msgs.length) * 100) / 100;

    // ── Hinglish ratio ─────────────────────────────────────────────────────────
    const msgsWithHinglish = texts.filter((t) => {
      if (DEVANAGARI_RE.test(t)) return true;
      const words = tokenize(t);
      return words.some((w) => HINGLISH_TOKENS.has(w));
    }).length;
    const hinglishRatio = Math.round((msgsWithHinglish / msgs.length) * 100) / 100;

    // ── Capitalization ratio ───────────────────────────────────────────────────
    const msgsUppercase = texts.filter((t) => /^[A-Z]/.test(t.trim())).length;
    const capitalizationRatio = Math.round((msgsUppercase / msgs.length) * 100) / 100;

    // ── Punctuation ratio ──────────────────────────────────────────────────────
    const msgsWithPunct = texts.filter((t) => /[.!?]$/.test(t.trim())).length;
    const punctuationRatio = Math.round((msgsWithPunct / msgs.length) * 100) / 100;

    // ── Greeting patterns ──────────────────────────────────────────────────────
    const greetings: Map<string, number> = new Map();
    for (const t of texts) {
      const lower = t.toLowerCase().trim();
      for (const g of GREETING_SIGNALS) {
        if (lower.startsWith(g)) {
          greetings.set(g, (greetings.get(g) || 0) + 1);
          break;
        }
      }
    }
    const greetingPatterns = [...greetings.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([g]) => g);

    // ── Closing patterns ───────────────────────────────────────────────────────
    const closings: Map<string, number> = new Map();
    for (const t of texts) {
      const lower = t.toLowerCase().trim();
      for (const c of CLOSING_SIGNALS) {
        if (lower.endsWith(c) || lower === c) {
          closings.set(c, (closings.get(c) || 0) + 1);
          break;
        }
      }
    }
    const closingPatterns = [...closings.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([c]) => c);

    // ── Common phrases (uni + bigrams) ─────────────────────────────────────────
    const unigrams = topNgrams(texts, 1, 8);
    const bigrams = topNgrams(texts, 2, 4);
    const commonPhrases = [...unigrams, ...bigrams].slice(0, 10);

    return {
      avgMessageLength,
      emojiFrequency,
      slangRatio,
      hinglishRatio,
      capitalizationRatio,
      punctuationRatio,
      greetingPatterns,
      closingPatterns,
      commonPhrases,
      samplesAnalyzed: msgs.length,
      lastUpdated: Date.now(),
    };
  }

  public static emptyProfile(): WritingStyleProfile {
    return {
      avgMessageLength: 0,
      emojiFrequency: 0,
      slangRatio: 0,
      hinglishRatio: 0,
      capitalizationRatio: 0.5,
      punctuationRatio: 0.5,
      greetingPatterns: [],
      closingPatterns: [],
      commonPhrases: [],
      samplesAnalyzed: 0,
      lastUpdated: 0,
    };
  }

  /**
   * Merge an existing profile with a fresh analysis using a weighted average.
   * Existing profile has 70% weight; new analysis has 30% weight.
   * This smooths out noise from short sessions.
   */
  public static merge(existing: WritingStyleProfile, fresh: WritingStyleProfile): WritingStyleProfile {
    const w = 0.7;
    const nw = 0.3;
    const blend = (a: number, b: number) => Math.round((a * w + b * nw) * 100) / 100;

    // Merge string arrays by union, capped at limit
    const mergeList = (a: string[], b: string[], limit: number): string[] => {
      const seen = new Set(a);
      const merged = [...a];
      for (const x of b) {
        if (!seen.has(x)) { merged.push(x); seen.add(x); }
      }
      return merged.slice(0, limit);
    };

    return {
      avgMessageLength: Math.round(blend(existing.avgMessageLength, fresh.avgMessageLength)),
      emojiFrequency: Math.round(blend(existing.emojiFrequency, fresh.emojiFrequency)),
      slangRatio: blend(existing.slangRatio, fresh.slangRatio),
      hinglishRatio: blend(existing.hinglishRatio, fresh.hinglishRatio),
      capitalizationRatio: blend(existing.capitalizationRatio, fresh.capitalizationRatio),
      punctuationRatio: blend(existing.punctuationRatio, fresh.punctuationRatio),
      greetingPatterns: mergeList(fresh.greetingPatterns, existing.greetingPatterns, 5),
      closingPatterns: mergeList(fresh.closingPatterns, existing.closingPatterns, 5),
      commonPhrases: mergeList(fresh.commonPhrases, existing.commonPhrases, 10),
      samplesAnalyzed: existing.samplesAnalyzed + fresh.samplesAnalyzed,
      lastUpdated: Date.now(),
    };
  }
}
