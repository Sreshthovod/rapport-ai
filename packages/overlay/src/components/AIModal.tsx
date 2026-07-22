import React, { useEffect, useRef, useState } from 'react';
import { AISuggestion, CompiledPromptSpec, FakeAIResponse } from '@rapport/shared';
import { SettingsView } from './SettingsView.js';

export interface AIModalProps {
  visible: boolean;
  loading: boolean;
  streamingText?: string;
  data?: FakeAIResponse | null;
  error?: string | null;
  compiledPrompt?: CompiledPromptSpec | null;
  onInsert?: (text: string) => void;
  onRegenerate?: () => void;
  onClose: () => void;
  /** Dynamic copilot recommendation tip from CopilotEngine */
  copilotTip?: string;
}

const getToneColor = (tone: string): { bg: string; border: string; text: string } => {
  const normalized = tone.toLowerCase();
  if (normalized.includes('professional') || normalized.includes('formal')) {
    return { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', text: '#3b82f6' };
  }
  if (normalized.includes('funny') || normalized.includes('playful') || normalized.includes('humorous')) {
    return { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', text: '#f59e0b' };
  }
  if (normalized.includes('short') || normalized.includes('quick')) {
    return { bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.3)', text: '#a855f7' };
  }
  if (normalized.includes('flirty') || normalized.includes('romantic')) {
    return { bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.3)', text: '#ec4899' };
  }
  return { bg: 'rgba(0, 168, 132, 0.15)', border: 'rgba(0, 168, 132, 0.3)', text: 'var(--rapport-accent, #00a884)' };
};

export const AIModal: React.FC<AIModalProps> = ({
  visible,
  loading,
  streamingText,
  data,
  error,
  compiledPrompt,
  onInsert,
  onRegenerate,
  onClose,
  copilotTip,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('All');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showDevPanel, setShowDevPanel] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Dragging state
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
  });

  // Handle Keyboard Shortcuts (Esc, Cmd/Ctrl+Enter, Tab)
  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (onRegenerate && !loading) onRegenerate();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (suggestions.length || 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, loading, onRegenerate, onClose]);

  if (!visible) return null;

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
    };

    const handleMouseMove = (me: MouseEvent) => {
      const dx = me.clientX - dragRef.current.startX;
      const dy = me.clientY - dragRef.current.startY;
      setPosition({
        x: dragRef.current.posX + dx,
        y: dragRef.current.posY + dy,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleCopy = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
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

  const togglePin = (id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const rawSuggestions: AISuggestion[] = data?.suggestions || (data ? [{
    id: 'single_1',
    text: data.suggestedReply,
    tone: data.tone,
    style: 'Default',
    explanation: data.reasoning,
    confidence: 0.9,
  }] : []);

  // Filter & Sort (pinned options stay on top)
  const filteredSuggestions = rawSuggestions.filter((s) => {
    if (activeCategoryFilter === 'All') return true;
    if (activeCategoryFilter === 'Quick') return s.category === 'Quick Reply' || s.text.length < 30;
    if (activeCategoryFilter === 'Natural') return s.category === 'Natural Reply';
    if (activeCategoryFilter === 'Professional') return s.category === 'Professional Reply' || s.tone === 'Professional';
    if (activeCategoryFilter === 'Funny') return s.category === 'Funny Reply' || s.tone === 'Playful';
    if (activeCategoryFilter === 'Flirty') return s.category === 'Flirty Reply' || s.tone === 'Flirty';
    return true;
  });

  const suggestions = [...filteredSuggestions].sort((a, b) => {
    const aPin = pinnedIds.has(a.id) ? 1 : 0;
    const bPin = pinnedIds.has(b.id) ? 1 : 0;
    return bPin - aPin;
  });

  // Extract Metadata Badges
  const metadata = data?.metadata || {};
  const providerId = (metadata.providerId as string) || data?.providerId || 'fake-provider';
  const modelName = (metadata.model as string) || 'Default Model';
  const latencyMs = metadata.latencyMs ? `${metadata.latencyMs}ms` : null;
  const contextSignals = (metadata.contextSignals as any) || {};

  return (
    <div
      className="rapport-animate-enter"
      style={{
        marginTop: '8px',
        width: '420px',
        maxHeight: 'min(640px, 85vh)',
        transform: `translate(${position.x}px, ${position.y}px)`,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--rapport-bg, #1e2227)',
        border: '1px solid var(--rapport-border, rgba(255, 255, 255, 0.12))',
        borderRadius: '12px',
        boxShadow: '0 16px 36px rgba(0, 0, 0, 0.35)',
        padding: '16px',
        fontFamily: 'Inter, system-ui, sans-serif',
        color: 'var(--rapport-text-primary, #ffffff)',
        backdropFilter: 'blur(16px)',
        overflow: 'hidden',
        boxSizing: 'border-box',
        zIndex: 99999,
        resize: 'both',
      }}
    >
      {/* Modal Header — Draggable */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
          paddingBottom: '8px',
          borderBottom: '1px solid var(--rapport-border, rgba(255, 255, 255, 0.1))',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--rapport-accent, #00a884)' }}>
            Rapport AI Copilot
          </span>
          <span
            style={{
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#9ca3af',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {providerId}
          </span>
          {latencyMs && (
            <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 600 }}>
              ⚡ {latencyMs}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => setShowDevPanel(!showDevPanel)}
            style={{
              background: showDevPanel ? 'rgba(0, 168, 132, 0.2)' : 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '4px',
              color: showDevPanel ? 'var(--rapport-accent, #00a884)' : '#9ca3af',
              cursor: 'pointer',
              fontSize: '11px',
              padding: '2px 6px',
            }}
            title="Toggle Developer Observability Inspector"
          >
            🛠️ Dev
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              background: showSettings ? 'rgba(0, 168, 132, 0.2)' : 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '4px',
              color: showSettings ? 'var(--rapport-accent, #00a884)' : '#9ca3af',
              cursor: 'pointer',
              fontSize: '11px',
              padding: '2px 6px',
            }}
            title="Open Settings"
          >
            ⚙️
          </button>
          {onRegenerate && !loading && (
            <button
              onClick={onRegenerate}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '4px',
                color: '#9ca3af',
                cursor: 'pointer',
                fontSize: '11px',
                padding: '2px 6px',
              }}
              title="Regenerate (Cmd+Enter)"
            >
              🔄 Refresh
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
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

      {/* Embedded Settings Modal Overlay */}
      {showSettings && (
        <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
          <SettingsView onClose={() => setShowSettings(false)} />
        </div>
      )}

      {!showSettings && (
        <>
          {/* Proactive Copilot Recommendation Tip */}
          {copilotTip && (
            <div
              style={{
                background: 'rgba(0, 168, 132, 0.12)',
                border: '1px solid rgba(0, 168, 132, 0.3)',
                borderRadius: '6px',
                padding: '6px 10px',
                marginBottom: '8px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0,
              }}
            >
              <span>💡</span>
              <span style={{ fontWeight: 600, color: 'var(--rapport-accent, #00a884)' }}>Copilot Tip:</span>
              <span style={{ color: '#ffffff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {copilotTip}
              </span>
            </div>
          )}

          {/* Category Filter Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', overflowX: 'auto', flexShrink: 0 }}>
            {['All', 'Quick', 'Natural', 'Professional', 'Funny', 'Flirty'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategoryFilter(cat)}
                style={{
                  padding: '3px 9px',
                  borderRadius: '12px',
                  border: activeCategoryFilter === cat ? '1px solid var(--rapport-accent, #00a884)' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: activeCategoryFilter === cat ? 'rgba(0, 168, 132, 0.2)' : 'transparent',
                  color: activeCategoryFilter === cat ? 'var(--rapport-accent, #00a884)' : '#9ca3af',
                  fontSize: '10.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Scrollable Body List */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              paddingRight: '4px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {/* Real-Time Streaming Text Display */}
            {loading && streamingText && (
              <div
                style={{
                  padding: '12px',
                  background: 'rgba(0, 168, 132, 0.08)',
                  border: '1px solid rgba(0, 168, 132, 0.3)',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  lineHeight: '1.45',
                  color: '#ffffff',
                }}
              >
                <div style={{ fontSize: '10px', color: 'var(--rapport-accent, #00a884)', fontWeight: 600, marginBottom: '4px' }}>
                  ⚡ STREAMING RESPONSE...
                </div>
                "{streamingText}"
                <span className="blinking-cursor" style={{ fontWeight: 'bold', color: 'var(--rapport-accent, #00a884)' }}>|</span>
              </div>
            )}

            {/* Standard Loading Spinner State */}
            {loading && !streamingText && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: '10px' }}>
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    border: '2px solid rgba(255, 255, 255, 0.1)',
                    borderTopColor: 'var(--rapport-accent, #00a884)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}>
                  Orchestrating context & generating suggestions...
                </span>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {/* Error State */}
            {!loading && error && (
              <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid #ef4444', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#ef4444', marginBottom: '4px' }}>Unable to generate AI reply</div>
                <div style={{ fontSize: '11px', color: '#d1d5db' }}>{error}</div>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && (!data || suggestions.length === 0) && (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
                No active chat selected. Open a thread in WhatsApp Web to generate contextual suggestions.
              </div>
            )}

            {/* Suggestion Cards */}
            {!loading && !error && suggestions.length > 0 && (
              suggestions.map((sug, idx) => {
                const toneStyle = getToneColor(sug.tone);
                const isCopied = copiedId === sug.id;
                const isPinned = pinnedIds.has(sug.id);
                const isSelected = selectedIndex === idx;

                return (
                  <div
                    key={sug.id}
                    onClick={() => setSelectedIndex(idx)}
                    style={{
                      background: isSelected ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                      border: isSelected ? '1px solid var(--rapport-accent, #00a884)' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      transition: 'border 0.15s ease',
                      cursor: 'pointer',
                    }}
                  >
                    {/* Card Header: Category, Tone & Pin */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {sug.category && (
                          <span style={{ fontSize: '10px', padding: '1px 6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', color: '#d1d5db', fontWeight: 600 }}>
                            {sug.category}
                          </span>
                        )}
                        <span
                          style={{
                            padding: '1px 7px',
                            background: toneStyle.bg,
                            border: `1px solid ${toneStyle.border}`,
                            borderRadius: '10px',
                            color: toneStyle.text,
                            fontSize: '10.5px',
                            fontWeight: 600,
                          }}
                        >
                          {sug.tone}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '10px', color: '#9ca3af' }}>
                          {Math.round((sug.confidence || 0.9) * 100)}% match
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); togglePin(sug.id); }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '12px',
                            color: isPinned ? '#f59e0b' : '#6b7280',
                          }}
                          title={isPinned ? 'Unpin' : 'Pin to top'}
                        >
                          📌
                        </button>
                      </div>
                    </div>

                    {/* Suggestion Quote Text */}
                    <div
                      style={{
                        fontSize: '12.5px',
                        lineHeight: '1.45',
                        color: '#ffffff',
                        fontWeight: 500,
                        background: 'rgba(0, 0, 0, 0.2)',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                      }}
                    >
                      "{sug.text}"
                    </div>

                    {/* Explanation */}
                    <div style={{ fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' }}>
                      {sug.explanation}
                    </div>

                    {/* Action Buttons: Copy & Insert */}
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '2px' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCopy(sug.text, sug.id); }}
                        style={{
                          padding: '4px 10px',
                          background: isCopied ? 'rgba(0, 168, 132, 0.2)' : 'transparent',
                          border: `1px solid ${isCopied ? 'var(--rapport-accent, #00a884)' : 'rgba(255, 255, 255, 0.15)'}`,
                          borderRadius: '6px',
                          color: isCopied ? 'var(--rapport-accent, #00a884)' : '#ffffff',
                          fontSize: '11px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {isCopied ? 'Copied! ✓' : '📋 Copy'}
                      </button>
                      {onInsert && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onInsert(sug.text); }}
                          style={{
                            padding: '4px 10px',
                            background: 'var(--rapport-accent, #00a884)',
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

          {/* Developer Observability Drawer Panel */}
          {showDevPanel && compiledPrompt && (
            <div
              style={{
                marginTop: '10px',
                padding: '10px',
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                fontSize: '11px',
                maxHeight: '160px',
                overflowY: 'auto',
                fontFamily: 'monospace',
                flexShrink: 0,
              }}
            >
              <div style={{ color: 'var(--rapport-accent, #00a884)', fontWeight: 'bold', marginBottom: '4px' }}>
                🛠️ REAL-TIME AI PIPELINE INSPECTOR (v{compiledPrompt.version})
              </div>
              <div>Goal: {compiledPrompt.goal}</div>
              <div>Relationship: {compiledPrompt.contextSnapshot.relationshipType}</div>
              <div>Tone: {compiledPrompt.contextSnapshot.detectedTone}</div>
              <div>Topic: {compiledPrompt.contextSnapshot.conversationSummary.slice(0, 60)}</div>
              <div style={{ marginTop: '4px', color: '#9ca3af' }}>System Prompt Preview:</div>
              <div style={{ whiteSpace: 'pre-wrap', color: '#d1d5db', background: 'rgba(0,0,0,0.4)', padding: '4px', borderRadius: '4px' }}>
                {compiledPrompt.systemPrompt.slice(0, 200)}...
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
