import React, { useEffect, useRef, useState } from 'react';
import { AIPipelineInspector, AISuggestion, CompiledPromptSpec, FakeAIResponse } from '@rapport/shared';
import { ProviderManager, SettingsManager } from '@rapport/ai-core';
import { SettingsView } from './SettingsView.js';

export const getProviderLabel = (providerId?: string): string => {
  const norm = (providerId || '').toLowerCase();
  if (norm.includes('openai') || norm === 'gpt-4o' || norm === 'gpt-4o-mini') return 'OpenAI';
  if (norm.includes('claude') || norm.includes('anthropic')) return 'Claude';
  if (norm.includes('gemini') || norm.includes('google')) return 'Gemini';
  if (norm.includes('groq')) return 'Groq';
  if (norm.includes('fake') || norm.includes('offline') || norm.includes('deterministic')) return 'Offline';
  return providerId || 'Offline';
};

export interface AIModalProps {
  visible: boolean;
  loading: boolean;
  streamingText?: string;
  data?: FakeAIResponse | null;
  error?: string | null;
  compiledPrompt?: CompiledPromptSpec | null;
  initialShowSettings?: boolean;
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
  initialShowSettings,
  onInsert,
  onRegenerate,
  onClose,
  copilotTip,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('All');
  const [showSettings, setShowSettings] = useState<boolean>(Boolean(initialShowSettings));
  const [showDevPanel, setShowDevPanel] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [intelCollapsed, setIntelCollapsed] = useState<boolean>(false);

  useEffect(() => {
    if (initialShowSettings !== undefined) {
      setShowSettings(initialShowSettings);
    }
  }, [initialShowSettings]);

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

  // Extract Metadata Badges & Live Provider Info
  const activeSettings = SettingsManager.getInstance().getSettings();
  const metadata = data?.metadata || {};
  const rawProviderId = (metadata.providerId as string) || data?.providerId || activeSettings.activeProviderId;
  const displayProviderLabel = getProviderLabel(rawProviderId);
  const modelName = (metadata.model as string) || 'Default Model';
  const latencyMs = metadata.latencyMs ? `${metadata.latencyMs}ms` : null;
  const contextSignals = (metadata.contextSignals as any) || {};

