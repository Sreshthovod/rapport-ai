import { ApiKeyManager, AIService, ContextEngine, SettingsManager } from '@rapport/ai-core';
import { MemoryExtractor, MemoryService } from '@rapport/memory';
import {
  AIReplyRequestPayload,
  AIReplyResponsePayload,
  RAPPORT_AI_GENERATE_REPLY,
} from '@rapport/shared';

console.log('[Rapport AI] Background Service Worker initialized.');

const aiService = new AIService();

// ----------------------------------------------------------------
// 1. Initial settings load & auto-sync with ProviderManager
// ----------------------------------------------------------------
SettingsManager.getInstance()
  .loadSettings()
  .then(() => {
    console.log('[Rapport AI:Background] Settings loaded and ProviderManager synchronized.');
  })
  .catch((err) => {
    console.error('[Rapport AI:Background] Failed to load settings:', err);
  });

// ----------------------------------------------------------------
// 2. Reactively reload settings whenever storage changes in overlay
// ----------------------------------------------------------------
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      const hasSettingsKey = Object.keys(changes).some(
        (key) => key === 'rapport_user_settings' || key.startsWith('rapport_key_')
      );
      if (hasSettingsKey) {
        console.log('[Rapport AI:Background] Storage change detected — clearing API key cache & reloading settings...');
        ApiKeyManager.getInstance().clearMemoryCache();
        SettingsManager.getInstance().loadSettings();
      }
    }
  });
}

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

      // Ensure settings are loaded before executing reply
      SettingsManager.getInstance()
        .loadSettings()
        .then(() => aiService.generateReply({ conversation: message.context }))
        .then((result) => {
          if (result.success && result.data) {
            sendResponse({
              success: true,
              data: {
                suggestedReply: result.data.suggestedReply,
                reasoning: result.data.reasoning,
                tone: result.data.tone,
                suggestions: result.data.suggestions,
                metadata: result.data.metadata,
                providerId: result.data.providerId,
              },
            });

            // ----------------------------------------------------------------
            // 3. Memory Auto-Extraction (runs in background after response)
            // ----------------------------------------------------------------
            const settings = SettingsManager.getInstance().getSettings();
            const contactId = message.context?.contact?.id;

            if (settings.enableMemory && settings.autoExtractMemories && contactId && contactId !== 'unknown') {
              try {
                const structuredContext = ContextEngine.processContext(message.context);
                const candidates = MemoryExtractor.getInstance().extractCandidates({ context: structuredContext });

                if (candidates.length > 0) {
                  const memoryService = new MemoryService();
                  memoryService
                    .processCandidates(contactId, candidates)
                    .then((saved) => {
                      if (saved.length > 0) {
                        console.log(
                          `[Rapport AI:Background] Auto-extracted ${saved.length} memory record(s) for contact: "${contactId}"`
                        );
                      }
                    })
                    .catch((err) => {
                      console.warn('[Rapport AI:Background] Memory extraction candidate saving error:', err);
                    });
                }
              } catch (err) {
                console.warn('[Rapport AI:Background] Context parsing for memory extraction error:', err);
              }
            }
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

