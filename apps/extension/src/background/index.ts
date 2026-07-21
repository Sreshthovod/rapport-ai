import { FakeAIService } from '@rapport/ai-core';
import {
  AIReplyRequestPayload,
  AIReplyResponsePayload,
  RAPPORT_AI_GENERATE_REPLY,
} from '@rapport/shared';

console.log('[Rapport AI] Background Service Worker initialized.');

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

      FakeAIService.generateReply(message.context)
        .then((aiData) => {
          sendResponse({
            success: true,
            data: aiData,
          });
        })
        .catch((err: Error) => {
          console.error('[Rapport AI:Background] FakeAIService error:', err);
          sendResponse({
            success: false,
            error: err.message || 'Failed to generate AI response.',
          });
        });

      return true; // Keep message channel open for async sendResponse
    }
    return false;
  }
);
