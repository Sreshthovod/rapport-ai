import { StructuredAIContext, CanonicalMessage } from '@rapport/shared';
import { ReplyQualityEvaluator } from './ReplyQualityEvaluator.js';

export interface QualityTestResult {
  passed: boolean;
  score: number;
  isValid: boolean;
  issues: string[];
  details?: string;
}

export class ReplyQualityTest {
  public static runTests(): { passed: boolean; results: Record<string, QualityTestResult> } {
    const results: Record<string, QualityTestResult> = {};
    let allPassed = true;

    const baseContext: StructuredAIContext = {
      conversation: {
        participants: ['Alice', 'User'],
        messageCount: 5,
        lastActive: Date.now(),
        firstMessage: null,
        latestMessage: null,
        conversationDurationMs: 120000,
        conversationHealth: 'healthy',
      },
      summary: {
        recentSummary: 'Chatting about weekend plans',
        currentTopic: 'Weekend plans',
        detectedTone: 'Friendly',
        conversationStage: 'Planning',
        pendingQuestions: ['Are we meeting tomorrow?'],
        importantFacts: [],
        userIntent: 'Answer question',
        suggestedGoal: 'Schedule meeting',
      },
      tone: 'Friendly',
      stage: 'Planning',
      language: 'English',
      recentMessages: [
        { id: 'm1', sender: 'Alice', timestamp: Date.now() - 30000, text: 'Are we meeting tomorrow?', direction: 'incoming', type: 'text', attachments: [], reactions: [] },
      ],
      extractedFacts: [],
      pendingQuestions: ['Are we meeting tomorrow?'],
      replyTarget: {
        hasTargetMessages: true,
        lastOutgoingMessage: null,
        targetIncomingMessages: [
          { id: 'm1', sender: 'Alice', timestamp: Date.now() - 30000, text: 'Are we meeting tomorrow?', direction: 'incoming', type: 'text', attachments: [], reactions: [] }
        ],
        targetTextSummary: 'Are we meeting tomorrow?',
        isAwaitingContactReply: false,
      }
    };

    // Test Case 1: High Quality Conversational Reply
    try {
      const suggestion = 'Yes! Let us meet tomorrow at 2 PM at the usual cafe.';
      const report = ReplyQualityEvaluator.evaluate(suggestion, baseContext, 'Friendly');
      const passed = report.isValid && report.overallScore >= 75 && report.issues.length === 0;
      results['High Quality Reply'] = { passed, score: report.overallScore, isValid: report.isValid, issues: report.issues };
      if (!passed) allPassed = false;
    } catch (e) {
      results['High Quality Reply'] = { passed: false, score: 0, isValid: false, issues: [String(e)] };
      allPassed = false;
    }

    // Test Case 2: Robotic self-referencing message
    try {
      const suggestion = 'As an AI language model, I suggest meeting tomorrow.';
      const report = ReplyQualityEvaluator.evaluate(suggestion, baseContext, 'Friendly');
      const passed = !report.isValid && report.overallScore < 85 && report.issues.includes('Contains robotic / AI self-reference phrasing');
      results['Robotic Phrase Detection'] = { passed, score: report.overallScore, isValid: report.isValid, issues: report.issues };
      if (!passed) allPassed = false;
    } catch (e) {
      results['Robotic Phrase Detection'] = { passed: false, score: 0, isValid: false, issues: [String(e)] };
      allPassed = false;
    }

    // Test Case 3: Formatting Artifacts (Quotes and Sender prefix)
    try {
      const suggestion = 'ME: "Yes, tomorrow works"';
      const report = ReplyQualityEvaluator.evaluate(suggestion, baseContext, 'Friendly');
      const passed = !report.isValid && report.issues.includes('Contains formatting artifacts (quotes, lists, prefixes)');
      results['Formatting Artifact Detection'] = { passed, score: report.overallScore, isValid: report.isValid, issues: report.issues };
      if (!passed) allPassed = false;
    } catch (e) {
      results['Formatting Artifact Detection'] = { passed: false, score: 0, isValid: false, issues: [String(e)] };
      allPassed = false;
    }

    // Test Case 4: Double spacing and bad punctuation spaces
    try {
      const suggestion = 'Sure , tomorrow  works.';
      const report = ReplyQualityEvaluator.evaluate(suggestion, baseContext, 'Friendly');
      const passed = report.issues.includes('Unnatural whitespace spacing before punctuation marks') &&
                     report.issues.includes('Double or consecutive whitespace spaces');
      results['Punctuation Spacing Check'] = { passed, score: report.overallScore, isValid: report.isValid, issues: report.issues };
      if (!passed) allPassed = false;
    } catch (e) {
      results['Punctuation Spacing Check'] = { passed: false, score: 0, isValid: false, issues: [String(e)] };
      allPassed = false;
    }

    return { passed: allPassed, results };
  }
}
