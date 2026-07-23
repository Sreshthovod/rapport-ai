import {
  CanonicalMessage,
  ConversationStage,
  EmotionalTone,
  InferredRelationship,
  LatestIncomingIntent,
  RecommendedStrategy,
  ReplyTargetInfo,
  StyleMetrics,
  DetectedToneScore,
  ReplyStrategy,
  TimelineEvent,
  ConversationHealthMetrics,
  ConversationIntelligence,
} from '@rapport/shared';
import { LanguageDetector } from '../context/LanguageDetector.js';

export class IntelligenceV2Analyzer {
  public static analyzeStage(messages: CanonicalMessage[], currentTopic: string): ConversationStage {
    if (!messages || messages.length === 0) return 'Opening';
    const text = messages.map((m) => m.text).join(' ').toLowerCase();
    const latestText = (messages[messages.length - 1]?.text || '').toLowerCase();

    if (messages.length <= 2 && /(hi|hello|hey|good morning|sup|greetings)/i.test(latestText)) {
      return 'Opening';
    }
    if (/(bye|good night|talk later|ttyl|see ya|have a good day|take care)/i.test(latestText)) {
      return 'Ending conversation';
    }
    if (/(when|where|what time|meet|schedule|plan|tomorrow|lunch|dinner|calendar)/i.test(text)) {
      return 'Planning';
    }
    if (/(sorry|sad|upset|rough day|crying|feel bad|depressed|hard time)/i.test(text)) {
      return 'Emotional support';
    }
    if (/(issue|annoyed|wrong|fault|stop doing|disagree|angry)/i.test(text)) {
      return 'Conflict';
    }
    if (messages.length > 8) {
      return 'Active discussion';
    }
    return 'Casual chatting';
  }

