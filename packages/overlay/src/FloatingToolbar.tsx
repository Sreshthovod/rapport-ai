import React from 'react';
import { AIIcon, LogoIcon, MemoryIcon, SettingsIcon, StrategyIcon, ToneIcon } from './Icons.js';
import { ToolbarButton } from './ToolbarButton.js';

export interface FloatingToolbarProps {
  visible: boolean;
  onSettingsClick?: () => void;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  visible,
  onSettingsClick,
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
      {/* Brand Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          paddingRight: '6px',
          borderRight: '1px solid var(--rapport-border)',
          color: 'var(--rapport-accent)',
          fontWeight: 600,
          fontSize: '12px',
        }}
      >
        <LogoIcon size={18} />
        <span style={{ color: 'var(--rapport-text-primary)' }}>Rapport AI</span>
      </div>

      {/* Action Buttons (Disabled Placeholders) */}
      <ToolbarButton id="ai" label="AI" icon={<AIIcon />} disabled tooltipText="AI Generation (Disabled in Milestone 2)" />
      <ToolbarButton id="tone" label="Tone" icon={<ToneIcon />} disabled tooltipText="Tone Calibration (Disabled in Milestone 2)" />
      <ToolbarButton id="strategy" label="Strategy" icon={<StrategyIcon />} disabled tooltipText="Strategy Engine (Disabled in Milestone 2)" />
      <ToolbarButton id="memory" label="Memory" icon={<MemoryIcon />} disabled tooltipText="Memory Manager (Disabled in Milestone 2)" />

      {/* Active Settings Button */}
      <ToolbarButton
        id="settings"
        label="Settings"
        icon={<SettingsIcon />}
        disabled={false}
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
