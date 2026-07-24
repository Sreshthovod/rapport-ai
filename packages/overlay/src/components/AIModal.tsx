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

interface ErrorBoundaryProps {
  fallbackTitle?: string;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '16px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '8px',
            margin: '12px 0',
            color: 'var(--rapport-text-primary)',
            fontSize: '12.5px',
          }}
        >
          <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ⚠️ {this.props.fallbackTitle || 'Rendering Failed'}
          </div>
          <div style={{ color: 'var(--rapport-text-secondary)', fontSize: '11px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto' }}>
            {this.state.error?.message || 'Unknown error'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: '8px',
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid var(--rapport-border)',
              background: 'transparent',
              color: 'var(--rapport-text-primary)',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

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
  anchorTop?: number;
  activeTab: 'AI' | 'Tone' | 'Strategy' | 'Memory';
  onTabChange: (tab: 'AI' | 'Tone' | 'Strategy' | 'Memory') => void;
  onSettingsClick: () => void;
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

const getInsightCard = (contextSignals: any, reasoning: string): { icon: string; text: string } => {
  const stage = (contextSignals?.stage || '').toLowerCase();
  const emotion = (contextSignals?.primaryEmotion || '').toLowerCase();
  const sentiment = (contextSignals?.sentiment || '').toLowerCase();

  if (stage.includes('planning') || stage.includes('schedule')) {
    return { icon: '📅', text: 'They are making plans.' };
  }
  if (emotion.includes('frustrated') || emotion.includes('angry') || sentiment === 'negative') {
    return { icon: '⚠️', text: 'The conversation health is strained.' };
  }
  if (emotion.includes('curious') || emotion.includes('inquiry')) {
    return { icon: '💡', text: 'They are asking for details.' };
  }
  if (sentiment === 'positive' || emotion.includes('happy')) {
    return { icon: '😊', text: 'The conversation is friendly.' };
  }
  if (reasoning) {
    const cleanReason = reasoning.replace(/^Reasoning:\s*/i, '');
    const firstSentence = cleanReason.split(/[.!?]/)[0];
    if (firstSentence && firstSentence.length < 60) {
      return { icon: '💡', text: firstSentence + '.' };
    }
  }
  return { icon: '🤖', text: 'AI is ready with suggested replies.' };
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
  anchorTop,
  activeTab,
  onTabChange,
  onSettingsClick,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('All');
  const [showDevPanel, setShowDevPanel] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [intelCollapsed, setIntelCollapsed] = useState<boolean>(false);

  useEffect(() => {
    if (initialShowSettings) {
      onSettingsClick();
    }
  }, [initialShowSettings, onSettingsClick]);

  // Dragging state
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
  });
  const dragCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (dragCleanupRef.current) {
        dragCleanupRef.current();
      }
    };
  }, []);

  const [shouldRender, setShouldRender] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), 150);
      return () => clearTimeout(timer);
    }
  }, [visible]);




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
      dragCleanupRef.current = null;
    };

    dragCleanupRef.current = () => {
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

  const handleRewrite = async (styleKey: 'short-direct' | 'detailed' | 'professional') => {
    try {
      await SettingsManager.getInstance().updateSettings({ writingStyle: styleKey });
      if (onRegenerate) {
        onRegenerate();
      }
    } catch (err) {
      console.error('Failed to update writing style for rewrite:', err);
    }
  };

  const actionBtnStyle: React.CSSProperties = {
    flex: 1,
    minWidth: '70px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '8px 10px',
    borderRadius: '6px',
    background: 'transparent',
    border: '1px solid var(--rapport-border)',
    color: 'var(--rapport-text-primary)',
    fontSize: '11px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  };

  // Handle Keyboard Shortcuts (Esc, Cmd/Ctrl+Enter, Tab, Arrow keys)
  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (onRegenerate && !loading) onRegenerate();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        if (activeTab === 'AI') {
          setSelectedIndex((prev) => (prev + 1) % (suggestions.length || 1));
        } else {
          const tabOrder: Array<'AI' | 'Tone' | 'Strategy' | 'Memory'> = ['AI', 'Tone', 'Strategy', 'Memory'];
          const idx = tabOrder.indexOf(activeTab);
          onTabChange(tabOrder[(idx + 1) % tabOrder.length]);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (activeTab === 'AI') {
          setSelectedIndex((prev) => (prev + 1) % (suggestions.length || 1));
        } else {
          const tabOrder: Array<'AI' | 'Tone' | 'Strategy' | 'Memory'> = ['AI', 'Tone', 'Strategy', 'Memory'];
          const idx = tabOrder.indexOf(activeTab);
          onTabChange(tabOrder[(idx + 1) % tabOrder.length]);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (activeTab === 'AI') {
          setSelectedIndex((prev) => (prev - 1 + suggestions.length) % (suggestions.length || 1));
        } else {
          const tabOrder: Array<'AI' | 'Tone' | 'Strategy' | 'Memory'> = ['AI', 'Tone', 'Strategy', 'Memory'];
          const idx = tabOrder.indexOf(activeTab);
          onTabChange(tabOrder[(idx - 1 + tabOrder.length) % tabOrder.length]);
        }
      } else if (e.key === 'Enter') {
        const activeSug = suggestions[selectedIndex];
        if (activeSug && onInsert && activeTab === 'AI') {
          e.preventDefault();
          onInsert(activeSug.text);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, loading, onRegenerate, onClose, suggestions, selectedIndex, onInsert, activeTab, onTabChange]);

  // Extract Metadata Badges & Live Provider Info
  const activeSettings = SettingsManager.getInstance().getSettings();
  const metadata = data?.metadata || {};
  const rawProviderId = (metadata.providerId as string) || data?.providerId || activeSettings.activeProviderId;
  const displayProviderLabel = getProviderLabel(rawProviderId);
  const modelName = (metadata.model as string) || 'Default Model';
  const latencyMs = metadata.latencyMs ? `${metadata.latencyMs}ms` : null;
  const contextSignals = (metadata.contextSignals as any) || {};

  // Calculate smart up/down positioning
  const modalHeight = 350; 
  const spaceBelow = typeof window !== 'undefined' ? window.innerHeight - (anchorTop || 0) : 0;
  const growUpward = spaceBelow < modalHeight + 60;

  const positioningStyle: React.CSSProperties = growUpward
    ? {
        position: 'absolute',
        bottom: '100%',
        marginBottom: '10px',
        left: 0,
      }
    : {
        position: 'absolute',
        top: '100%',
        marginTop: '10px',
        left: 0,
      };

  const activeSuggestion = suggestions[selectedIndex];

  if (!shouldRender) return null;

  return (
    <div
      className={visible ? 'rapport-spring-enter' : 'rapport-spring-exit'}
      style={{
        ...positioningStyle,
        width: '420px',
        height: '440px',
        transform: `translate(${position.x}px, ${position.y}px)`,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--rapport-bg)',
        border: '1px solid var(--rapport-border)',
        borderRadius: 'var(--rapport-radius-lg)',
        boxShadow: 'var(--rapport-shadow)',
        padding: '16px',
        fontFamily: 'var(--rapport-font-family)',
        color: 'var(--rapport-text-primary)',
        backdropFilter: 'var(--rapport-blur)',
        overflow: 'hidden',
        boxSizing: 'border-box',
        zIndex: 99999,
      }}
    >
      <style>{`
        @keyframes rapportSpringEnter {
          from {
            opacity: 0;
            transform: scale(0.93) translateY(8px);
            filter: blur(2px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
            filter: blur(0);
          }
        }
        @keyframes rapportSpringExit {
          from {
            opacity: 1;
            transform: scale(1) translateY(0);
            filter: blur(0);
          }
          to {
            opacity: 0;
            transform: scale(0.93) translateY(8px);
            filter: blur(2px);
          }
        }
        .rapport-spring-enter {
          animation: rapportSpringEnter 210ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          will-change: transform, opacity, filter;
        }
        .rapport-spring-exit {
          animation: rapportSpringExit 150ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          will-change: transform, opacity, filter;
        }
      `}</style>

      {/* Premium Header — Draggable */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
          paddingBottom: '8px',
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
          <span style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '-0.02em' }}>
            Rapport Workspace
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
            onClick={onSettingsClick}
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
            title="Open Preferences Dialog"
          >
            ⚙️ Settings
          </button>
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
            title="Close workspace (Esc)"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Workspace Tabs Navigation Bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--rapport-border)', marginBottom: '12px', flexShrink: 0 }}>
        {(['AI', 'Tone', 'Strategy', 'Memory'] as const).map((tab) => {
          const isSelected = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              style={{
                flex: 1,
                padding: '6px 4px',
                background: 'transparent',
                border: 'none',
                borderBottom: isSelected ? '2px solid var(--rapport-accent)' : '2px solid transparent',
                color: isSelected ? 'var(--rapport-text-primary)' : 'var(--rapport-text-secondary)',
                fontSize: '11px',
                fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Dynamic Tab Body Container */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingRight: '2px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {activeTab === 'AI' && (
          <ErrorBoundary fallbackTitle="AI Panel Failed">
            <>
              {loading && !streamingText && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px 0' }}>
                  <div className="rapport-shimmer" style={{ width: '80px', height: '18px', borderRadius: '4px' }} />
                  <div className="rapport-shimmer" style={{ width: '100%', height: '70px', borderRadius: '8px' }} />
                  <div className="rapport-shimmer" style={{ width: '60%', height: '14px', borderRadius: '4px' }} />
                </div>
              )}

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
                    marginBottom: '12px',
                  }}
                >
                  <div style={{ fontSize: '10px', color: 'var(--rapport-accent)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '6px' }}>
                    ⚡ Streaming Suggestion...
                  </div>
                  <span>"{streamingText}"</span>
                  <span className="rapport-caret" style={{ marginLeft: '2px' }}></span>
                </div>
              )}

               {!loading && error && (
                <div style={{ padding: '14px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--rapport-radius)', marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#ef4444', marginBottom: '4px' }}>Unable to generate AI reply</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--rapport-text-secondary)', marginBottom: '8px' }}>{error}</div>
                  {onRegenerate && (
                    <button
                      onClick={onRegenerate}
                      style={{
                        background: 'var(--rapport-accent)',
                        border: 'none',
                        borderRadius: 'var(--rapport-radius-sm)',
                        color: '#ffffff',
                        cursor: 'pointer',
                        fontSize: '11px',
                        padding: '4px 10px',
                        fontWeight: 600,
                      }}
                    >
                      🔄 Retry
                    </button>
                  )}
                </div>
              )}

              {!loading && !error && (!data || suggestions.length === 0) && (
                <div
                  style={{
                    padding: '40px 16px',
                    textAlign: 'center',
                    background: 'var(--rapport-bg-hover)',
                    border: '1px dashed var(--rapport-border)',
                    borderRadius: 'var(--rapport-radius)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                  }}
                >
                  <span style={{ fontSize: '24px' }}>✨</span>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--rapport-text-primary)' }}>
                    Waiting for conversation context
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--rapport-text-secondary)', maxWidth: '280px', lineHeight: '1.4' }}>
                    Rapport AI analyzes the latest messages automatically. Press <kbd style={{ background: 'var(--rapport-bg-input)', padding: '2px 4px', borderRadius: '4px', border: '1px solid var(--rapport-border)', fontSize: '10px', color: 'var(--rapport-text-primary)' }}>⌘K</kbd> to toggle the workspace.
                  </div>
                </div>
              )}

              {!loading && !error && suggestions.length > 0 && (
                <>
                  {/* Concise Insight Card */}
                  {(() => {
                    const insight = getInsightCard(contextSignals, data?.reasoning || '');
                    return (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          background: 'var(--rapport-bg-hover)',
                          border: '1px solid var(--rapport-border)',
                          borderRadius: 'var(--rapport-radius)',
                          fontSize: '12px',
                          color: 'var(--rapport-text-primary)',
                          marginBottom: '12px',
                          flexShrink: 0,
                        }}
                      >
                        <span>{insight.icon}</span>
                        <span style={{ fontWeight: 600, color: 'var(--rapport-accent)' }}>Insight:</span>
                        <span>{insight.text}</span>
                      </div>
                    );
                  })()}

                  {/* Segmented Selector for Suggestions */}
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', overflowX: 'auto', paddingBottom: '2px', flexShrink: 0 }}>
                    {suggestions.map((sug, idx) => {
                      const isSelected = selectedIndex === idx;
                      return (
                        <button
                          key={sug.id}
                          onClick={() => setSelectedIndex(idx)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '16px',
                            border: isSelected ? '1px solid var(--rapport-accent)' : '1px solid var(--rapport-border)',
                            background: isSelected ? 'var(--rapport-accent-muted)' : 'transparent',
                            color: isSelected ? 'var(--rapport-accent)' : 'var(--rapport-text-secondary)',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all var(--rapport-transition-fast)',
                          }}
                        >
                          {pinnedIds.has(sug.id) && '📌 '}
                          {sug.tone || `Option ${idx + 1}`}
                        </button>
                      );
                    })}
                  </div>

                  {/* Primary Focused Card */}
                  {activeSuggestion && (
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        background: 'var(--rapport-bg-hover)',
                        border: '1px solid var(--rapport-border)',
                        borderRadius: 'var(--rapport-radius)',
                        padding: '14px',
                        marginBottom: '12px',
                        minHeight: '80px',
                        maxHeight: '180px',
                        overflowY: 'auto',
                        position: 'relative',
                      }}
                    >
                      {/* Badges row */}
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                        <span
                          style={{
                            fontSize: '9.5px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: 'var(--rapport-accent-muted)',
                            color: 'var(--rapport-accent)',
                            textTransform: 'uppercase',
                          }}
                        >
                          {activeSuggestion.tone || 'Suggested'}
                        </span>
                        {activeSuggestion.confidence && activeSuggestion.confidence > 0.8 && (
                          <span
                            style={{
                              fontSize: '9.5px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: 'rgba(16, 185, 129, 0.1)',
                              color: '#10b981',
                              textTransform: 'uppercase',
                            }}
                          >
                            Best Match
                          </span>
                        )}
                      </div>

                      {/* Text */}
                      <div style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--rapport-text-primary)', whiteSpace: 'pre-wrap' }}>
                        "{activeSuggestion.text}"
                      </div>

                      {activeSuggestion.explanation && (
                        <div style={{ fontSize: '11px', color: 'var(--rapport-text-secondary)', fontStyle: 'italic', marginTop: '4px' }}>
                          {activeSuggestion.explanation}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quick Action Bar Row */}
                  {activeSuggestion && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', width: '100%', marginBottom: '6px' }}>
                      <button
                        onClick={() => onInsert && onInsert(activeSuggestion.text)}
                        style={{
                          flex: 1.2,
                          minWidth: '70px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          background: 'var(--rapport-accent)',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'background 0.2s ease',
                        }}
                      >
                        📥 Insert
                      </button>
                      <button
                        onClick={() => handleCopy(activeSuggestion.text, activeSuggestion.id)}
                        style={actionBtnStyle}
                      >
                        📋 {copiedId === activeSuggestion.id ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={() => togglePin(activeSuggestion.id)}
                        style={actionBtnStyle}
                      >
                        ⭐ {pinnedIds.has(activeSuggestion.id) ? 'Unstar' : 'Star'}
                      </button>
                      <button
                        onClick={() => handleRewrite('short-direct')}
                        style={actionBtnStyle}
                        title="Make suggestion shorter"
                      >
                        🔎 Shorter
                      </button>
                      <button
                        onClick={() => handleRewrite('detailed')}
                        style={actionBtnStyle}
                        title="Make suggestion longer"
                      >
                        📢 Longer
                      </button>
                      <button
                        onClick={() => handleRewrite('professional')}
                        style={actionBtnStyle}
                        title="Rewrite professional"
                      >
                        💼 Professional
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Copilot tip (rendered underneath the active suggestions as an advice card if present) */}
              {!loading && !error && copilotTip && (
                <div
                  style={{
                    background: 'var(--rapport-accent-muted)',
                    border: '1px solid var(--rapport-border)',
                    borderRadius: 'var(--rapport-radius)',
                    padding: '8px 12px',
                    marginTop: '6px',
                    fontSize: '11.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexShrink: 0,
                    color: 'var(--rapport-text-primary)',
                  }}
                >
                  <span>💡</span>
                  <span style={{ fontWeight: 600, color: 'var(--rapport-accent)' }}>Tip:</span>
                  <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', flex: 1 }}>
                    {copilotTip}
                  </span>
                </div>
              )}
            </>
          </ErrorBoundary>
        )}

        {activeTab === 'Tone' && (
          <ErrorBoundary fallbackTitle="Tone Panel Failed">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '4px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>Detected Mood Calibration</div>
              <div style={{ fontSize: '11.5px', color: 'var(--rapport-text-secondary)', lineHeight: 1.4 }}>
                Calibration values determine outgoing style options based on the contact's interaction signals.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                <div style={{ fontSize: '12px' }}>
                  Mood: <strong style={{ color: 'var(--rapport-accent)' }}>{contextSignals.primaryEmotion || 'Neutral'}</strong>
                </div>
                <div style={{ fontSize: '12px' }}>
                  Sentiment: <strong style={{ color: 'var(--rapport-accent)' }}>{contextSignals.sentiment || 'Positive'}</strong>
                </div>
                {['Friendly', 'Professional', 'Casual', 'Direct'].map((toneName) => {
                  let pct = 25;
                  if (toneName === 'Friendly' && contextSignals.sentiment === 'positive') pct = 60;
                  if (toneName === 'Casual' && contextSignals.relationshipType === 'casual') pct = 70;
                  if (toneName === 'Professional' && contextSignals.relationshipType === 'professional') pct = 80;
                  return (
                    <div key={toneName} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                        <span>{toneName}</span>
                        <span>{pct}%</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'var(--rapport-border)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--rapport-accent)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ErrorBoundary>
        )}

        {activeTab === 'Strategy' && (
          <ErrorBoundary fallbackTitle="Strategy Panel Failed">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '4px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>Strategy Orchestrator</div>
              <div style={{ fontSize: '11.5px', color: 'var(--rapport-text-secondary)', lineHeight: 1.4 }}>
                AI maps relationship goals and speaking balance to coordinate suggestions.
              </div>
              <div style={{ padding: '12px', background: 'var(--rapport-bg-hover)', borderRadius: '8px', border: '1px solid var(--rapport-border)', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                <div style={{ fontSize: '12px', color: 'var(--rapport-text-secondary)' }}>Active Conversation Stage:</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--rapport-accent)' }}>
                  🚀 {contextSignals.stage || 'General Dialogue'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--rapport-text-secondary)', borderTop: '1px solid var(--rapport-border)', paddingTop: '8px', marginTop: '4px' }}>Target Goal:</div>
                <div style={{ fontSize: '12px', fontWeight: 600 }}>
                  🎯 {compiledPrompt?.goal || 'Build Connection'}
                </div>
                {contextSignals.dominantParticipant && (
                  <div style={{ fontSize: '12px', color: 'var(--rapport-text-secondary)', borderTop: '1px solid var(--rapport-border)', paddingTop: '8px', marginTop: '4px' }}>
                    Speaking Balance: <strong style={{ color: 'var(--rapport-text-primary)' }}>{contextSignals.speakingBalance || 'Equal'}</strong> (Dominant: {contextSignals.dominantParticipant})
                  </div>
                )}
              </div>
            </div>
          </ErrorBoundary>
        )}

        {activeTab === 'Memory' && (
          <ErrorBoundary fallbackTitle="Memory Panel Failed">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '4px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>Memory Index</div>
              <div style={{ fontSize: '11.5px', color: 'var(--rapport-text-secondary)', lineHeight: 1.4 }}>
                Rapport's Memory Engine automatically indexes relational context and facts in the background.
              </div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px', maxHeight: '220px' }}>
                {compiledPrompt?.contextSnapshot?.relationshipType ? (
                  <div style={{ padding: '10px', background: 'var(--rapport-bg-hover)', borderRadius: '6px', border: '1px solid var(--rapport-border)', fontSize: '12px' }}>
                    👤 <strong>Relationship:</strong> {compiledPrompt.contextSnapshot.relationshipType}
                  </div>
                ) : null}
                {data && data.reasoning ? (
                  <div style={{ padding: '10px', background: 'var(--rapport-bg-hover)', borderRadius: '6px', border: '1px solid var(--rapport-border)', fontSize: '12px', lineHeight: 1.4 }}>
                    🧠 <strong>Reasoning context:</strong> {data.reasoning.replace(/^Reasoning:\s*/i, '')}
                  </div>
                ) : (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--rapport-text-tertiary)', fontSize: '12px', background: 'var(--rapport-bg-hover)', borderRadius: '8px', border: '1px dashed var(--rapport-border)' }}>
                    No memories indexed for this conversation yet.
                  </div>
                )}
              </div>
            </div>
          </ErrorBoundary>
        )}

      </div>

      {/* Developer Diagnostics Panel */}
      {showDevPanel && activeTab === 'AI' && (
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
                maxHeight: '120px',
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
                
                <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--rapport-border)', paddingTop: '6px', marginTop: '4px', fontWeight: 600, color: 'var(--rapport-accent)' }}>Conversation Analytics v2:</div>
                <div style={{ gridColumn: 'span 2' }}><span style={{ color: 'var(--rapport-text-secondary)' }}>Goal:</span> {contextSignals.conversationGoal || 'N/A'}</div>
                <div><span style={{ color: 'var(--rapport-text-secondary)' }}>Prev Topic:</span> {contextSignals.previousTopic || 'None'}</div>
                <div><span style={{ color: 'var(--rapport-text-secondary)' }}>Health Score:</span> <strong style={{ color: 'var(--rapport-accent)' }}>{contextSignals.conversationHealthScore !== undefined ? `${contextSignals.conversationHealthScore}/100` : 'N/A'}</strong></div>
                <div><span style={{ color: 'var(--rapport-text-secondary)' }}>Sentiment:</span> {contextSignals.sentiment ? contextSignals.sentiment.toUpperCase() : 'N/A'}</div>
                <div><span style={{ color: 'var(--rapport-text-secondary)' }}>Energy Level:</span> {contextSignals.energyLevel ? contextSignals.energyLevel.toUpperCase() : 'N/A'}</div>
                <div><span style={{ color: 'var(--rapport-text-secondary)' }}>Dominant:</span> {contextSignals.dominantParticipant || 'N/A'}</div>
                <div><span style={{ color: 'var(--rapport-text-secondary)' }}>Balance:</span> {contextSignals.speakingBalance || 'N/A'}</div>
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
    </div>
  );
};
