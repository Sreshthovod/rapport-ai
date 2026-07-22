export interface DetectedToneScore {
  tone: string;
  confidence: number;
}

export interface DetectedIntentScore {
  intent: string;
  confidence: number;
}

export interface ConversationHealthMetrics {
  balanceScore: number;
  balanceStatus: 'Balanced conversation' | 'One-sided conversation';
  engagementLevel: 'High engagement' | 'Low engagement';
  replyPace: 'Fast replies' | 'Slow replies' | 'Moderate replies';
  isRecentlyInactive: boolean;
}

export interface PendingContextItems {
  questionsAwaitingReply: string[];
  unconfirmedPlans: string[];
  datesMentioned: string[];
  commitments: string[];
  tasks: string[];
  promises: string[];
}

export interface ConversationIntelligence {
  topic: string;
  tones: DetectedToneScore[];
  intents: DetectedIntentScore[];
  health: ConversationHealthMetrics;
  pendingItems: PendingContextItems;
  suggestedGoal: string;
  confidenceScores: Record<string, number>;
}
