import { CanonicalMessage } from '@rapport/shared';

export interface AnalysisSummary {
  topic: string;
  latestFocus: string;
  direction: 'incoming' | 'outgoing';
  activeParticipants: string[];
  messageCount: number;
}

export class ConversationAnalyzer {
  public static analyze(messages: CanonicalMessage[]): AnalysisSummary {
    if (!messages || messages.length === 0) {
      return {
        topic: 'General Discussion',
        latestFocus: 'No messages available',
        direction: 'incoming',
        activeParticipants: [],
        messageCount: 0,
      };
    }

    const latest = messages[messages.length - 1];
    const participants = Array.from(new Set(messages.map((m) => m.sender).filter(Boolean)));

    // Topic inferencing heuristic
    let topic = 'General Conversation';
    const allText = messages.map((m) => m.text).join(' ').toLowerCase();

    if (allText.includes('when') || allText.includes('meet') || allText.includes('schedule') || allText.includes('time')) {
      topic = 'Scheduling & Alignment';
    } else if (allText.includes('project') || allText.includes('deadline') || allText.includes('report') || allText.includes('work')) {
      topic = 'Work & Project Coordination';
    } else if (allText.includes('dinner') || allText.includes('lunch') || allText.includes('coffee') || allText.includes('party')) {
      topic = 'Social Plans';
    }

    return {
      topic,
      latestFocus: latest.text,
      direction: latest.direction,
      activeParticipants: participants,
      messageCount: messages.length,
    };
  }
}
