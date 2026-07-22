import { CanonicalMessage, ChatMessage } from '@rapport/shared';

export class MessageNormalizer {
  public static normalizeMessage(msg: ChatMessage | Record<string, unknown>, index: number = 0): CanonicalMessage {
    const rawId = (msg as ChatMessage).id || `msg_${Date.now()}_${index}`;
    const rawSender = (msg as ChatMessage).author || (msg as { sender?: string }).sender || 'Unknown';
    const rawText = (msg as ChatMessage).text || '';
    const rawTimestamp = typeof (msg as ChatMessage).timestamp === 'number' ? (msg as ChatMessage).timestamp : Date.now();
    const rawDirection = (msg as ChatMessage).direction || 'incoming';

    const sanitizedText = rawText
      .replace(/[\u200b\u200e\u200f\uFEFF]/g, '')
      .trim();

    let msgType: 'text' | 'system' | 'media' | 'unknown' = 'text';
    if (!sanitizedText) {
      msgType = 'unknown';
    } else if (sanitizedText.startsWith('📷 Photo') || sanitizedText.startsWith('🎥 Video') || sanitizedText.startsWith('📄 Document')) {
      msgType = 'media';
    }

    return {
      id: String(rawId),
      sender: String(rawSender).trim(),
      timestamp: Number(rawTimestamp),
      text: sanitizedText,
      direction: rawDirection === 'outgoing' ? 'outgoing' : 'incoming',
      type: msgType,
      quotedMessage: null,
      attachments: [],
      reactions: [],
    };
  }

  public static normalizeMessages(messages: Array<ChatMessage | Record<string, unknown>>): CanonicalMessage[] {
    if (!Array.isArray(messages)) return [];
    return messages
      .map((m, idx) => MessageNormalizer.normalizeMessage(m, idx))
      .filter((m) => m.text.length > 0 || m.type !== 'unknown');
  }
}
