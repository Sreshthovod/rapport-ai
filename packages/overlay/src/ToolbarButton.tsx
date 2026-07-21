import React from 'react';
import { ToolbarButtonProps } from './types.js';

export const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  id,
  label,
  icon,
  disabled = false,
  active = false,
  onClick,
  tooltipText,
}) => {
  return (
    <button
      id={`rapport-btn-${id}`}
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      aria-label={label}
      title={tooltipText || label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        height: '32px',
        padding: '0 10px',
        border: '1px solid var(--rapport-border)',
        borderRadius: '8px',
        background: active ? 'var(--rapport-hover-bg)' : 'transparent',
        color: disabled ? 'var(--rapport-accent-disabled)' : 'var(--rapport-text-primary)',
        fontSize: '12px',
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        outline: 'none',
        transition: 'var(--rapport-transition-fast)',
        userSelect: 'none',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
};
