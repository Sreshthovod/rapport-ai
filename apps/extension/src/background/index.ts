import { AIService } from '@rapport/ai-core';
import {
  AIReplyRequestPayload,
  AIReplyResponsePayload,
  RAPPORT_AI_GENERATE_REPLY,
} from '@rapport/shared';

console.log('[Rapport AI] Background Service Worker initialized.');

const aiService = new AIService();

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Rapport AI] Extension installed successfully.');
});

chrome.runtime.onMessage.addListener(
  (
    message: AIReplyRequestPayload,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: AIReplyResponsePayload) => void
  ) => {
    if (message.type === RAPPORT_AI_GENERATE_REPLY) {
      console.log('[Rapport AI:Background] Received AI reply request for contact:', message.context?.contact?.contactName);

      aiService
        .generateReply({ conversation: message.context })
        .then((result) => {
          if (result.success && result.data) {
            sendResponse({
              success: true,
              data: {
                suggestedReply: result.data.suggestedReply,
                reasoning: result.data.reasoning,
                tone: result.data.tone,
              },
            });
          } else {
            sendResponse({
              success: false,
              error: result.error || 'Failed to generate AI response.',
            });
          }
        })
        .catch((err: Error) => {
          console.error('[Rapport AI:Background] AIService error:', err);
          sendResponse({
            success: false,
            error: err.message || 'Failed to generate AI response.',
          });
        });

      return true;
    }
    return false;
  }
);
