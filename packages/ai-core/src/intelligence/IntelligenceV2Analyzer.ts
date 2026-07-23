import {
  CanonicalMessage,
  ConversationStage,
  EmotionalTone,
  InferredRelationship,
  LatestIncomingIntent,
  RecommendedStrategy,
  ReplyTargetInfo,
  StyleMetrics,
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
    if (!messages || messages.length === 0) return 'Neutral';
    const text = messages.map((m) => m.text).join(' ').toLowerCase();

    if (/(yay|awesome|great|excited|can't wait|🎉|🥳|🚀)/i.test(text)) return 'Excited';
    if (/(haha|lol|rofl|funny|lmao|😂|🤣|🤪)/i.test(text)) return 'Playful';
    if (/(happy|glad|good|wonderful|😊|❤️)/i.test(text)) return 'Happy';
    if (/(sad|sorry|miss|down|depressed|😭|💔)/i.test(text)) return 'Sad';
    if (/(angry|furious|annoyed|mad|hate)/i.test(text)) return 'Angry';
    if (/(frustrated|struggling|exhausted|tired|sigh)/i.test(text)) return 'Frustrated';
    if (/(nervous|anxious|scared|worried|stress)/i.test(text)) return 'Nervous';
    if (text.includes('?')) return 'Curious';

    return 'Neutral';
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
}
