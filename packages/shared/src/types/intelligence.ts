export type ConversationStage =
  | 'Opening'
  | 'Active discussion'
  | 'Planning'
  | 'Casual chatting'
  | 'Emotional support'
  | 'Conflict'
  | 'Ending conversation'
  | 'Unknown';

export type LatestIncomingIntent =
  | 'Question'
  | 'Information'
  | 'Request'
  | 'Invitation'
  | 'Joke'
  | 'Complaint'
  | 'Appreciation'
  | 'Flirting'
  | 'Follow-up'
  | 'Unknown';

export type EmotionalTone =
  | 'Happy'
  | 'Excited'
  | 'Curious'
  | 'Neutral'
  | 'Sad'
  | 'Angry'
  | 'Frustrated'
  | 'Nervous'
  | 'Playful';

export type InferredRelationship =
  | 'Friend'
  | 'Close Friend'
  | 'Best Friend'
  | 'Sibling'
  | 'Family'
  | 'Colleague'
  | 'Classmate'
  | 'Professional'
  | 'Romantic Interest'
  | 'Unknown';

export type RecommendedStrategy =
  | 'Answer directly'
  | 'Ask a follow-up question'
  | 'Continue topic'
  | 'Comfort'
  | 'Celebrate'
  | 'Confirm plans'
  | 'Be humorous'
  | 'Be curious'
  | 'Encourage conversation';

export interface StyleMetrics {
  formality: 'casual' | 'formal' | 'mixed';
  avgLength: 'short' | 'medium' | 'long';
  emojiUsage: 'frequent' | 'rare' | 'none';
  detectedLanguage: string;
}

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

export interface ReplyStrategy {
  shouldReplyNow: boolean;
  shouldAskQuestion: boolean;
  shouldReassure: boolean;
  shouldChangeTopic: boolean;
  shouldContinueTopic: boolean;
  shouldBeConcise: boolean;
  shouldBeDetailed: boolean;
  subjectsToAvoid: string[];
}

export interface TimelineEvent {
  type: 'plan' | 'event' | 'date' | 'promise' | 'task' | 'meeting' | 'travel' | 'birthday' | 'followup';
  description: string;
  date?: string;
}

export interface ConversationIntelligence {
  topic: string;
  previousTopic?: string;
  conversationGoal?: string;
  emotionalState?: string;
  energyLevel?: 'low' | 'medium' | 'high';
  sentiment?: 'positive' | 'negative' | 'neutral';
  dominantParticipant?: 'Me' | 'Other' | 'Equal';
  speakingBalance?: string;
  conversationHealthScore?: number;
  stage: ConversationStage;
  latestIntent: LatestIncomingIntent;
  primaryEmotion: EmotionalTone;
  urgency: 'low' | 'medium' | 'high';
  expectedReplyLength: 'short' | 'medium' | 'long';
  inferredRelationship: InferredRelationship;
  styleMetrics: StyleMetrics;
  suggestedStrategy: RecommendedStrategy;
  tones: DetectedToneScore[];
  intents: DetectedIntentScore[];
  health: ConversationHealthMetrics;
  pendingItems: PendingContextItems;
  suggestedGoal: string;
  confidenceScores: Record<string, number>;
  emotions?: DetectedToneScore[];
  replyStrategy?: ReplyStrategy;
  timelineEvents?: TimelineEvent[];
}
