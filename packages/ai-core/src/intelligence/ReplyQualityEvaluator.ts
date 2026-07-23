import { StructuredAIContext, SuggestionQualityReport } from '@rapport/shared';

// Common robotic / AI filler prefixes and markers
const ROBOTIC_PATTERNS = [
  /as an ai/i,
  /regarding your message/i,
  /hope this email finds you/i,
  /i am an artificial intelligence/i,
  /i am programmed/i,
  /as a machine learning model/i,
  /according to the context/i,
  /here is a suggestion/i,
  /here's a reply/i,
  /reply option/i,
];

// Robotic formatting artifacts
const ARTIFACT_PATTERNS = [
  /^"/,
  /"$/,
  /^[0-9]+\.\s+/, // numbered lists e.g. "1. Hello"
  /^-\s+/,        // markdown lists e.g. "- Hello"
  /\\n/,          // raw newline chars
  /\[.*\]\s*:/,   // bracket prefixes like [Balanced]:
  /^[A-Z\s]+:\s*"/i // sender prefixes like ME: "hello"
];

// Slang tokens for playful/informal verification
const CASUAL_SLANG = ['lol', 'bhai', 'yaar', 'bro', 'buddy', 'fr', 'ngl', 'tbh', 'haha', 'dude', 'yo', 'chill', 'sahi', 'pakka'];