  return (
    <div
      className="rapport-animate-enter"
      style={{
        marginTop: '8px',
        width: '420px',
        maxHeight: 'min(680px, 88vh)',
        transform: `translate(${position.x}px, ${position.y}px)`,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--rapport-bg)',
        border: '1px solid var(--rapport-border)',
        borderRadius: 'var(--rapport-radius-lg)',
        boxShadow: 'var(--rapport-shadow)',
        padding: '18px',
        fontFamily: 'var(--rapport-font-family)',
        color: 'var(--rapport-text-primary)',
        backdropFilter: 'var(--rapport-blur)',
        overflow: 'hidden',
        boxSizing: 'border-box',
        zIndex: 99999,
      }}
    >
      {/* Premium Header — Draggable */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
          paddingBottom: '10px',
          borderBottom: '1px solid var(--rapport-border)',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: error ? '#ef4444' : loading ? '#eab308' : 'var(--rapport-accent)',
              boxShadow: error ? '0 0 8px #ef4444' : loading ? '0 0 8px #eab308' : '0 0 8px var(--rapport-accent)',
              transition: 'all 0.3s ease',
            }}
          />
          <span style={{ fontWeight: 700, fontSize: '14px', letterSpacing: '-0.02em' }}>
            Rapport AI
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {activeSettings.developerModeUnlocked && (
            <button
              onClick={() => setShowDevPanel(!showDevPanel)}
              style={{
                background: showDevPanel ? 'var(--rapport-accent-muted)' : 'transparent',
                border: '1px solid var(--rapport-border)',
                borderRadius: 'var(--rapport-radius-sm)',
                color: showDevPanel ? 'var(--rapport-accent)' : 'var(--rapport-text-secondary)',
                cursor: 'pointer',
                fontSize: '11px',
                padding: '3px 8px',
                fontWeight: 500,
                transition: 'all var(--rapport-transition-fast)',
              }}
              title="Toggle Diagnostics Trace"
            >
              🛠️ Diagnostics
            </button>
          )}
          {onRegenerate && !loading && (
            <button
              onClick={onRegenerate}
              style={{
                background: 'transparent',
                border: '1px solid var(--rapport-border)',
                borderRadius: 'var(--rapport-radius-sm)',
                color: 'var(--rapport-text-secondary)',
                cursor: 'pointer',
                fontSize: '11px',
                padding: '3px 8px',
                fontWeight: 500,
                transition: 'all var(--rapport-transition-fast)',
              }}
              title="Regenerate suggestions (Cmd+Enter)"
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
              lineHeight: 1,
            }}
            title="Close panel (Esc)"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Embedded Settings Modal Overlay */}
      {showSettings && (
        <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
          <SettingsView
            onClose={() => {
              setShowSettings(false);
              if (initialShowSettings) {
                onClose();
              }
            }}
          />
        </div>
      )}

      {!showSettings && (
        <>
          {/* AI Copilot Badge Panel (Elegant inline tags) */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              flexWrap: 'wrap',
              marginBottom: '12px',
              fontSize: '10.5px',
              fontWeight: 500,
              color: 'var(--rapport-text-secondary)',
              flexShrink: 0,
            }}
          >
            <span style={{ padding: '2px 6px', background: 'var(--rapport-bg-hover)', borderRadius: '4px', border: '1px solid var(--rapport-border)' }}>
              🤖 {displayProviderLabel} ({modelName})
            </span>
            <span style={{ padding: '2px 6px', background: 'var(--rapport-bg-hover)', borderRadius: '4px', border: '1px solid var(--rapport-border)' }}>
              💬 Mode: {activeSettings.conversationMode}
            </span>
            <span style={{ padding: '2px 6px', background: 'var(--rapport-bg-hover)', borderRadius: '4px', border: '1px solid var(--rapport-border)' }}>
              🎭 Style: {activeSettings.suggestionPersonality}
            </span>
            {contextSignals.preferredLanguage && (
              <span style={{ padding: '2px 6px', background: 'var(--rapport-bg-hover)', borderRadius: '4px', border: '1px solid var(--rapport-border)' }}>
                🌐 Lang: {contextSignals.preferredLanguage}
              </span>
            )}
            {latencyMs && (
              <span style={{ padding: '2px 6px', background: 'rgba(16, 185, 129, 0.08)', color: '#10b981', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                ⚡ {latencyMs}
              </span>
            )}
          </div>

          {/* Proactive Copilot Recommendation Tip */}
          {copilotTip && (
            <div
              style={{
                background: 'var(--rapport-accent-muted)',
                border: '1px solid var(--rapport-border)',
                borderRadius: 'var(--rapport-radius)',
                padding: '8px 12px',
                marginBottom: '12px',
                fontSize: '11.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexShrink: 0,
                color: 'var(--rapport-text-primary)',
              }}
            >
              <span>💡</span>
              <span style={{ fontWeight: 600, color: 'var(--rapport-accent)' }}>Copilot:</span>
              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', flex: 1 }}>
                {copilotTip}
              </span>
            </div>
          )}

          {/* Category Filter Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', overflowX: 'auto', flexShrink: 0, paddingBottom: '2px' }}>
            {['All', 'Quick', 'Natural', 'Professional', 'Funny', 'Flirty'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategoryFilter(cat)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  border: activeCategoryFilter === cat ? '1px solid var(--rapport-accent)' : '1px solid var(--rapport-border)',
                  background: activeCategoryFilter === cat ? 'var(--rapport-accent-muted)' : 'transparent',
                  color: activeCategoryFilter === cat ? 'var(--rapport-accent)' : 'var(--rapport-text-secondary)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all var(--rapport-transition-fast)',
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
              paddingRight: '2px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* Real-Time Streaming Text Display with Caret */}
            {loading && streamingText && (
              <div
                style={{
                  padding: '14px',
                  background: 'var(--rapport-bg-hover)',
                  border: '1px solid var(--rapport-border)',
                  borderRadius: 'var(--rapport-radius)',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  color: 'var(--rapport-text-primary)',
                }}
              >
                <div style={{ fontSize: '10px', color: 'var(--rapport-accent)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  ⚡ Streaming Suggestion...
                </div>
                <span>"{streamingText}"</span>
                <span className="rapport-caret" style={{ marginLeft: '2px' }}></span>
              </div>
            )}

            {/* Shimmer Skeleton Loading State */}
            {loading && !streamingText && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '8px 0' }}>
                {[1, 2, 3].map((val) => (
                  <div
                    key={val}
                    style={{
                      height: '80px',
                      borderRadius: 'var(--rapport-radius)',
                      border: '1px solid var(--rapport-border)',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div className="rapport-shimmer" style={{ width: '60px', height: '14px', borderRadius: '4px' }} />
                      <div className="rapport-shimmer" style={{ width: '40px', height: '14px', borderRadius: '4px' }} />
                    </div>
                    <div className="rapport-shimmer" style={{ width: '85%', height: '16px', borderRadius: '4px' }} />
                    <div className="rapport-shimmer" style={{ width: '50%', height: '12px', borderRadius: '4px' }} />
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {!loading && error && (
              <div style={{ padding: '14px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--rapport-radius)' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#ef4444', marginBottom: '4px' }}>Unable to generate AI reply</div>
                <div style={{ fontSize: '11.5px', color: 'var(--rapport-text-secondary)' }}>{error}</div>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && (!data || suggestions.length === 0) && (
              <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--rapport-text-tertiary)', fontSize: '12.5px' }}>
                No active chat thread selected. Open a conversation in WhatsApp to receive suggestions.
              </div>
            )}

            {/* Contact Intelligence Card */}
            {!loading && !error && data && contextSignals.relationshipType && (
              <div style={{
                background: 'var(--rapport-bg-hover)',
                border: '1px solid var(--rapport-border)',
                borderRadius: 'var(--rapport-radius)',
                overflow: 'hidden',
                transition: 'all var(--rapport-transition-normal)',
              }}>
                <div
                  onClick={() => setIntelCollapsed(!intelCollapsed)}
                  style={{
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: 'rgba(255, 255, 255, 0.01)',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 700, color: 'var(--rapport-accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    👤 Contact Profile: {contextSignals.relationshipType}
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--rapport-text-secondary)', transform: intelCollapsed ? 'rotate(0deg)' : 'rotate(180deg)', display: 'inline-block', transition: 'transform 0.15s ease' }}>▼</span>
                </div>

                {!intelCollapsed && (
                  <div style={{
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    borderTop: '1px solid var(--rapport-border)',
                    fontSize: '12px',
                    color: 'var(--rapport-text-secondary)',
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        Depth: <strong style={{ color: 'var(--rapport-text-primary)' }}>{contextSignals.conversationDepth >= 70 ? 'Deep' : contextSignals.conversationDepth >= 40 ? 'Medium' : 'Casual'}</strong> ({contextSignals.conversationDepth}/100)
                      </div>
                      <div>
                        Language: <strong style={{ color: 'var(--rapport-text-primary)' }}>{contextSignals.preferredLanguage || 'English'}</strong>
                      </div>
                      <div>
                        Frequency: <strong style={{ color: 'var(--rapport-text-primary)' }}>{contextSignals.messagesPerDay > 20 ? '⚡ High' : contextSignals.messagesPerDay > 5 ? 'Moderate' : 'Low'}</strong> ({contextSignals.messagesPerDay || 0} msgs/day)
                      </div>
                      <div>
                        Emojis: <strong style={{ color: 'var(--rapport-text-primary)' }}>{contextSignals.emojiUsage === 'frequent' ? 'Frequent' : contextSignals.emojiUsage === 'rare' ? 'Rare' : 'None'}</strong>
                      </div>
                    </div>

                    {contextSignals.commonTopics && contextSignals.commonTopics.length > 0 && (
                      <div style={{ borderTop: '1px solid var(--rapport-border)', paddingTop: '8px', marginTop: '4px' }}>
                        <div style={{ color: 'var(--rapport-text-tertiary)', fontSize: '10px', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px' }}>Topics Discussed</div>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {contextSignals.commonTopics.map((topic: string, i: number) => (
                            <span key={i} style={{
                              fontSize: '10px',
                              background: 'var(--rapport-bg-input)',
                              border: '1px solid var(--rapport-border)',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              color: 'var(--rapport-text-secondary)',
                            }}>{topic}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ChatGPT-Style Suggestion Cards */}
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
                      background: isSelected ? 'var(--rapport-bg-hover)' : 'rgba(255, 255, 255, 0.01)',
                      border: isSelected ? '1px solid var(--rapport-accent)' : '1px solid var(--rapport-border)',
                      borderRadius: 'var(--rapport-radius)',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      transition: 'all var(--rapport-transition-fast)',
                      cursor: 'pointer',
                      position: 'relative',
                    }}
                  >
                    {/* Header bar */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {sug.category && (
                          <span style={{ fontSize: '10.5px', padding: '2px 7px', background: 'var(--rapport-bg-hover)', borderRadius: '4px', color: 'var(--rapport-text-secondary)', fontWeight: 600 }}>
                            {sug.category}
                          </span>
                        )}
                        <span
                          style={{
                            padding: '2px 7px',
                            background: toneStyle.bg,
                            border: `1px solid ${toneStyle.border}`,
                            borderRadius: '12px',
                            color: toneStyle.text,
                            fontSize: '10.5px',
                            fontWeight: 600,
                          }}
                        >
                          {sug.tone}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--rapport-text-secondary)' }}>
                          {Math.round((sug.confidence || 0.9) * 100)}% match
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); togglePin(sug.id); }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '13px',
                            color: isPinned ? '#f59e0b' : 'var(--rapport-text-tertiary)',
                          }}
                          title={isPinned ? 'Unpin suggestion' : 'Pin suggestion to top'}
                        >
                          📌
                        </button>
                      </div>
                    </div>

                    {/* Faux ChatGPT Content Block */}
                    <div
                      style={{
                        fontSize: '13px',
                        lineHeight: '1.5',
                        color: 'var(--rapport-text-primary)',
                        background: 'var(--rapport-bg-input)',
                        padding: '10px 12px',
                        borderRadius: 'var(--rapport-radius-sm)',
                        border: '1px solid var(--rapport-border)',
                      }}
                    >
                      "{sug.text}"
                    </div>

                    {sug.explanation && (
                      <div style={{ fontSize: '11px', color: 'var(--rapport-text-secondary)', fontStyle: 'italic', paddingLeft: '4px' }}>
                        {sug.explanation}
                      </div>
                    )}

                    {/* Action Toolbar (Shorter, Longer, Rewrite, Copy, Insert) */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--rapport-border)', paddingTop: '8px', marginTop: '2px' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {/* Progressive refinement modifiers */}
                        {['Shorter', 'Longer', 'Rewrite'].map((mode) => (
                          <button
                            key={mode}
                            onClick={(e) => {
                              e.stopPropagation();
                              // Mock modification by updating suggestion text or copying
                              const updatedText = mode === 'Shorter' 
                                ? sug.text.split(/[.,!?]/)[0] + '.'
                                : mode === 'Longer'
                                ? sug.text + ' Hope you are doing well and everything is smooth!'
                                : 'Hey! ' + sug.text;
                              sug.text = updatedText;
                              if (onInsert) onInsert(updatedText);
                            }}
                            style={{
                              padding: '2px 6px',
                              background: 'transparent',
                              border: '1px solid var(--rapport-border)',
                              borderRadius: '4px',
                              color: 'var(--rapport-text-secondary)',
                              fontSize: '10px',
                              cursor: 'pointer',
                              fontWeight: 500,
                            }}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCopy(sug.text, sug.id); }}
                          style={{
                            padding: '4px 10px',
                            background: isCopied ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                            border: `1px solid ${isCopied ? '#10b981' : 'var(--rapport-border)'}`,
                            borderRadius: 'var(--rapport-radius-sm)',
                            color: isCopied ? '#10b981' : 'var(--rapport-text-primary)',
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
                              background: 'var(--rapport-accent)',
                              border: 'none',
                              borderRadius: 'var(--rapport-radius-sm)',
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
                  </div>
                );
              })
            )}
          </div>

          {/* Developer Diagnostics Panel */}
          {showDevPanel && (
            (() => {
              const diag = (typeof AIPipelineInspector !== 'undefined' && AIPipelineInspector && typeof AIPipelineInspector.getInstance === 'function')
                ? AIPipelineInspector.getInstance().getDiagnosticsSummary()
                : {
                    currentStage: 'Idle',
                    totalDurationMs: 0,
                    success: true,
                    provider: 'N/A',
                    model: 'N/A',
                    promptLength: 0,
                    stageTimings: [],
                  };
              const systemPromptLen = compiledPrompt?.systemPrompt?.length || 0;
              const userPromptLen = compiledPrompt?.userPrompt?.length || 0;
              const totalPromptLen = systemPromptLen + userPromptLen || diag.promptLength;

              return (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '12px',
                    background: 'var(--rapport-bg-hover)',
                    border: '1px solid var(--rapport-border)',
                    borderRadius: 'var(--rapport-radius)',
                    fontSize: '11px',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    fontFamily: 'monospace',
                    flexShrink: 0,
                    color: 'var(--rapport-text-primary)',
                  }}
                >
                  <div style={{ color: 'var(--rapport-accent)', fontWeight: 'bold', marginBottom: '8px' }}>
                    🛠️ Pipeline Stage Trace
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                    <div><span style={{ color: 'var(--rapport-text-secondary)' }}>Stage:</span> {diag.currentStage}</div>
                    <div><span style={{ color: 'var(--rapport-text-secondary)' }}>Latency:</span> {diag.totalDurationMs ? `${diag.totalDurationMs}ms` : (latencyMs ? `${latencyMs}ms` : 'In Progress')}</div>
                    <div>
                      <span style={{ color: 'var(--rapport-text-secondary)' }}>Status:</span>{' '}
                      <span style={{ color: error || !diag.success ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                        {error || !diag.success ? 'Failed' : 'Success'}
                      </span>
                    </div>
                    <div><span style={{ color: 'var(--rapport-text-secondary)' }}>Provider:</span> {displayProviderLabel}</div>
                    <div><span style={{ color: 'var(--rapport-text-secondary)' }}>Model:</span> {modelName}</div>
                    <div><span style={{ color: 'var(--rapport-text-secondary)' }}>Prompt:</span> {totalPromptLen} chars</div>
                  </div>

                  {diag.stageTimings.map((st, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid var(--rapport-border)' }}>
                      <span>{st.stage}</span>
                      <span style={{ color: '#10b981', fontWeight: 600 }}>{st.durationMs}ms</span>
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </>
      )}
    </div>
  );
};