  public static analyzeLatestIntent(target?: ReplyTargetInfo, latestMsg?: CanonicalMessage): LatestIncomingIntent {
    const text = (
      (target?.targetIncomingMessages || []).map((m) => m.text).join(' ') ||
      latestMsg?.text ||
      ''
    ).toLowerCase();

    if (!text.trim()) return 'Unknown';

    if (text.includes('?')) return 'Question';
    if (/(haha|lol|rofl|funny|lmao|😂|🤣|🤪)/i.test(text)) return 'Joke';
    if (/(thanks|thank you|appreciate|grateful|cheers|means a lot)/i.test(text)) return 'Appreciation';
    if (/(wanna|want to|come|join|let's|lunch|dinner|meet up)/i.test(text)) return 'Invitation';
    if (/(cute|babe|love|miss you|sweetheart|❤️|😘)/i.test(text)) return 'Flirting';
    if (/(please|could you|can you|send me|need|help)/i.test(text)) return 'Request';
    if (/(annoying|hate|horrible|broken|worst|wrong|frustrated)/i.test(text)) return 'Complaint';
    if (/(following up|update|checking in|did you)/i.test(text)) return 'Follow-up';

    return 'Information';
  }

  public static analyzeEmotion(messages: CanonicalMessage[]): EmotionalTone {
    const detailed = this.analyzeDetailedEmotions(messages);
    for (const item of detailed) {
      const tone = item.tone;
      if (['Happy', 'Excited', 'Curious', 'Neutral', 'Sad', 'Angry', 'Frustrated', 'Nervous', 'Playful'].includes(tone)) {
        return tone as EmotionalTone;
      }
      if (tone === 'Confused') return 'Curious';
      if (tone === 'Anxious') return 'Nervous';
      if (tone === 'Disappointed') return 'Sad';
      if (tone === 'Empathetic') return 'Happy';
      if (tone === 'Hopeful') return 'Happy';
      if (tone === 'Calm') return 'Neutral';
    }
    return 'Neutral';
  }

  public static analyzeDetailedEmotions(messages: CanonicalMessage[]): DetectedToneScore[] {
    if (!messages || messages.length === 0) {
      return [{ tone: 'Neutral', confidence: 1.0 }];
    }

    const allText = messages.map((m) => m.text).join(' ').toLowerCase();

    const patterns: Record<string, { regex: RegExp; weight: number }> = {
      Happy: { regex: /(happy|glad|good|wonderful|😊|❤️|🙂)/i, weight: 0.95 },
      Excited: { regex: /(yay|awesome|great|excited|can't wait|wow|🎉|🥳|🚀)/i, weight: 0.95 },
      Calm: { regex: /(calm|relaxed|peace|chill|no worries|okay|sure)/i, weight: 0.85 },
      Sad: { regex: /(sad|sorry|miss|down|depressed|cry|😭|💔)/i, weight: 0.95 },
      Angry: { regex: /(angry|furious|mad|hate|nonsense|stupid)/i, weight: 0.95 },
      Disappointed: { regex: /(disappointed|let down|shame|unfortunately|too bad|alas)/i, weight: 0.95 },
      Nervous: { regex: /(nervous|anxious|scared|worried|stress|shaking)/i, weight: 0.85 },
      Confused: { regex: /(confused|puzzled|dont understand|huh|\?)/i, weight: 0.70 },
      Anxious: { regex: /(anxious|worried|scared|fear|uneasy)/i, weight: 0.85 },
      Empathetic: { regex: /(feel you|understand|comfort|so sorry to hear|hug)/i, weight: 0.85 },
      Frustrated: { regex: /(frustrated|annoyed|exhausted|tired|fed up|ugh|sigh)/i, weight: 0.95 },
      Hopeful: { regex: /(hope|wish|finger crossed|optimistic|looking forward)/i, weight: 0.85 },
    };

    const scores: DetectedToneScore[] = [];
    for (const [emotion, config] of Object.entries(patterns)) {
      let score = 0;
      if (config.regex.test(allText)) {
        score = config.weight;
        // Boost if matches are in the very last message
        const latestText = (messages[messages.length - 1]?.text || '').toLowerCase();
        if (config.regex.test(latestText)) {
          score = Math.min(1.0, config.weight + 0.1);
        }
      }
      if (score > 0) {
        scores.push({ tone: emotion, confidence: score });
      }
    }

    if (scores.length === 0) {
      scores.push({ tone: 'Neutral', confidence: 0.8 });
    }

    return scores.sort((a, b) => b.confidence - a.confidence);
  }

  public static inferRelationship(messages: CanonicalMessage[]): InferredRelationship {
    if (!messages || messages.length === 0) return 'Unknown';
    const text = messages.map((m) => m.text).join(' ').toLowerCase();

    if (/(babe|love you|miss you|sweetheart|honey|kiss|❤️|😘)/i.test(text)) {
      return 'Romantic Interest';
    }
    if (/(mom|dad|bro|sis|brother|sister|family|grandma|grandpa)/i.test(text)) {
      return 'Family';
    }
    if (/(exam|prof|class|assignment|lecture|homework|campus|course)/i.test(text)) {
      return 'Classmate';
    }
    if (/(meeting|deadline|project|office|client|regards|agenda|deliverable)/i.test(text)) {
      return 'Colleague';
    }
    if (/(sincerely|kindly|attached|please find|as per our conversation)/i.test(text)) {
      return 'Professional';
    }

    const emojiCount = (text.match(/(?:[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD00-\uDDFF])/g) || []).length;
    if (messages.length > 10 || emojiCount > 5 || /(haha|lol|buddy|dude|bestie)/i.test(text)) {
      return 'Close Friend';
    }

    return 'Friend';
  }

  public static analyzeStyle(messages: CanonicalMessage[]): StyleMetrics {
    if (!messages || messages.length === 0) {
      return { formality: 'casual', avgLength: 'medium', emojiUsage: 'none', detectedLanguage: 'English' };
    }

    const allText = messages.map((m) => m.text).join(' ');
    const totalChars = allText.length;
    const avgLen = totalChars / messages.length;

    let lengthCat: 'short' | 'medium' | 'long' = 'medium';
    if (avgLen < 35) lengthCat = 'short';
    else if (avgLen > 100) lengthCat = 'long';

    const emojiCount = (allText.match(/(?:[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD00-\uDDFF])/g) || []).length;
    let emojiUsage: 'frequent' | 'rare' | 'none' = 'none';
    if (emojiCount >= messages.length) emojiUsage = 'frequent';
    else if (emojiCount > 0) emojiUsage = 'rare';

    const isFormal = /(sincerely|regards|kindly|furthermore|please find|accordingly)/i.test(allText);
    const isCasual = /(haha|lol|hey|sup|bro|dude|wanna|gonna|gsk)/i.test(allText);
    const formality = isFormal && !isCasual ? 'formal' : isCasual && !isFormal ? 'casual' : 'mixed';

    const detectedLanguage = LanguageDetector.detectLanguage(messages);

    return { formality, avgLength: lengthCat, emojiUsage, detectedLanguage };
  }

  public static recommendStrategy(params: {
    stage: ConversationStage;
    latestIntent: LatestIncomingIntent;
    emotion: EmotionalTone;
  }): RecommendedStrategy {
    const { stage, latestIntent, emotion } = params;

    if (latestIntent === 'Question') return 'Answer directly';
    if (latestIntent === 'Invitation' || stage === 'Planning') return 'Confirm plans';
    if (latestIntent === 'Joke' || emotion === 'Playful') return 'Be humorous';
    if (latestIntent === 'Appreciation' || emotion === 'Excited' || emotion === 'Happy') return 'Celebrate';
    if (emotion === 'Sad' || emotion === 'Frustrated' || stage === 'Emotional support') return 'Comfort';
    if (emotion === 'Curious') return 'Be curious';
    if (stage === 'Opening') return 'Encourage conversation';

    return 'Continue topic';
  }

  public static analyzeUrgency(messages: CanonicalMessage[]): 'low' | 'medium' | 'high' {
    if (!messages || messages.length === 0) return 'medium';
    const text = (messages[messages.length - 1]?.text || '').toLowerCase();

    if (/(asap|urgent|emergency|now|immediately|quick|help|call me)/i.test(text)) {
      return 'high';
    }
    if (/(whenever|no rush|later|sometime|no worries)/i.test(text)) {
      return 'low';
    }
    return 'medium';
  }

  public static analyzePreviousTopic(messages: CanonicalMessage[], currentTopic: string): string {
    if (messages.length < 5) return 'None';
    // Slice off the last few messages and analyze the earlier ones
    const earlierMessages = messages.slice(0, Math.floor(messages.length * 0.7));
    const earlierText = earlierMessages.map((m) => m.text).join(' ').toLowerCase();

    if (earlierText.includes('when') || earlierText.includes('meet') || earlierText.includes('schedule')) {
      return 'Scheduling & Alignment';
    }
    if (earlierText.includes('project') || earlierText.includes('deadline') || earlierText.includes('work')) {
      return 'Work & Project Coordination';
    }
    if (earlierText.includes('dinner') || earlierText.includes('lunch') || earlierText.includes('coffee')) {
      return 'Social Plans';
    }
    return 'General Conversation';
  }

  public static analyzeGoal(topic: string, stage: ConversationStage): string {
    if (topic === 'Scheduling & Alignment' || stage === 'Planning') {
      return 'Align schedules and establish meeting details';
    }
    if (topic === 'Work & Project Coordination') {
      return 'Synchronize project progress and delegate items';
    }
    if (stage === 'Conflict') {
      return 'De-escalate tension and reach mutual understanding';
    }
    if (stage === 'Emotional support') {
      return 'Provide empathetic support and reassurance';
    }
    return 'Maintain friendly rapport and bonding';
  }

  public static analyzeSentiment(messages: CanonicalMessage[]): 'positive' | 'negative' | 'neutral' {
    if (!messages || messages.length === 0) return 'neutral';
    const text = messages.map((m) => m.text).join(' ').toLowerCase();

    const posCount = (text.match(/(happy|glad|good|wonderful|thanks|thank you|awesome|congrats|love|great|celebrate)/g) || []).length;
    const negCount = (text.match(/(sorry|sad|upset|angry|hate|issue|bad|wrong|disagree|frustrated|broken)/g) || []).length;

    if (posCount > negCount) return 'positive';
    if (negCount > posCount) return 'negative';
    return 'neutral';
  }

  public static analyzeEnergyLevel(messages: CanonicalMessage[]): 'low' | 'medium' | 'high' {
    if (!messages || messages.length === 0) return 'medium';
    const allText = messages.map((m) => m.text).join(' ');

    const exclamationCount = (allText.match(/!/g) || []).length;
    const emojiCount = (allText.match(/(?:[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD00-\uDDFF])/g) || []).length;

    if (exclamationCount + emojiCount > 3) return 'high';
    if (messages.length >= 2) {
      const avgDiff = (messages[messages.length - 1].timestamp - messages[0].timestamp) / messages.length;
      if (avgDiff > 30 * 60 * 1000) return 'low';
    }
    return 'medium';
  }

  public static analyzeDominantParticipant(messages: CanonicalMessage[]): 'Me' | 'Other' | 'Equal' {
    if (!messages || messages.length === 0) return 'Equal';
    const outgoing = messages.filter((m) => m.direction === 'outgoing').length;
    const incoming = messages.filter((m) => m.direction === 'incoming').length;

    if (outgoing > incoming * 1.5) return 'Me';
    if (incoming > outgoing * 1.5) return 'Other';
    return 'Equal';
  }

  public static analyzeSpeakingBalance(messages: CanonicalMessage[]): string {
    if (!messages || messages.length === 0) return 'Me: 50%, Other: 50%';
    const meChars = messages.filter((m) => m.direction === 'outgoing').reduce((sum, m) => sum + m.text.length, 0);
    const otherChars = messages.filter((m) => m.direction === 'incoming').reduce((sum, m) => sum + m.text.length, 0);
    const total = meChars + otherChars;

    if (total === 0) return 'Me: 50%, Other: 50%';
    const mePercent = Math.round((meChars / total) * 100);
    const otherPercent = 100 - mePercent;

    return `Me: ${mePercent}%, Other: ${otherPercent}%`;
  }

  public static analyzeConversationHealthScore(
    messages: CanonicalMessage[],
    health: ConversationHealthMetrics,
    sentiment: 'positive' | 'negative' | 'neutral'
  ): number {
    let score = 100;

    // 1. Speaking balance penalty
    if (health.balanceScore < 0.3) {
      score -= 20;
    } else if (health.balanceScore < 0.5) {
      score -= 10;
    }

    // 2. Slow pace penalty
    if (health.replyPace === 'Slow replies') {
      score -= 15;
    }

    // 3. Sentiment penalty
    if (sentiment === 'negative') {
      score -= 15;
    }

    // 4. Inactivity penalty
    if (health.isRecentlyInactive) {
      score -= 20;
    }

    return Math.max(10, Math.min(100, score));
  }

  public static analyzeReplyStrategy(messages: CanonicalMessage[], intel: Partial<ConversationIntelligence>): ReplyStrategy {
    const latest = messages[messages.length - 1];
    const isQuestion = intel.latestIntent === 'Question';
    const isSupport = intel.stage === 'Emotional support';
    const isConflict = intel.stage === 'Conflict';
    const isUrgent = intel.urgency === 'high';
    const isLong = intel.styleMetrics?.avgLength === 'long';

    return {
      shouldReplyNow: latest ? latest.direction === 'incoming' : true,
      shouldAskQuestion: isSupport || intel.stage === 'Opening' || (intel.health?.balanceScore ?? 1.0) < 0.4,
      shouldReassure: isSupport || isConflict || intel.primaryEmotion === 'Sad' || intel.primaryEmotion === 'Nervous',
      shouldChangeTopic: intel.health?.isRecentlyInactive || (messages.length > 20 && intel.health?.replyPace === 'Slow replies'),
      shouldContinueTopic: !(intel.health?.isRecentlyInactive),
      shouldBeConcise: isUrgent || intel.styleMetrics?.avgLength === 'short',
      shouldBeDetailed: isLong && !isUrgent,
      subjectsToAvoid: isConflict ? ['blame', 'criticism', 'argument', 'fault'] : [],
    };
  }

  public static analyzeTimelineEvents(messages: CanonicalMessage[]): TimelineEvent[] {
    const events: TimelineEvent[] = [];
    const keywords: { type: TimelineEvent['type']; regex: RegExp; desc: string }[] = [
      { type: 'meeting', regex: /(meet|call|zoom|calendar|meeting)/i, desc: 'Upcoming coordination/meeting' },
      { type: 'birthday', regex: /(birthday|bday|born)/i, desc: 'Birthday celebration' },
      { type: 'travel', regex: /(trip|flight|travel|vacation|train|visit)/i, desc: 'Travel or visit plans' },
      { type: 'promise', regex: /(promise|will do|swear|guarantee)/i, desc: 'Interpersonal commitment/promise' },
      { type: 'task', regex: /(todo|task|action item|do this)/i, desc: 'Assigned task' },
      { type: 'followup', regex: /(follow up|check back|status)/i, desc: 'Follow-up requirement' },
    ];

    for (const msg of messages.slice(-10)) { // look at recent messages
      for (const kw of keywords) {
        if (kw.regex.test(msg.text)) {
          events.push({
            type: kw.type,
            description: `${kw.desc}: "${msg.text.slice(0, 40)}${msg.text.length > 40 ? '...' : ''}"`,
          });
          break; // Avoid registering multiple event types for the same message
        }
      }
    }

    return events;
  }
}
