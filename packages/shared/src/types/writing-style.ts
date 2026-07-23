export interface WritingStyleProfile {
  /** Estimated average word count per outgoing message */
  avgMessageLength: number;

  /** Emoji count per 100 messages (0 = none, 100+ = very heavy) */
  emojiFrequency: number;

  /** 0–1, ratio of messages containing slang tokens */
  slangRatio: number;

  /** 0–1, ratio of messages with Hinglish content (Hindi words mixed with English) */
  hinglishRatio: number;

  /** 0–1, ratio of messages that start with an uppercase letter */
  capitalizationRatio: number;

  /** 0–1, ratio of messages that end with a terminal punctuation mark (. ! ?) */
  punctuationRatio: number;

  /** Most frequent greeting openers detected (up to 5) */
  greetingPatterns: string[];

  /** Most frequent closing patterns detected (up to 5) */
  closingPatterns: string[];

  /** Top recurring personal phrases / tokens (up to 10) */
  commonPhrases: string[];

  /** Total outgoing messages analyzed to build this profile */
  samplesAnalyzed: number;

  /** Epoch ms of last profile update */
  lastUpdated: number;
}
