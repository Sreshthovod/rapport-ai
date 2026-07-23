import {
  AIPipelineInspector,
  AIReplyResponsePayload,
  buildConversationContext,
  ConversationContext,
  formatContextLog,
  RAPPORT_AI_GENERATE_REPLY,
} from '@rapport/shared';
import { ContextEngine, CopilotEngine } from '@rapport/ai-core';
import { CommitmentTracker } from '@rapport/commitment-engine';
import { OverlayManager } from '@rapport/overlay';
import { WhatsAppAdapter } from '@rapport/platform-whatsapp';

console.log('[Rapport] Content Script Loaded');

function initRapportContentScript(): void {
  const hostname = window.location.hostname;

  if (!hostname.includes('web.whatsapp.com')) {
    console.warn(`[Rapport] Unsupported hostname: ${hostname}. Rapport AI only runs on web.whatsapp.com.`);
    return;
  }

  console.log('[Rapport] WhatsApp Detected');

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

      // ----------------------------------------------------------------
      // Dispose everything cleanly when page is unloaded
      // ----------------------------------------------------------------
      const handleUnload = () => {
        stopChatObserver();
        stopMessageObserver();
        stopDraftObserver();
        stopDOMObserver();
        adapter.dispose();
        overlay.dispose();
      };
      window.addEventListener('beforeunload', handleUnload, { once: true });

      const updateStatusBadge = () => {
        const domResult = adapter.validateWhatsAppDOM();
        injectOrUpdateStatusBadge(domResult.connected === true);
      };

      const evaluateCopilotTip = (chatId: string, context: ConversationContext) => {
        try {
          const structuredContext = ContextEngine.processContext(context);
          const decision = CopilotEngine.getInstance().evaluateCopilot(structuredContext, chatId);
          if (decision.shouldAssist && decision.primaryRecommendation) {
            overlay.setCopilotTip(decision.primaryRecommendation.reason);
          } else {
            overlay.setCopilotTip(undefined);
          }
        } catch (err) {
          console.warn('[Rapport:Copilot] Evaluation error:', err);
          overlay.setCopilotTip(undefined);
        }
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
        const inspector = (typeof AIPipelineInspector !== 'undefined' && AIPipelineInspector && typeof AIPipelineInspector.getInstance === 'function')
          ? AIPipelineInspector.getInstance()
          : null;
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

        // 30-second resilient safety timeout — guarantees loading state ALWAYS terminates
        let hasResponded = false;
        const requestTimeoutId = setTimeout(() => {
          if (!hasResponded) {
            hasResponded = true;
            console.error('[Rapport:AI:TIMEOUT] Suggestion request timed out after 30 seconds.');
            inspector?.endStage('[8] Suggestion Rendering', { error: 'Request 30s timeout' }, true);
            overlay.showAIError('Suggestion request timed out after 30 seconds. Please check your network connection or API key settings.');
          }
        }, 30000);

        chrome.runtime.sendMessage(
          {
            type: RAPPORT_AI_GENERATE_REPLY,
            context,
          },
          (response: AIReplyResponsePayload) => {
            if (hasResponded) return;
            hasResponded = true;
            clearTimeout(requestTimeoutId);

            inspector?.startStage('[8] Suggestion Rendering');

            if (chrome.runtime.lastError) {
              console.error('[Rapport:AI] Chrome runtime error:', chrome.runtime.lastError);
              const errMsg = chrome.runtime.lastError.message || 'Background worker communication failed.';
              inspector?.endStage('[8] Suggestion Rendering', { error: errMsg }, true);
              overlay.showAIError(errMsg);
              return;
            }

            if (response && response.success && response.data) {
              console.log('[Rapport:AI] Received response:', response.data);
              inspector?.endStage('[8] Suggestion Rendering', { suggestions: response.data.suggestions?.length || 1 });
              overlay.showAIResponse(response.data);
              if (chat) {
                evaluateCopilotTip(chat.id, context);
              }
            } else {
              console.error('[Rapport:AI] Response error:', response?.error);
              const errMsg = response?.error || 'Failed to generate AI response.';
              inspector?.endStage('[8] Suggestion Rendering', { error: errMsg }, true);
              overlay.showAIError(errMsg);
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

        // Try modern InputEvent first (replaces deprecated execCommand)
        try {
          const inputEvent = new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            data: textToInsert,
            inputType: 'insertText',
          });
          inputEl.dispatchEvent(inputEvent);

          // If the element supports execCommand (contenteditable), use it as a fallback
          // eslint-disable-next-line @typescript-eslint/no-deprecated
          if (!document.execCommand('insertText', false, textToInsert)) {
            inputEl.textContent = textToInsert;
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
          }
        } catch {
          inputEl.textContent = textToInsert;
          inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        }

        console.log('[Rapport:AI] Inserted AI reply into WhatsApp draft textbox.');
      });

      // ----------------------------------------------------------------
      // Observers — capture cleanup functions to prevent listener leaks
      // ----------------------------------------------------------------

      // 1. Chat Switch Observer
      const stopChatObserver = adapter.observeChat((chat) => {
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
          evaluateCopilotTip(chat.id, context);
        } else {
          overlay.setPendingCommitmentText(undefined);
          overlay.setCopilotTip(undefined);
        }
      });

      // 2. Message List Mutation Observer
      const stopMessageObserver = adapter.observeMessages((messages) => {
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
          evaluateCopilotTip(chat.id, context);
        }
      });

      // 3. Draft Typing Observer
      const stopDraftObserver = adapter.observeDraft((draftText) => {
        console.log(`[DraftObserver] Draft: "${draftText}"`);
      });

      // 4. DOM Connection Status Observer
      const stopDOMObserver = adapter.observeDOMStatus((result) => {
        injectOrUpdateStatusBadge(result.connected === true);
      });

      // Initial validation & inspector output
      adapter.inspectWhatsAppDOM();
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
