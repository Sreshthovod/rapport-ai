import React, { useState } from 'react';
import { AISuggestion, FakeAIResponse } from '@rapport/shared';

export interface AIModalProps {
  visible: boolean;
  loading: boolean;
  data?: FakeAIResponse | null;
  error?: string | null;
  onInsert?: (text: string) => void;
  onRegenerate?: () => void;
  onClose: () => void;
  /** Dynamic copilot recommendation tip from CopilotEngine. Omit to hide the chip. */
  copilotTip?: string;
}

const getToneColor = (tone: string): { bg: string; border: string; text: string } => {
  const normalized = tone.toLowerCase();
  if (normalized.includes('professional') || normalized.includes('formal')) {
    return { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', text: '#3b82f6' };
  }
  if (normalized.includes('funny') || normalized.includes('playful')) {
    return { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', text: '#f59e0b' };
  }
  if (normalized.includes('short') || normalized.includes('concise')) {
    return { bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.3)', text: '#a855f7' };
  }
  return { bg: 'rgba(0, 168, 132, 0.15)', border: 'rgba(0, 168, 132, 0.3)', text: 'var(--rapport-accent)' };
};

export const AIModal: React.FC<AIModalProps> = ({
  visible,
  loading,
  data,
  error,
  onInsert,
  onRegenerate,
  onClose,
  copilotTip,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!visible) return null;

  const handleCopy = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback copy
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const suggestions: AISuggestion[] = data?.suggestions || (data ? [{
    id: 'single_1',
    text: data.suggestedReply,
    tone: data.tone,
    style: 'Default',
    explanation: data.reasoning,
    confidence: 0.9,
  }] : []);

  return (
    <div
      className="rapport-animate-enter"
      style={{
        marginTop: '8px',
        width: '380px',
        maxHeight: 'min(540px, 78vh)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--rapport-bg)',
        border: '1px solid var(--rapport-border)',
        borderRadius: 'var(--rapport-radius)',
        boxShadow: 'var(--rapport-shadow)',
        padding: '16px',
        fontFamily: 'var(--rapport-font-family)',
        color: 'var(--rapport-text-primary)',
        backdropFilter: 'blur(10px)',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Pinned Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
          paddingBottom: '8px',
          borderBottom: '1px solid var(--rapport-border)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--rapport-accent)' }}>
            Rapport AI Copilot
          </span>
          <span
            style={{
              fontSize: '10px',
              padding: '1px 6px',
              borderRadius: '10px',
              background: 'var(--rapport-hover-bg)',
              color: 'var(--rapport-text-secondary)',
              border: '1px solid var(--rapport-border)',
            }}
          >
            Offline Model
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {onRegenerate && !loading && (
            <button
              onClick={onRegenerate}
              style={{
                background: 'transparent',
                border: '1px solid var(--rapport-border)',
                borderRadius: '4px',
                color: 'var(--rapport-text-secondary)',
                cursor: 'pointer',
                fontSize: '12px',
                padding: '2px 6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Regenerate Suggestions"
            >
              🔄 Refresh
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--rapport-text-secondary)',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '2px 4px',
            }}
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Proactive Copilot Recommendation Tip — only rendered when a live tip is available */}
      {copilotTip && (
        <div
          style={{
            background: 'rgba(0, 168, 132, 0.1)',
            border: '1px solid rgba(0, 168, 132, 0.25)',
            borderRadius: '6px',
            padding: '6px 10px',
            marginBottom: '10px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
            <span>💡</span>
            <span style={{ fontWeight: 600, color: 'var(--rapport-accent)' }}>Copilot Tip:</span>
            <span style={{ color: 'var(--rapport-text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {copilotTip}
            </span>
          </div>
        </div>
      )}

      {/* Scrollable Body List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingRight: '4px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {/* Loading State */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: '10px' }}>
            <div
              style={{
                width: '26px',
                height: '26px',
                border: '2px solid var(--rapport-border)',
                borderTopColor: 'var(--rapport-accent)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span style={{ fontSize: '12px', color: 'var(--rapport-text-secondary)', fontWeight: 500 }}>
              Analyzing conversation & generating replies...
            </span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#ef4444', marginBottom: '4px' }}>Unable to generate AI reply</div>
            <div style={{ fontSize: '11px', color: 'var(--rapport-text-secondary)' }}>{error}</div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && (!data || suggestions.length === 0) && (
          <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--rapport-text-secondary)', fontSize: '12px' }}>
            No conversation thread selected. Open a chat in WhatsApp Web to generate contextual suggestions.
          </div>
        )}

        {/* Suggestions Cards */}
        {!loading && !error && suggestions.length > 0 && (
          suggestions.map((sug) => {
            const toneStyle = getToneColor(sug.tone);
            const isCopied = copiedId === sug.id;

            return (
              <div
                key={sug.id}
                style={{
                  background: 'var(--rapport-hover-bg)',
                  border: '1px solid var(--rapport-border)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'var(--rapport-transition-fast)',
                }}
              >
                {/* Card Header: Tone & Confidence */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      background: toneStyle.bg,
                      border: `1px solid ${toneStyle.border}`,
                      borderRadius: '12px',
                      color: toneStyle.text,
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    {sug.tone}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--rapport-text-secondary)' }}>
                    {Math.round((sug.confidence || 0.9) * 100)}% match
                  </span>
                </div>

                {/* Suggestion Quote Text */}
                <div
                  style={{
                    fontSize: '12.5px',
                    lineHeight: '1.45',
                    color: 'var(--rapport-text-primary)',
                    fontWeight: 500,
                    background: 'var(--rapport-bg)',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--rapport-border)',
                  }}
                >
                  "{sug.text}"
                </div>

                {/* Explanation */}
                <div style={{ fontSize: '11px', color: 'var(--rapport-text-secondary)', fontStyle: 'italic' }}>
                  {sug.explanation}
                </div>

                {/* Action Buttons: Copy & Insert */}
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '2px' }}>
                  <button
                    onClick={() => handleCopy(sug.text, sug.id)}
                    style={{
                      padding: '4px 10px',
                      background: isCopied ? 'rgba(0, 168, 132, 0.2)' : 'transparent',
                      border: `1px solid ${isCopied ? 'var(--rapport-accent)' : 'var(--rapport-border)'}`,
                      borderRadius: '6px',
                      color: isCopied ? 'var(--rapport-accent)' : 'var(--rapport-text-primary)',
                      fontSize: '11px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'var(--rapport-transition-fast)',
                    }}
                  >
                    {isCopied ? 'Copied! ✓' : '📋 Copy'}
                  </button>
                  {onInsert && (
                    <button
                      onClick={() => onInsert(sug.text)}
                      style={{
                        padding: '4px 10px',
                        background: 'var(--rapport-accent)',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Insert Draft ↵
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
