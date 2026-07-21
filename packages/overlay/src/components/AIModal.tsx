import React from 'react';
import { FakeAIResponse } from '@rapport/shared';

export interface AIModalProps {
  visible: boolean;
  loading: boolean;
  data?: FakeAIResponse | null;
  error?: string | null;
  onInsert?: (text: string) => void;
  onClose: () => void;
}

export const AIModal: React.FC<AIModalProps> = ({
  visible,
  loading,
  data,
  error,
  onInsert,
  onClose,
}) => {
  if (!visible) return null;

  return (
    <div
      className="rapport-animate-enter"
      style={{
        marginTop: '8px',
        width: '360px',
        maxHeight: 'min(500px, 75vh)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--rapport-bg)',
        border: '1px solid var(--rapport-border)',
        borderRadius: 'var(--rapport-radius)',
        boxShadow: 'var(--rapport-shadow)',
        padding: '16px',
        fontFamily: 'var(--rapport-font-family)',
        color: 'var(--rapport-text-primary)',
        backdropFilter: 'blur(8px)',
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
          marginBottom: '12px',
          paddingBottom: '8px',
          borderBottom: '1px solid var(--rapport-border)',
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--rapport-accent)' }}>
          Rapport AI Copilot
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--rapport-text-secondary)',
            cursor: 'pointer',
            fontSize: '14px',
            lineHeight: 1,
          }}
          title="Close (Esc)"
        >
          ✕
        </button>
      </div>

      {/* Scrollable Body Content */}
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: '8px' }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                border: '2px solid var(--rapport-border)',
                borderTopColor: 'var(--rapport-accent)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span style={{ fontSize: '12px', color: 'var(--rapport-text-secondary)' }}>
              Generating AI recommendation...
            </span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#ef4444', marginBottom: '4px' }}>Error</div>
            <div style={{ fontSize: '11px', color: 'var(--rapport-text-secondary)' }}>{error}</div>
          </div>
        )}

        {/* Response Data */}
        {!loading && !error && data && (
          <>
            {/* Suggested Reply Section */}
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--rapport-text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                Suggested Reply
              </div>
              <div
                style={{
                  fontSize: '13px',
                  lineHeight: '1.4',
                  padding: '10px 12px',
                  background: 'var(--rapport-hover-bg)',
                  borderRadius: '8px',
                  border: '1px solid var(--rapport-border)',
                  fontWeight: 500,
                  maxHeight: '160px',
                  overflowY: 'auto',
                }}
              >
                "{data.suggestedReply}"
              </div>
            </div>

            {/* Reasoning Section */}
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--rapport-text-secondary)', marginBottom: '2px', fontWeight: 600 }}>
                Reasoning
              </div>
              <div style={{ fontSize: '12px', color: 'var(--rapport-text-primary)' }}>{data.reasoning}</div>
            </div>

            {/* Tone Section */}
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--rapport-text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                Tone
              </div>
              <span
                style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  background: 'rgba(0, 168, 132, 0.15)',
                  border: '1px solid rgba(0, 168, 132, 0.3)',
                  borderRadius: '12px',
                  color: 'var(--rapport-accent)',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                {data.tone}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Pinned Action Buttons Footer */}
      {!loading && !error && data && (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid var(--rapport-border)', flexShrink: 0, marginTop: '8px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              border: '1px solid var(--rapport-border)',
              borderRadius: '6px',
              color: 'var(--rapport-text-primary)',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
          {onInsert && (
            <button
              onClick={() => onInsert(data.suggestedReply)}
              style={{
                padding: '6px 12px',
                background: 'var(--rapport-accent)',
                border: 'none',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Insert Draft ↵
            </button>
          )}
        </div>
      )}
    </div>
  );
};
