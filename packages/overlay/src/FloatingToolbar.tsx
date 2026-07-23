import React from 'react';
import { AIIcon, LogoIcon, MemoryIcon, SettingsIcon, StrategyIcon, ToneIcon } from './Icons.js';
import { ToolbarButton } from './ToolbarButton.js';

export interface FloatingToolbarProps {
  visible: boolean;
  isWorkspaceOpen: boolean;
  activeTab: 'AI' | 'Tone' | 'Strategy' | 'Memory' | 'Settings';
  onSettingsClick?: () => void;
  onAIClick?: () => void;
  onToneClick?: () => void;
  onStrategyClick?: () => void;
  onMemoryClick?: () => void;
  onLogoClick?: () => void;
  pendingCommitmentText?: string;
  onDragStart?: (e: React.PointerEvent) => void;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  visible,
  isWorkspaceOpen,
  activeTab,
  onSettingsClick,
  onAIClick,
  onToneClick,
  onStrategyClick,
  onMemoryClick,
  onLogoClick,
  pendingCommitmentText,
  onDragStart,
}) => {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const shortcutHint = isMac ? '⌘K' : 'Ctrl+K';

  if (!visible) return null;

  return (
    <div
      className="rapport-animate-enter"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        background: 'var(--rapport-bg)',
        border: '1px solid var(--rapport-border)',
        borderRadius: 'var(--rapport-radius)',
        boxShadow: 'var(--rapport-shadow)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Brand Badge / Drag Handle */}
      <style>{`
        @keyframes rapportGlowPulse {
          0% {
            box-shadow: 0 0 4px rgba(0, 168, 132, 0.2);
            background: rgba(0, 168, 132, 0.05);
          }
          50% {
            box-shadow: 0 0 12px rgba(0, 168, 132, 0.5);
            background: rgba(0, 168, 132, 0.15);
          }
          100% {
            box-shadow: 0 0 4px rgba(0, 168, 132, 0.2);
            background: rgba(0, 168, 132, 0.05);
          }
        }
        .rapport-logo-inactive {
          box-shadow: 0 0 8px rgba(0, 168, 132, 0.35);
          animation: rapportGlowPulse 2.2s infinite ease-in-out;
        }
        .rapport-logo-inactive:hover {
          box-shadow: 0 0 14px rgba(0, 168, 132, 0.6) !important;
          background: rgba(0, 168, 132, 0.2) !important;
        }
      `}</style>
      <div
        onPointerDown={(e) => {
          if (e.button === 0) {
            const startX = e.clientX;
            const startY = e.clientY;
            let moved = false;
            
            const handleMove = (me: PointerEvent) => {
              if (Math.abs(me.clientX - startX) > 4 || Math.abs(me.clientY - startY) > 4) {
                moved = true;
              }
            };
            
            const handleUp = () => {
              window.removeEventListener('pointermove', handleMove);
              window.removeEventListener('pointerup', handleUp);
              if (!moved && onLogoClick) {
                onLogoClick();
              }
            };
            
            window.addEventListener('pointermove', handleMove);
            window.addEventListener('pointerup', handleUp);
            if (onDragStart) {
              onDragStart(e);
            }
          }
        }}
        className={!isWorkspaceOpen ? 'rapport-logo-inactive' : ''}
        title="Click to toggle workspace | Drag to move"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 8px',
          borderRadius: '6px',
          borderRight: '1px solid var(--rapport-border)',
          color: 'var(--rapport-accent)',
          fontWeight: 600,
          fontSize: '12px',
          cursor: 'pointer',
          touchAction: 'none',
          userSelect: 'none',
          transition: 'all 0.3s ease',
        }}
      >
        <LogoIcon size={18} />
        <span style={{ color: 'var(--rapport-text-primary)' }}>Rapport AI</span>
      </div>

      {/* Non-intrusive Pending Commitment Badge */}
      {pendingCommitmentText && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: '6px',
            color: '#f59e0b',
            fontSize: '11px',
            fontWeight: 500,
          }}
        >
          <span>⚠️</span>
          <span>{pendingCommitmentText}</span>
        </div>
      )}

      {/* Active AI Button */}
      <ToolbarButton
        id="ai"
        label="AI"
        icon={<AIIcon />}
        disabled={false}
        active={isWorkspaceOpen && activeTab === 'AI'}
        onClick={onAIClick}
        tooltipText="Generate AI Suggested Reply"
      />

      <ToolbarButton
        id="tone"
        label="Tone"
        icon={<ToneIcon />}
        disabled={false}
        active={isWorkspaceOpen && activeTab === 'Tone'}
        onClick={onToneClick}
        tooltipText="Tone Calibration"
      />

      <ToolbarButton
        id="strategy"
        label="Strategy"
        icon={<StrategyIcon />}
        disabled={false}
        active={isWorkspaceOpen && activeTab === 'Strategy'}
        onClick={onStrategyClick}
        tooltipText="Strategy Engine"
      />

      <ToolbarButton
        id="memory"
        label="Memory"
        icon={<MemoryIcon />}
        disabled={false}
        active={isWorkspaceOpen && activeTab === 'Memory'}
        onClick={onMemoryClick}
        tooltipText="Memory Manager"
      />

      {/* Active Settings Button */}
      <ToolbarButton
        id="settings"
        label="Settings"
        icon={<SettingsIcon />}
        disabled={false}
        active={isWorkspaceOpen && activeTab === 'Settings'}
        onClick={onSettingsClick}
        tooltipText="Rapport Settings"
      />

      {/* Keyboard Shortcut Badge */}
      <div
        style={{
          marginLeft: '4px',
          padding: '2px 6px',
          background: 'var(--rapport-hover-bg)',
          borderRadius: '4px',
          color: 'var(--rapport-text-secondary)',
          fontSize: '10px',
          fontFamily: 'monospace',
        }}
        title="Toggle visibility"
      >
        {shortcutHint}
      </div>
    </div>
  );
};
