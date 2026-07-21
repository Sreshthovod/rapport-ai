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
      // 1. Inject bottom-right status indicator badge
      injectStatusBadge();

      // 2. Instantiate WhatsApp Platform Adapter & Overlay Manager
      const adapter = new WhatsAppAdapter({ debug: true });
      const overlay = new OverlayManager({ theme: 'dark' });

      overlay.mount(document.body);
      console.log('[Rapport] Overlay Mounted');

      // 3. Observe active conversation and update target input element
      adapter.observeConversation(() => {
        const inputElement = adapter.getInputElement();
        if (inputElement) {
          overlay.setTargetElement(inputElement);
        }
      });
    } catch (error) {
      console.error('[Rapport] Critical failure during Overlay mounting:', error);
    }
  });
}

function injectStatusBadge(): void {
  try {
    const existing = document.getElementById('rapport-status-badge');
    if (existing) return;

    const badge = document.createElement('div');
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
    badge.innerHTML = `<strong>Rapport AI</strong><br/><span style="color: #00a884;">Connected ✅</span>`;

    document.body.appendChild(badge);
    console.log('[Rapport] Status badge injected successfully');
  } catch (err) {
    console.error('[Rapport] Failed to inject status badge:', err);
  }
}

// Execution trigger on content script load
initRapportContentScript();
