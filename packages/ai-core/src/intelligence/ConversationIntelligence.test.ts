import { CanonicalMessage, ConversationIntelligence } from '@rapport/shared';
import { ConversationIntelligenceEngine } from './ConversationIntelligenceEngine.js';

export interface IntelligenceTestResult {
  passed: boolean;
  stage: string;
  topic: string;
  previousTopic?: string;
  primaryEmotion: string;
  urgency: string;
  sentiment: string;
  dominantParticipant: string;
  speakingBalance: string;
  healthScore?: number;
  goal?: string;
  timelineEventsCount: number;
  details?: string;
}

export class ConversationIntelligenceTest {
  public static runTests(): { passed: boolean; results: Record<string, IntelligenceTestResult> } {
    const results: Record<string, IntelligenceTestResult> = {};
    let allPassed = true;

    // Test Case 1: Short Planning Chat
    try {
      const messages: CanonicalMessage[] = [
        { id: 'm1', sender: 'Alice', timestamp: Date.now() - 60000, text: 'Hey, are you free tomorrow?', direction: 'incoming', type: 'text', attachments: [], reactions: [] },
        { id: 'm2', sender: 'User', timestamp: Date.now() - 40000, text: 'Yeah, I should be. Why?', direction: 'outgoing', type: 'text', attachments: [], reactions: [] },
        { id: 'm3', sender: 'Alice', timestamp: Date.now() - 20000, text: 'Let us meet for coffee at 3 PM at Blue Tokai.', direction: 'incoming', type: 'text', attachments: [], reactions: [] },
      ];

      const intel = ConversationIntelligenceEngine.analyze({ messages, contactId: 'alice_plan' });
      const passed = intel.stage === 'Planning' && 
                     intel.topic === 'Scheduling & Alignment' &&
                     intel.energyLevel === 'medium' &&
                     (intel.timelineEvents?.length ?? 0) > 0;

      results['Short Planning Chat'] = {
        passed,
        stage: intel.stage,
        topic: intel.topic,
        previousTopic: intel.previousTopic,
        primaryEmotion: intel.primaryEmotion,
        urgency: intel.urgency,
        sentiment: intel.sentiment || 'N/A',
        dominantParticipant: intel.dominantParticipant || 'N/A',
        speakingBalance: intel.speakingBalance || 'N/A',
        healthScore: intel.conversationHealthScore,
        goal: intel.conversationGoal,
        timelineEventsCount: intel.timelineEvents?.length ?? 0,
      };
      if (!passed) allPassed = false;
    } catch (e) {
      results['Short Planning Chat'] = {
        passed: false,
        stage: 'Error',
        topic: 'Error',
        primaryEmotion: 'Error',
        urgency: 'medium',
        sentiment: 'neutral',
        dominantParticipant: 'Equal',
        speakingBalance: 'N/A',
        timelineEventsCount: 0,
        details: String(e),
      };
      allPassed = false;
    }

    // Test Case 2: Argument / Conflict Chat
    try {
      const messages: CanonicalMessage[] = [
        { id: 'm1', sender: 'Bob', timestamp: Date.now() - 100000, text: 'This is completely wrong and unacceptable.', direction: 'incoming', type: 'text', attachments: [], reactions: [] },
        { id: 'm2', sender: 'User', timestamp: Date.now() - 80000, text: 'I did what you asked me to do.', direction: 'outgoing', type: 'text', attachments: [], reactions: [] },
        { id: 'm3', sender: 'Bob', timestamp: Date.now() - 60000, text: 'No, you did not. I am extremely frustrated with your response.', direction: 'incoming', type: 'text', attachments: [], reactions: [] },
        { id: 'm4', sender: 'User', timestamp: Date.now() - 40000, text: 'Stop saying that it is my fault.', direction: 'outgoing', type: 'text', attachments: [], reactions: [] },
      ];

      const intel = ConversationIntelligenceEngine.analyze({ messages, contactId: 'bob_conflict' });
      const passed = intel.stage === 'Conflict' && 
                     intel.primaryEmotion === 'Frustrated' &&
                     intel.sentiment === 'negative';

      results['Conflict Chat'] = {
        passed,
        stage: intel.stage,
        topic: intel.topic,
        previousTopic: intel.previousTopic,
        primaryEmotion: intel.primaryEmotion,
        urgency: intel.urgency,
        sentiment: intel.sentiment || 'N/A',
        dominantParticipant: intel.dominantParticipant || 'N/A',
        speakingBalance: intel.speakingBalance || 'N/A',
        healthScore: intel.conversationHealthScore,
        goal: intel.conversationGoal,
        timelineEventsCount: intel.timelineEvents?.length ?? 0,
      };
      if (!passed) allPassed = false;
    } catch (e) {
      results['Conflict Chat'] = {
        passed: false,
        stage: 'Error',
        topic: 'Error',
        primaryEmotion: 'Error',
        urgency: 'medium',
        sentiment: 'neutral',
        dominantParticipant: 'Equal',
        speakingBalance: 'N/A',
        timelineEventsCount: 0,
        details: String(e),
      };
      allPassed = false;
    }

    // Test Case 3: Professional Coordination
    try {
      const messages: CanonicalMessage[] = [
        { id: 'm1', sender: 'Mr. Jones', timestamp: Date.now() - 120000, text: 'Please find the agenda attached for our next client project meeting.', direction: 'incoming', type: 'text', attachments: [], reactions: [] },
        { id: 'm2', sender: 'User', timestamp: Date.now() - 90000, text: 'Thank you, I will review it before the deadline.', direction: 'outgoing', type: 'text', attachments: [], reactions: [] },
        { id: 'm3', sender: 'Mr. Jones', timestamp: Date.now() - 60000, text: 'We must present the final deliverable tomorrow. ASAP.', direction: 'incoming', type: 'text', attachments: [], reactions: [] },
      ];

      const intel = ConversationIntelligenceEngine.analyze({ messages, contactId: 'jones_work' });
      const passed = (intel.inferredRelationship === 'Professional' || intel.inferredRelationship === 'Colleague') && 
                     intel.urgency === 'high' &&
                     (intel.topic === 'Work & Project Coordination' || intel.topic === 'Scheduling & Alignment');

      results['Professional Coordination'] = {
        passed,
        stage: intel.stage,
        topic: intel.topic,
        previousTopic: intel.previousTopic,
        primaryEmotion: intel.primaryEmotion,
        urgency: intel.urgency,
        sentiment: intel.sentiment || 'N/A',
        dominantParticipant: intel.dominantParticipant || 'N/A',
        speakingBalance: intel.speakingBalance || 'N/A',
        healthScore: intel.conversationHealthScore,
        goal: intel.conversationGoal,
        timelineEventsCount: intel.timelineEvents?.length ?? 0,
      };
      if (!passed) allPassed = false;
    } catch (e) {
      results['Professional Coordination'] = {
        passed: false,
        stage: 'Error',
        topic: 'Error',
        primaryEmotion: 'Error',
        urgency: 'medium',
        sentiment: 'neutral',
        dominantParticipant: 'Equal',
        speakingBalance: 'N/A',
        timelineEventsCount: 0,
        details: String(e),
      };
      allPassed = false;
    }

    return { passed: allPassed, results };
  }
}