export class ReplyQualityEvaluator {
  public static evaluate(
    text: string,
    context: StructuredAIContext,
    suggestionTone: string
  ): SuggestionQualityReport {
    const issues: string[] = [];
    const cleanText = text.trim();

    // ── 1. Repetition Score (0-100) ──────────────────────────────────────────
    let repetition = 100;
    const lowerText = cleanText.toLowerCase();

    // internal word repetition checks
    const words = lowerText.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    const uniqueWords = new Set(words);
    if (words.length > 4) {
      const ratio = uniqueWords.size / words.length;
      if (ratio < 0.5) {
        repetition -= 40;
        issues.push('High internal vocabulary repetition');
      }
    }

    // compare against latest incoming target messages
    const incomingText = (context.replyTarget?.targetIncomingMessages || [])
      .map((m) => m.text.toLowerCase().trim())
      .join(' ');
    if (incomingText && lowerText === incomingText) {
      repetition -= 60;
      issues.push('Identical to incoming target message');
    }

    // compare against last 3 outgoing messages
    const outgoingMessages = (context.recentMessages || [])
      .filter((m) => m.direction === 'outgoing' && m.text)
      .slice(-3);
    for (const out of outgoingMessages) {
      if (lowerText === out.text.toLowerCase().trim()) {
        repetition = 0;
        issues.push('Identical to a recently sent outgoing message');
        break;
      }
    }
    repetition = Math.max(0, repetition);

    // ── 2. Naturalness Score (0-100) ──────────────────────────────────────────
    let naturalness = 100;

    // check robotic phrases
    for (const pat of ROBOTIC_PATTERNS) {
      if (pat.test(cleanText)) {
        naturalness -= 80;
        issues.push('Contains robotic / AI self-reference phrasing');
      }
    }

    // check formatting artifacts
    for (const pat of ARTIFACT_PATTERNS) {
      if (pat.test(cleanText)) {
        naturalness -= 80;
        issues.push('Contains formatting artifacts (quotes, lists, prefixes)');
      }
    }

    // check weird uppercase shouting
    if (cleanText.length > 5 && cleanText === cleanText.toUpperCase() && /[A-Z]/.test(cleanText)) {
      naturalness -= 30;
      issues.push('SHOUTING (all capitals)');
    }
    naturalness = Math.max(0, naturalness);

    // ── 3. Grammar Score (0-100) ──────────────────────────────────────────────
    let grammar = 100;

    // consecutive duplicated punctuation check (e.g. ,, or ??)
    if (/([,,::;;])\1/.test(cleanText)) {
      grammar -= 20;
      issues.push('Invalid consecutive duplicate punctuation');
    }

    // spaces before punctuation (e.g. "hello , there")
    if (/\s+([,.;!?])/.test(cleanText)) {
      grammar -= 15;
      issues.push('Unnatural whitespace spacing before punctuation marks');
    }

    // multiple spaces
    if (/\s{2,}/.test(cleanText)) {
      grammar -= 15;
      issues.push('Double or consecutive whitespace spaces');
    }

    // unbalanced brackets/quotes
    const openBrackets = (cleanText.match(/\(/g) || []).length;
    const closeBrackets = (cleanText.match(/\)/g) || []).length;
    if (openBrackets !== closeBrackets) {
      grammar -= 20;
      issues.push('Unbalanced parentheses');
    }
    grammar = Math.max(0, grammar);

    // ── 4. Context Relevance (0-100) ──────────────────────────────────────────
    let contextRelevance = 100;
    const currentTopic = (context.summary?.currentTopic || '').toLowerCase();

    // Check if suggestion has some token overlap with the active topic or incoming target text
    if (currentTopic && currentTopic !== 'general conversation' && currentTopic.length > 2) {
      const topicWords = currentTopic.split(/\s+/).filter((w) => w.length > 3);
      if (topicWords.length > 0) {
        const hasOverlap = topicWords.some((w) => lowerText.includes(w));
        if (!hasOverlap) {
          // minor penalty for off-topic, not critical if short
          contextRelevance -= 15;
        }
      }
    }

    // extremely short fill responses like "ok" when target incoming is a question
    const targetIsQuestion = (context.replyTarget?.targetIncomingMessages || []).some((m) => m.text.includes('?'));
    if (targetIsQuestion && cleanText.length < 5) {
      contextRelevance -= 40;
      issues.push('Too generic/short to answer a question');
    }
    contextRelevance = Math.max(0, contextRelevance);

    // ── 5. Tone Consistency (0-100) ──────────────────────────────────────────
    let toneConsistency = 100;
    const targetTone = (suggestionTone || 'Balanced').toLowerCase();

    if (targetTone === 'formal' || targetTone === 'professional') {
      // should not contain too much casual internet slang
      const slangHits = CASUAL_SLANG.filter((s) => lowerText.includes(s)).length;
      if (slangHits >= 2) {
        toneConsistency -= 35;
        issues.push('Tone mismatch: too casual/slangy for formal/professional preset');
      }
    } else if (targetTone === 'playful' || targetTone === 'funny' || targetTone === 'creative') {
      // playful replies should have light tone: periods only at the end can make them sound dry
      if (cleanText.length > 10 && !/[!?😂🤣❤️😘🎉✨👋]/.test(cleanText) && cleanText.endsWith('.')) {
        toneConsistency -= 15; // minor penalty for overly dry punctuation in playful preset
      }
    }
    toneConsistency = Math.max(0, toneConsistency);

    // ── 6. Conversation Continuation (0-100) ────────────────────────────────
    let conversationContinuation = 100;
    // Continuation is low if it completely ends the conversation flow in the middle of active chatting
    const currentStage = (context.stage as string) || 'Unknown';
    if (
      (currentStage === 'Active discussion' || currentStage === 'Deep Conversation' || currentStage === 'Planning') &&
      /^(ok|bye|goodnight|fine|cool|nice|ok bye|yes|no)$/i.test(cleanText)
    ) {
      conversationContinuation -= 40;
      issues.push('Stops conversation flow abruptly during active topic stage');
    }
    conversationContinuation = Math.max(0, conversationContinuation);

    // ── Compute Overall Weighted Score ────────────────────────────────────────
    const overallScore = Math.round(
      contextRelevance * 0.25 +
      naturalness * 0.20 +
      grammar * 0.15 +
      repetition * 0.15 +
      toneConsistency * 0.15 +
      conversationContinuation * 0.10
    );

    // suggestion is valid if overallScore >= 60 AND no single dimension is severely broken (< 30)
    const isAnyDimensionSevere =
      contextRelevance < 30 ||
      naturalness < 30 ||
      grammar < 30 ||
      repetition < 30 ||
      toneConsistency < 30 ||
      conversationContinuation < 30;

    const isValid = overallScore >= 60 && !isAnyDimensionSevere;

    return {
      contextRelevance,
      naturalness,
      grammar,
      repetition,
      toneConsistency,
      conversationContinuation,
      overallScore,
      isValid,
      issues,
    };
  }
}
