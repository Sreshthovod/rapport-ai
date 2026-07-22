export type RelationshipType = 'friend' | 'family' | 'work' | 'unknown';

export interface CommunicationStyle {
  formality: 'formal' | 'casual';
  playfulness: 'playful' | 'serious';
  expressiveness: 'emotionally_expressive' | 'concise';
}

export interface RelationshipProfile {
  contactId: string;
  contactName: string;
  relationshipType: RelationshipType;
  totalInteractions: number;
  firstSeenTimestamp: number;
  lastSeenTimestamp: number;
  averageMessageLength: number;
  commonTopics: string[];
  recurringPhrases: string[];
  preferredLanguage: string;
  interactionScore: number;
}

export interface RelationshipContext {
  relationshipType: RelationshipType;
  communicationStyle: CommunicationStyle;
  engagementLevel: 'high' | 'medium' | 'low';
  commonTopics: string[];
  preferredTone: string;
  confidence: number;
  interactionScore: number;
}
