import {
  AIReplyResponsePayload,
  buildConversationContext,
  formatContextLog,
  RAPPORT_AI_GENERATE_REPLY,
} from '@rapport/shared';
import { CommitmentTracker } from '@rapport/commitment-engine';
import { OverlayManager } from '@rapport/overlay';
import { WhatsAppAdapter } from '@rapport/platform-whatsapp';

console.log('[Rapport] Content Script Loaded');

function initRapportContentScript(): void {
  const hostname = window.location.hostname;

  if (hostname.includes('web.whatsapp.com')) {
    console.log('[Rapport] WhatsApp Detected');
  } else if (!hostname.includes('app.slack.com')) {
    console.warn(`[Rapport] Unhandled target hostname: ${hostname}`);
    return;
  }

  const onDomReady = (callback: () => void) => {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      callback();
    } else {
      window.addEventListener('DOMContentLoaded', callback, { once: true });
    }
  };

  onDomReady(() => {
    console.log('[Rapport] DOM Ready');

    try {
      const adapter = new WhatsAppAdapter({ debug: true });
      const overlay = new OverlayManager({ theme: 'dark' });
      const commitmentTracker = new CommitmentTracker();

      overlay.mount(document.body);
      console.log('[Rapport] Overlay Mounted');

      const updateStatusBadge = () => {
        const domResult = adapter.validateWhatsAppDOM();
        const isConnected = domResult.chatFound && domResult.inputFound;
        injectOrUpdateStatusBadge(isConnected);
      };

      const evaluateCommitments = (chatId: string) => {
        const visibleMessages = adapter.getVisibleMessages(20);
        const { newlyDetected, newlyCompleted } = commitmentTracker.processOutgoingMessages(
          chatId,
          visibleMessages
        );

        newlyDetected.forEach((item) => {
          console.log(`[CommitmentEngine] Detected: "${item.text}" | Status: ${item.status}`);
        });

        newlyCompleted.forEach((item) => {
          console.log(`[CommitmentEngine] Completed: "${item.text}"`);
        });

        const pending = commitmentTracker.getPendingCommitments(chatId);
        console.log(`[CommitmentEngine] Pending Count: ${pending.length}`);

        if (pending.length > 0) {
          const topItem = pending[0];
          const badgeText = topItem.deadline
            ? `${topItem.action} ${topItem.deadline}`
            : `${pending.length} Pending Commitment${pending.length > 1 ? 's' : ''}`;
          overlay.setPendingCommitmentText(badgeText);
        } else {
          overlay.setPendingCommitmentText(undefined);
        }
      };

      // Handle AI Button Click in Overlay
      overlay.onAIClick(() => {
        const chat = adapter.getCurrentChat();
        if (!chat) {
          overlay.showAIError('No active chat detected. Select a contact on WhatsApp Web first.');
          return;
        }

        const visibleMessages = adapter.getVisibleMessages(20);
        const draft = adapter.getDraftText();

        const context = buildConversationContext({
          contact: chat,
          recentMessages: visibleMessages,
          draft,
        });

        console.log('[Rapport:AI] Requesting AI reply recommendation...');
        overlay.showAILoading();

        chrome.runtime.sendMessage(
          {
            type: RAPPORT_AI_GENERATE_REPLY,
            context,
          },
          (response: AIReplyResponsePayload) => {
            if (chrome.runtime.lastError) {
              console.error('[Rapport:AI] Chrome runtime error:', chrome.runtime.lastError);
              overlay.showAIError(
                chrome.runtime.lastError.message || 'Background worker communication failed.'
              );
              return;
            }

            if (response && response.success && response.data) {
              console.log('[Rapport:AI] Received response:', response.data);
              overlay.showAIResponse(response.data);
            } else {
              console.error('[Rapport:AI] Response error:', response?.error);
              overlay.showAIError(response?.error || 'Failed to generate AI response.');
            }
          }
        );
      });

      // Handle 1-Click Insert Draft into WhatsApp Textarea
      overlay.onInsertDraft((textToInsert: string) => {
        const inputEl = adapter.getInputElement();
        if (!inputEl) {
          console.warn('[Rapport:AI] Input element not found for insertion.');
          return;
        }

        inputEl.focus();
        const success = document.execCommand('insertText', false, textToInsert);
        if (!success) {
          inputEl.textContent = textToInsert;
          inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
        console.log('[Rapport:AI] Inserted AI reply into WhatsApp draft textbox.');
      });

      // 1. Independent Chat Switch Observer
      adapter.observeChat((chat) => {
        updateStatusBadge();

        const inputElement = adapter.getInputElement();
        if (inputElement) {
          overlay.setTargetElement(inputElement);
        }

        const messages = adapter.getVisibleMessages(20);
        const draft = adapter.getDraftText();

        const context = buildConversationContext({
          contact: chat,
          recentMessages: messages,
          draft,
        });

        console.log('[ChatObserver] Active chat changed.');
        console.log(formatContextLog(context));

        if (chat) {
          evaluateCommitments(chat.id);
        } else {
          overlay.setPendingCommitmentText(undefined);
        }
      });

      // 2. Independent Message List Mutation Observer
      adapter.observeMessages((messages) => {
        updateStatusBadge();

        const chat = adapter.getCurrentChat();
        const draft = adapter.getDraftText();

        const context = buildConversationContext({
          contact: chat,
          recentMessages: messages,
          draft,
        });

        console.log('[ConversationObserver] Message list updated.');
        console.log(formatContextLog(context));

        if (chat) {
          evaluateCommitments(chat.id);
        }
      });

      // 3. Independent Draft Typing Observer
      adapter.observeDraft((draftText) => {
        console.log(`[DraftObserver] Draft: "${draftText}"`);
      });

      // Initial validation & status badge injection
      updateStatusBadge();
    } catch (error) {
      console.error('[Rapport] Critical failure during Overlay/Context mounting:', error);
    }
  });
}

function injectOrUpdateStatusBadge(connected: boolean): void {
  try {
    let badge = document.getElementById('rapport-status-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'rapport-status-badge';
      badge.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 999999;
        background: #111b21;
        color: #e9edef;
        border: 1px solid #00a884;
        border-radius: 8px;
        padding: 8px 12px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 12px;
        font-weight: 500;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
        pointer-events: auto;
        user-select: none;
      `;
      document.body.appendChild(badge);
    }

    if (connected) {
      badge.style.borderColor = '#00a884';
      badge.innerHTML = `<strong>Rapport AI</strong><br/><span style="color: #00a884;">CONNECTED ✅</span>`;
    } else {
      badge.style.borderColor = '#f59e0b';
      badge.innerHTML = `<strong>Rapport AI</strong><br/><span style="color: #f59e0b;">SEARCHING ⏳</span>`;
    }
  } catch (err) {
    console.error('[Rapport] Failed to inject status badge:', err);
  }
}

initRapportContentScript();
