import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ConversationStyle,
  LLMProviderId,
  OverlayPosition,
  RapportSettings,
  ThemePreference,
} from '@rapport/shared';
import { ApiKeyManager, ModelRegistry, ProviderManager, SettingsManager } from '@rapport/ai-core';

// ─────────────────────────────────────────────────────────────────────────────
// Design Tokens
// ─────────────────────────────────────────────────────────────────────────────

const TOKENS = {
  bg: '#0f1114',
  bgCard: '#161a1e',
  bgHover: '#1c2127',
  bgInput: '#1a1e23',
  bgToast: '#1e2228',
  border: '#2a2f37',
  borderFocus: '#00a884',
  borderDanger: '#ef4444',
  accent: '#00a884',
  accentHover: '#00c49a',
  accentMuted: 'rgba(0, 168, 132, 0.12)',
  danger: '#ef4444',
  dangerMuted: 'rgba(239, 68, 68, 0.12)',
  dangerHover: '#dc2626',
  warning: '#f59e0b',
  warningMuted: 'rgba(245, 158, 11, 0.12)',
  textPrimary: '#e8eaed',
  textSecondary: '#9ca3af',
  textTertiary: '#6b7280',
  textDanger: '#fca5a5',
  success: '#10b981',
  successMuted: 'rgba(16, 185, 129, 0.15)',
  radius: '8px',
  radiusSm: '6px',
  radiusLg: '12px',
  transition: '180ms ease-out',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  fontMono: "'SF Mono', 'Fira Code', 'JetBrains Mono', Consolas, monospace",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type SettingsTab = 'general' | 'ai' | 'memory' | 'privacy' | 'appearance' | 'advanced' | 'developer';

export interface SettingsViewProps {
  onClose?: () => void;
  mode?: 'popup' | 'sidepanel' | 'overlay';
}

interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error' | 'info';
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared Inline Styles (no external CSS dependency)
// ─────────────────────────────────────────────────────────────────────────────

const S = {
  label: {
    display: 'block',
    fontSize: '12.5px',
    fontWeight: 600,
    color: TOKENS.textPrimary,
    marginBottom: '6px',
    letterSpacing: '0.01em',
  } as React.CSSProperties,

  description: {
    fontSize: '11.5px',
    color: TOKENS.textSecondary,
    margin: '0 0 2px 0',
    lineHeight: 1.45,
  } as React.CSSProperties,

  select: {
    width: '100%',
    padding: '9px 12px',
    borderRadius: TOKENS.radiusSm,
    border: `1px solid ${TOKENS.border}`,
    background: TOKENS.bgInput,
    color: TOKENS.textPrimary,
    fontSize: '12.5px',
    fontFamily: TOKENS.fontFamily,
    outline: 'none',
    transition: `border-color ${TOKENS.transition}`,
    cursor: 'pointer',
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
  } as React.CSSProperties,

  input: {
    width: '100%',
    padding: '9px 12px',
    borderRadius: TOKENS.radiusSm,
    border: `1px solid ${TOKENS.border}`,
    background: TOKENS.bgInput,
    color: TOKENS.textPrimary,
    fontSize: '12.5px',
    fontFamily: TOKENS.fontMono,
    outline: 'none',
    transition: `border-color ${TOKENS.transition}`,
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,

  slider: {
    width: '100%',
    accentColor: TOKENS.accent,
    cursor: 'pointer',
  } as React.CSSProperties,

  section: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '18px',
  } as React.CSSProperties,

  fieldGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  } as React.CSSProperties,

  checkRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: TOKENS.radiusSm,
    border: `1px solid ${TOKENS.border}`,
    background: TOKENS.bgCard,
    cursor: 'pointer',
    transition: `background ${TOKENS.transition}, border-color ${TOKENS.transition}`,
  } as React.CSSProperties,

  btnPrimary: {
    padding: '9px 18px',
    borderRadius: TOKENS.radiusSm,
    border: 'none',
    background: TOKENS.accent,
    color: '#ffffff',
    fontSize: '12.5px',
    fontWeight: 600,
    fontFamily: TOKENS.fontFamily,
    cursor: 'pointer',
    transition: `background ${TOKENS.transition}, transform ${TOKENS.transition}`,
    outline: 'none',
  } as React.CSSProperties,

  btnOutline: {
    padding: '9px 18px',
    borderRadius: TOKENS.radiusSm,
    border: `1px solid ${TOKENS.border}`,
    background: 'transparent',
    color: TOKENS.textPrimary,
    fontSize: '12.5px',
    fontWeight: 500,
    fontFamily: TOKENS.fontFamily,
    cursor: 'pointer',
    transition: `background ${TOKENS.transition}, border-color ${TOKENS.transition}`,
    outline: 'none',
  } as React.CSSProperties,

  btnDanger: {
    padding: '9px 18px',
    borderRadius: TOKENS.radiusSm,
    border: `1px solid ${TOKENS.borderDanger}`,
    background: TOKENS.dangerMuted,
    color: TOKENS.textDanger,
    fontSize: '12.5px',
    fontWeight: 600,
    fontFamily: TOKENS.fontFamily,
    cursor: 'pointer',
    transition: `background ${TOKENS.transition}`,
    outline: 'none',
  } as React.CSSProperties,

  divider: {
    height: '1px',
    background: TOKENS.border,
    border: 'none',
    margin: '4px 0',
  } as React.CSSProperties,

  badge: (color: string, bg: string): React.CSSProperties => ({
    fontSize: '10px',
    padding: '2px 8px',
    borderRadius: '10px',
    background: bg,
    color,
    fontWeight: 600,
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
  }),
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Sub-Components
// ─────────────────────────────────────────────────────────────────────────────

const SectionHeading: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div style={{ marginBottom: '4px' }}>
    <h4
      style={{
        margin: 0,
        fontSize: '15px',
        fontWeight: 700,
        color: TOKENS.textPrimary,
        letterSpacing: '-0.01em',
      }}
    >
      {title}
    </h4>
    {subtitle && <p style={S.description}>{subtitle}</p>}
  </div>
);

const ToggleRow: React.FC<{
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}> = ({ label, description, checked, onChange, disabled }) => (
  <label
    style={{
      ...S.checkRow,
      opacity: disabled ? 0.5 : 1,
      cursor: disabled ? 'not-allowed' : 'pointer',
    }}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => !disabled && onChange(e.target.checked)}
      disabled={disabled}
      style={{ marginTop: '2px', accentColor: TOKENS.accent, cursor: disabled ? 'not-allowed' : 'pointer' }}
    />
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '12.5px', fontWeight: 500, color: TOKENS.textPrimary }}>{label}</div>
      {description && (
        <div style={{ fontSize: '11px', color: TOKENS.textSecondary, marginTop: '2px', lineHeight: 1.4 }}>
          {description}
        </div>
      )}
    </div>
  </label>
);

const SliderField: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  descriptor?: (v: number) => string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step = 1, suffix, descriptor, onChange }) => (
  <div style={S.fieldGroup}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <label style={S.label}>
        {label}
        <span style={{ fontWeight: 400, color: TOKENS.textSecondary, marginLeft: '6px' }}>
          {value}{suffix || ''}
        </span>
      </label>
      {descriptor && (
        <span style={{ fontSize: '11px', color: TOKENS.accent, fontWeight: 500 }}>{descriptor(value)}</span>
      )}
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={S.slider}
    />
  </div>
);

const ConfirmDialog: React.FC<{
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ title, message, confirmLabel, onConfirm, onCancel }) => (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(4px)',
      zIndex: 10000,
    }}
    onClick={onCancel}
  >
    <div
      style={{
        background: TOKENS.bgCard,
        borderRadius: TOKENS.radiusLg,
        border: `1px solid ${TOKENS.borderDanger}`,
        padding: '24px',
        maxWidth: '380px',
        width: '90%',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 700, color: TOKENS.textPrimary }}>
        {title}
      </h4>
      <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: TOKENS.textSecondary, lineHeight: 1.5 }}>
        {message}
      </p>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          style={S.btnOutline}
          onMouseEnter={(e) => { e.currentTarget.style.background = TOKENS.bgHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          style={S.btnDanger}
          onMouseEnter={(e) => { e.currentTarget.style.background = TOKENS.danger; e.currentTarget.style.color = '#ffffff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = TOKENS.dangerMuted; e.currentTarget.style.color = TOKENS.textDanger; }}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

const Toast: React.FC<{ message: ToastMessage; onDismiss: () => void }> = ({ message, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const bgColor = message.type === 'success' ? TOKENS.successMuted
    : message.type === 'error' ? TOKENS.dangerMuted
    : TOKENS.bgToast;
  const textColor = message.type === 'success' ? TOKENS.success
    : message.type === 'error' ? TOKENS.danger
    : TOKENS.textPrimary;
  const icon = message.type === 'success' ? '✓' : message.type === 'error' ? '✕' : 'ℹ';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        borderRadius: TOKENS.radiusSm,
        background: bgColor,
        border: `1px solid ${textColor}33`,
        color: textColor,
        fontSize: '12.5px',
        fontWeight: 500,
        animation: 'slideInUp 200ms ease-out',
      }}
    >
      <span>{icon}</span>
      <span style={{ flex: 1 }}>{message.text}</span>
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: TOKENS.textTertiary,
          cursor: 'pointer',
          fontSize: '14px',
          padding: '0 2px',
        }}
      >
        ×
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main SettingsView Component
// ─────────────────────────────────────────────────────────────────────────────

export const SettingsView: React.FC<SettingsViewProps> = ({ onClose, mode = 'overlay' }) => {
  const settingsManager = SettingsManager.getInstance();
  const keyManager = ApiKeyManager.getInstance();
  const providerManager = ProviderManager.getInstance();
  const modelRegistry = ModelRegistry.getInstance();

  // Core state
  const [settings, setSettings] = useState<RapportSettings>(settingsManager.getSettings());
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // Key state
  const [openaiKey, setOpenaiKey] = useState('');
  const [claudeKey, setClaudeKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [keyStatuses, setKeyStatuses] = useState<Record<string, 'connected' | 'invalid' | 'missing'>>({});
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { message: string; success: boolean }>>({});

  // UI state
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);

  const toastIdRef = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const addToast = useCallback((text: string, type: 'success' | 'error' | 'info') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev.slice(-3), { id, text, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ─── Effects ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = settingsManager.subscribe(setSettings);
    settingsManager.onSaveToast((msg, type) => addToast(msg, type));
    loadKeys();
    return unsub;
  }, []);

  // Scroll content to top when switching tabs
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  const loadKeys = async () => {
    const o = await keyManager.getKey('openai');
    const c = await keyManager.getKey('claude');
    const g = await keyManager.getKey('gemini');

    setOpenaiKey(o || '');
    setClaudeKey(c || '');
    setGeminiKey(g || '');

    const statuses: Record<string, 'connected' | 'invalid' | 'missing'> = {};
    for (const pid of ['openai', 'claude', 'gemini']) {
      const stat = await keyManager.getKeyStatus(pid);
      statuses[pid] = stat.hasKey ? (stat.isValidated ? 'connected' : 'invalid') : 'missing';
    }
    setKeyStatuses(statuses);
  };

  const handleSaveKey = async (providerId: string, val: string) => {
    if (val.trim()) {
      await keyManager.setKey(providerId, val.trim());
      addToast(`${providerId} key saved`, 'success');
    } else {
      await keyManager.deleteKey(providerId);
      addToast(`${providerId} key removed`, 'info');
    }
    await loadKeys();
  };

  const handleRemoveKey = async (providerId: string) => {
    await keyManager.deleteKey(providerId);
    if (providerId === 'openai') setOpenaiKey('');
    if (providerId === 'claude') setClaudeKey('');
    if (providerId === 'gemini') setGeminiKey('');
    addToast(`${providerId} key removed`, 'info');
    await loadKeys();
  };

  const handleTestKey = async (providerId: string) => {
    setTestingKey(providerId);
    setTestResult((prev) => ({ ...prev, [providerId]: { message: 'Testing connection…', success: false } }));
    try {
      const isValid = await providerManager.healthCheck(providerId);
      setTestResult((prev) => ({
        ...prev,
        [providerId]: isValid
          ? { message: 'Connected successfully', success: true }
          : { message: 'Connection failed — check key & network', success: false },
      }));
    } catch {
      setTestResult((prev) => ({
        ...prev,
        [providerId]: { message: 'Connection failed — unexpected error', success: false },
      }));
    }
    setTestingKey(null);
    await loadKeys();
  };

  const handleUpdate = (updates: Partial<RapportSettings>) => {
    settingsManager.updateSettings(updates);
  };

  // ─── Tab Definitions ────────────────────────────────────────────────────
  const tabs: { id: SettingsTab; label: string; icon: string }[] = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'ai', label: 'AI', icon: '⚡' },
    { id: 'memory', label: 'Memory', icon: '🧠' },
    { id: 'privacy', label: 'Privacy', icon: '🛡️' },
    { id: 'appearance', label: 'Appearance', icon: '🎨' },
    { id: 'advanced', label: 'Advanced', icon: '🔧' },
    { id: 'developer', label: 'Developer', icon: '🛠️' },
  ];

  // ─── Key status badge helper ────────────────────────────────────────────
  const keyStatusBadge = (providerId: string) => {
    const status = keyStatuses[providerId] || 'missing';
    if (status === 'connected') return <span style={S.badge(TOKENS.success, TOKENS.successMuted)}>Connected</span>;
    if (status === 'invalid') return <span style={S.badge(TOKENS.warning, TOKENS.warningMuted)}>Invalid</span>;
    return <span style={S.badge(TOKENS.danger, TOKENS.dangerMuted)}>Missing</span>;
  };

  // ─── Provider badge for active provider ─────────────────────────────────
  const providerBadge = (providerId: string) => {
    if (providerId === 'fake-provider') return <span style={S.badge(TOKENS.success, TOKENS.successMuted)}>Offline</span>;
    const status = keyStatuses[providerId] || 'missing';
    if (status === 'connected') return <span style={S.badge(TOKENS.success, TOKENS.successMuted)}>Ready</span>;
    return <span style={S.badge(TOKENS.danger, TOKENS.dangerMuted)}>Needs Key</span>;
  };

  // Width calculation based on mode
  const containerMaxWidth = mode === 'popup' ? '440px' : '720px';
  const containerMaxHeight = mode === 'popup' ? '560px' : '640px';
  const sidebarWidth = mode === 'popup' ? '140px' : '170px';

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: containerMaxWidth,
        maxHeight: containerMaxHeight,
        background: TOKENS.bg,
        color: TOKENS.textPrimary,
        borderRadius: TOKENS.radiusLg,
        border: `1px solid ${TOKENS.border}`,
        boxShadow: '0 24px 64px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.04)',
        fontFamily: TOKENS.fontFamily,
        overflow: 'hidden',
        position: 'relative',
      }}
      role="dialog"
      aria-label="Rapport AI Settings"
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: `1px solid ${TOKENS.border}`,
          background: 'rgba(0, 0, 0, 0.25)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: `linear-gradient(135deg, ${TOKENS.accent}, #0ea5e9)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
            }}
          >
            ⚙
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '15px',
                fontWeight: 700,
                background: `linear-gradient(135deg, ${TOKENS.textPrimary}, ${TOKENS.accent})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Settings
            </h3>
            <span style={{ fontSize: '11px', color: TOKENS.textTertiary }}>
              Rapport AI Configuration
            </span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close settings"
            style={{
              background: 'transparent',
              border: `1px solid ${TOKENS.border}`,
              borderRadius: TOKENS.radiusSm,
              color: TOKENS.textSecondary,
              fontSize: '14px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: `all ${TOKENS.transition}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = TOKENS.bgHover;
              e.currentTarget.style.color = TOKENS.textPrimary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = TOKENS.textSecondary;
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Body: Sidebar + Content ─────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Sidebar */}
        <nav
          style={{
            width: sidebarWidth,
            borderRight: `1px solid ${TOKENS.border}`,
            padding: '12px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            background: 'rgba(0, 0, 0, 0.15)',
            flexShrink: 0,
            overflowY: 'auto',
          }}
          role="tablist"
          aria-label="Settings categories"
        >
          {tabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                role="tab"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 12px',
                  borderRadius: TOKENS.radiusSm,
                  border: 'none',
                  background: isActive
                    ? `linear-gradient(135deg, ${TOKENS.accent}, ${TOKENS.accent}cc)`
                    : 'transparent',
                  color: isActive ? '#ffffff' : TOKENS.textSecondary,
                  fontSize: '12.5px',
                  fontWeight: isActive ? 600 : 500,
                  fontFamily: TOKENS.fontFamily,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: `all ${TOKENS.transition}`,
                  outline: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = TOKENS.bgHover;
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
                onFocus={(e) => {
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${TOKENS.borderFocus}`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <span style={{ fontSize: '14px', width: '18px', textAlign: 'center' }}>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div
          ref={contentRef}
          role="tabpanel"
          style={{
            flex: 1,
            padding: '20px 24px',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {/* ────────────────────────────────────────────────────────────── */}
          {/* TAB: GENERAL                                                 */}
          {/* ────────────────────────────────────────────────────────────── */}
          {activeTab === 'general' && (
            <div style={S.section}>
              <SectionHeading
                title="General"
                subtitle="Basic preferences for how Rapport AI behaves in your conversations."
              />

              {/* Language */}
              <div style={S.fieldGroup}>
                <label style={S.label}>Language</label>
                <p style={S.description}>Choose the interface and suggestion language.</p>
                <select
                  value={settings.language}
                  onChange={(e) => handleUpdate({ language: e.target.value })}
                  style={{ ...S.select, opacity: 0.6 }}
                  disabled
                >
                  <option value="en">English (More languages coming soon)</option>
                </select>
              </div>

              {/* Default Conversation Style */}
              <div style={S.fieldGroup}>
                <label style={S.label}>Default Conversation Style</label>
                <p style={S.description}>
                  Controls the overall length and depth of AI-generated suggestions.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(
                    [
                      { id: 'concise', label: 'Concise', desc: 'Short & direct replies' },
                      { id: 'balanced', label: 'Balanced', desc: 'Natural conversation length' },
                      { id: 'expressive', label: 'Expressive', desc: 'Detailed & thoughtful replies' },
                    ] as const
                  ).map((style) => (
                    <button
                      key={style.id}
                      onClick={() => handleUpdate({ defaultConversationStyle: style.id as ConversationStyle })}
                      style={{
                        flex: 1,
                        padding: '12px 10px',
                        borderRadius: TOKENS.radiusSm,
                        border: `1px solid ${
                          settings.defaultConversationStyle === style.id ? TOKENS.accent : TOKENS.border
                        }`,
                        background:
                          settings.defaultConversationStyle === style.id ? TOKENS.accentMuted : TOKENS.bgCard,
                        color: TOKENS.textPrimary,
                        cursor: 'pointer',
                        transition: `all ${TOKENS.transition}`,
                        textAlign: 'center',
                        outline: 'none',
                        fontFamily: TOKENS.fontFamily,
                      }}
                      onFocus={(e) => { e.currentTarget.style.boxShadow = `0 0 0 2px ${TOKENS.borderFocus}`; }}
                      onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <div style={{ fontSize: '12.5px', fontWeight: 600 }}>{style.label}</div>
                      <div style={{ fontSize: '10.5px', color: TOKENS.textSecondary, marginTop: '4px' }}>
                        {style.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Suggestion Count */}
              <SliderField
                label="Suggestions per Request"
                value={settings.suggestionCount}
                min={1}
                max={8}
                onChange={(v) => handleUpdate({ suggestionCount: Math.floor(v) })}
              />

              {/* Auto-Generate */}
              <ToggleRow
                label="Auto-generate suggestions"
                description="Automatically generate reply suggestions when you open a WhatsApp conversation."
                checked={settings.autoGenerate}
                onChange={(v) => handleUpdate({ autoGenerate: v })}
              />
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────── */}
          {/* TAB: AI                                                      */}
          {/* ────────────────────────────────────────────────────────────── */}
          {activeTab === 'ai' && (
            <div style={S.section}>
              <SectionHeading
                title="AI Provider & Models"
                subtitle="Select your preferred AI engine, configure API keys, and choose models."
              />

              {/* ─── Provider Selection ──────────────────────────────────── */}
              <div style={S.fieldGroup}>
                <label style={S.label}>Active Provider</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {([
                    {
                      id: 'fake-provider' as LLMProviderId,
                      title: 'Offline Mode',
                      desc: 'Local deterministic engine — no API key required.',
                    },
                    {
                      id: 'openai' as LLMProviderId,
                      title: 'OpenAI',
                      desc: 'GPT-5 / GPT-4o — industry-leading reasoning.',
                    },
                    {
                      id: 'claude' as LLMProviderId,
                      title: 'Anthropic Claude',
                      desc: 'Claude 3.5 — unmatched empathy and tone matching.',
                    },
                    {
                      id: 'gemini' as LLMProviderId,
                      title: 'Google Gemini',
                      desc: 'Gemini 2.5 — sub-second latency, 1M token context.',
                    },
                  ]).map((p) => (
                    <label
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: TOKENS.radius,
                        border: `1px solid ${
                          settings.activeProviderId === p.id ? TOKENS.accent : TOKENS.border
                        }`,
                        background:
                          settings.activeProviderId === p.id ? TOKENS.accentMuted : TOKENS.bgCard,
                        cursor: settings.localOnlyMode && p.id !== 'fake-provider' ? 'not-allowed' : 'pointer',
                        opacity: settings.localOnlyMode && p.id !== 'fake-provider' ? 0.45 : 1,
                        transition: `all ${TOKENS.transition}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="radio"
                          name="activeProvider"
                          checked={settings.activeProviderId === p.id}
                          disabled={settings.localOnlyMode && p.id !== 'fake-provider'}
                          onChange={() => handleUpdate({ activeProviderId: p.id })}
                          style={{ accentColor: TOKENS.accent }}
                        />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>{p.title}</div>
                          <div style={{ fontSize: '11px', color: TOKENS.textSecondary }}>{p.desc}</div>
                        </div>
                      </div>
                      {providerBadge(p.id)}
                    </label>
                  ))}
                </div>
              </div>

              <hr style={S.divider} />

              {/* ─── API Key Management ──────────────────────────────────── */}
              <div style={S.fieldGroup}>
                <label style={S.label}>API Keys</label>
                <p style={S.description}>
                  Keys are stored encrypted locally and are never sent to Rapport servers.
                </p>
              </div>

              {([
                { id: 'openai', name: 'OpenAI', keyVal: openaiKey, setKeyVal: setOpenaiKey, placeholder: 'sk-proj-...' },
                { id: 'claude', name: 'Anthropic Claude', keyVal: claudeKey, setKeyVal: setClaudeKey, placeholder: 'sk-ant-...' },
                { id: 'gemini', name: 'Google Gemini', keyVal: geminiKey, setKeyVal: setGeminiKey, placeholder: 'AIzaSy...' },
              ]).map((k) => (
                <div
                  key={k.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    padding: '12px',
                    borderRadius: TOKENS.radius,
                    background: TOKENS.bgCard,
                    border: `1px solid ${TOKENS.border}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 600 }}>{k.name}</span>
                    {keyStatusBadge(k.id)}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type={showKeys[k.id] ? 'text' : 'password'}
                      value={k.keyVal}
                      placeholder={k.placeholder}
                      onChange={(e) => k.setKeyVal(e.target.value)}
                      onBlur={() => handleSaveKey(k.id, k.keyVal)}
                      style={{ ...S.input, flex: 1 }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = TOKENS.borderFocus; }}
                      onBlurCapture={(e) => { e.currentTarget.style.borderColor = TOKENS.border; }}
                      aria-label={`${k.name} API key`}
                    />
                    <button
                      onClick={() => setShowKeys((prev) => ({ ...prev, [k.id]: !prev[k.id] }))}
                      style={{ ...S.btnOutline, padding: '8px 10px', fontSize: '11px', whiteSpace: 'nowrap' }}
                      title={showKeys[k.id] ? 'Hide key' : 'Show key'}
                      aria-label={showKeys[k.id] ? 'Hide key' : 'Show key'}
                    >
                      {showKeys[k.id] ? '🙈' : '👁️'}
                    </button>
                    <button
                      onClick={() => handleTestKey(k.id)}
                      disabled={testingKey === k.id || !k.keyVal.trim()}
                      style={{
                        ...S.btnPrimary,
                        padding: '8px 14px',
                        fontSize: '11px',
                        opacity: !k.keyVal.trim() ? 0.5 : 1,
                      }}
                      aria-label={`Test ${k.name} connection`}
                    >
                      {testingKey === k.id ? '⋯' : 'Test'}
                    </button>
                    {k.keyVal && (
                      <button
                        onClick={() => handleRemoveKey(k.id)}
                        style={{ ...S.btnDanger, padding: '8px 10px', fontSize: '11px' }}
                        title="Remove key"
                        aria-label={`Remove ${k.name} key`}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {testResult[k.id] && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        color: testResult[k.id].success ? TOKENS.success : TOKENS.danger,
                      }}
                    >
                      {testResult[k.id].success ? '✓' : '✕'} {testResult[k.id].message}
                    </span>
                  )}
                </div>
              ))}

              <hr style={S.divider} />

              {/* ─── Model Selection ─────────────────────────────────────── */}
              <div style={S.fieldGroup}>
                <label style={S.label}>
                  Model — {settings.activeProviderId === 'fake-provider' ? 'Offline' : settings.activeProviderId}
                </label>
                <p style={S.description}>
                  Choose the specific model for your active provider.
                </p>
                {settings.activeProviderId !== 'fake-provider' && (
                  <select
                    value={
                      settings.activeProviderId === 'openai'
                        ? settings.openaiModel
                        : settings.activeProviderId === 'claude'
                        ? settings.claudeModel
                        : settings.geminiModel
                    }
                    onChange={(e) => {
                      const key =
                        settings.activeProviderId === 'openai'
                          ? 'openaiModel'
                          : settings.activeProviderId === 'claude'
                          ? 'claudeModel'
                          : 'geminiModel';
                      handleUpdate({ [key]: e.target.value });
                    }}
                    style={S.select}
                    aria-label="Model selection"
                  >
                    {modelRegistry.getModelsForProvider(settings.activeProviderId).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} — {m.description}
                      </option>
                    ))}
                  </select>
                )}
                {settings.activeProviderId === 'fake-provider' && (
                  <div
                    style={{
                      padding: '12px',
                      borderRadius: TOKENS.radiusSm,
                      background: TOKENS.bgCard,
                      border: `1px solid ${TOKENS.border}`,
                      fontSize: '12px',
                      color: TOKENS.textSecondary,
                    }}
                  >
                    Offline Deterministic Engine — no model selection needed.
                  </div>
                )}
              </div>

              <hr style={S.divider} />

              {/* ─── Default Tone ────────────────────────────────────────── */}
              <div style={S.fieldGroup}>
                <label style={S.label}>Preferred Reply Tone</label>
                <p style={S.description}>
                  The default tone used when generating reply suggestions. This can be overridden per-conversation.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {[
                    'Friendly', 'Professional', 'Casual', 'Supportive', 'Playful',
                    'Flirty', 'Formal', 'Empathetic', 'Confident', 'Humorous',
                  ].map((tone) => (
                    <button
                      key={tone}
                      onClick={() => handleUpdate({ defaultTone: tone })}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: `1px solid ${settings.defaultTone === tone ? TOKENS.accent : TOKENS.border}`,
                        background: settings.defaultTone === tone ? TOKENS.accentMuted : 'transparent',
                        color: settings.defaultTone === tone ? TOKENS.accent : TOKENS.textSecondary,
                        fontSize: '11.5px',
                        fontWeight: settings.defaultTone === tone ? 600 : 500,
                        fontFamily: TOKENS.fontFamily,
                        cursor: 'pointer',
                        transition: `all ${TOKENS.transition}`,
                        outline: 'none',
                      }}
                      onFocus={(e) => { e.currentTarget.style.boxShadow = `0 0 0 2px ${TOKENS.borderFocus}`; }}
                      onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              {/* ─── Fallback Provider ───────────────────────────────────── */}
              <div style={S.fieldGroup}>
                <label style={S.label}>Fallback Provider</label>
                <p style={S.description}>
                  If the active provider fails or is rate-limited, suggestions fall back to this provider.
                </p>
                <select
                  value={settings.fallbackProviderId}
                  onChange={(e) => handleUpdate({ fallbackProviderId: e.target.value as LLMProviderId })}
                  style={S.select}
                  aria-label="Fallback provider"
                >
                  <option value="fake-provider">Offline Mode</option>
                  <option value="openai">OpenAI</option>
                  <option value="claude">Anthropic Claude</option>
                  <option value="gemini">Google Gemini</option>
                </select>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────── */}
          {/* TAB: MEMORY                                                  */}
          {/* ────────────────────────────────────────────────────────────── */}
          {activeTab === 'memory' && (
            <div style={S.section}>
              <SectionHeading
                title="Memory System"
                subtitle="Control what Rapport AI remembers about your conversations to personalize suggestions."
              />

              <ToggleRow
                label="Enable Memory"
                description="When enabled, Rapport AI extracts and remembers facts, preferences, and plans from conversations to generate more personalized suggestions."
                checked={settings.enableMemory}
                onChange={(v) => handleUpdate({ enableMemory: v })}
              />

              {settings.enableMemory && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={S.label}>What to Remember</label>
                    <ToggleRow
                      label="Preferences"
                      description="Likes, dislikes, food choices, hobbies, and personal preferences."
                      checked={settings.rememberPreferences}
                      onChange={(v) => handleUpdate({ rememberPreferences: v })}
                    />
                    <ToggleRow
                      label="Plans & Commitments"
                      description="Upcoming meetings, trips, events, and scheduled activities."
                      checked={settings.rememberPlans}
                      onChange={(v) => handleUpdate({ rememberPlans: v })}
                    />
                    <ToggleRow
                      label="Important Dates"
                      description="Birthdays, anniversaries, deadlines, and milestones."
                      checked={settings.rememberDates}
                      onChange={(v) => handleUpdate({ rememberDates: v })}
                    />
                    <ToggleRow
                      label="Interests & Topics"
                      description="Recurring topics, shared interests, and conversation themes."
                      checked={settings.rememberInterests}
                      onChange={(v) => handleUpdate({ rememberInterests: v })}
                    />
                  </div>

                  <ToggleRow
                    label="Auto-extract memories"
                    description="Automatically detect and save important facts from conversations."
                    checked={settings.autoExtractMemories}
                    onChange={(v) => handleUpdate({ autoExtractMemories: v })}
                  />

                  <SliderField
                    label="Memory Budget"
                    value={settings.maxMemoriesInBudget}
                    min={1}
                    max={20}
                    suffix=" memories"
                    descriptor={(v) => v <= 3 ? 'Minimal' : v <= 8 ? 'Balanced' : 'Comprehensive'}
                    onChange={(v) => handleUpdate({ maxMemoriesInBudget: Math.floor(v) })}
                  />

                  <hr style={S.divider} />

                  {/* Memory Statistics */}
                  <div style={S.fieldGroup}>
                    <label style={S.label}>Memory Statistics</label>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap: '10px',
                      }}
                    >
                      {[
                        { label: 'Total Memories', value: '—' },
                        { label: 'Contacts', value: '—' },
                        { label: 'Storage', value: '—' },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          style={{
                            padding: '12px',
                            borderRadius: TOKENS.radiusSm,
                            background: TOKENS.bgCard,
                            border: `1px solid ${TOKENS.border}`,
                            textAlign: 'center',
                          }}
                        >
                          <div style={{ fontSize: '18px', fontWeight: 700, color: TOKENS.accent }}>{stat.value}</div>
                          <div style={{ fontSize: '10.5px', color: TOKENS.textSecondary, marginTop: '4px' }}>
                            {stat.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <hr style={S.divider} />

                  {/* Destructive actions */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() =>
                        setConfirmDialog({
                          title: 'Forget Current Contact',
                          message:
                            'This will delete all stored memories for the currently active contact. This action cannot be undone.',
                          confirmLabel: 'Forget Contact',
                          onConfirm: () => {
                            addToast('Contact memories cleared', 'success');
                            setConfirmDialog(null);
                          },
                        })
                      }
                      style={S.btnOutline}
                    >
                      Forget Current Contact
                    </button>
                    <button
                      onClick={() =>
                        setConfirmDialog({
                          title: 'Clear All Memories',
                          message:
                            'This will permanently delete ALL stored memories for every contact. This action cannot be undone.',
                          confirmLabel: 'Clear Everything',
                          onConfirm: () => {
                            addToast('All memories cleared', 'success');
                            setConfirmDialog(null);
                          },
                        })
                      }
                      style={S.btnDanger}
                    >
                      Clear All Memories
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────── */}
          {/* TAB: PRIVACY                                                 */}
          {/* ────────────────────────────────────────────────────────────── */}
          {activeTab === 'privacy' && (
            <div style={S.section}>
              <SectionHeading
                title="Privacy & Data"
                subtitle="Control how your data is processed and stored."
              />

              {/* Data storage explanation */}
              <div
                style={{
                  padding: '14px',
                  borderRadius: TOKENS.radius,
                  background: TOKENS.accentMuted,
                  border: `1px solid ${TOKENS.accent}33`,
                  fontSize: '12px',
                  color: TOKENS.textSecondary,
                  lineHeight: 1.55,
                }}
              >
                <strong style={{ color: TOKENS.textPrimary }}>What data is stored?</strong>
                <br />
                API keys (encrypted), user preferences, extracted memories, and conversation
                context summaries. All data is stored <strong>locally in your browser</strong> using{' '}
                <code style={{ fontSize: '11px', color: TOKENS.accent }}>chrome.storage.local</code>.
                No data is sent to Rapport servers — only to your selected AI provider when generating suggestions.
              </div>

              <ToggleRow
                label="Local-Only Mode"
                description="Disables all external API calls and forces the Offline provider. No data ever leaves your browser."
                checked={settings.localOnlyMode}
                onChange={(v) => handleUpdate({ localOnlyMode: v })}
              />

              <ToggleRow
                label="Mask Contact Names"
                description="Replace real contact names with anonymous placeholders before sending conversation context to AI providers."
                checked={settings.maskContactNames}
                onChange={(v) => handleUpdate({ maskContactNames: v })}
              />

              <hr style={S.divider} />

              {/* Data management */}
              <div style={S.fieldGroup}>
                <label style={S.label}>Data Management</label>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={() => {
                    const json = settingsManager.exportSettings();
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `rapport-settings-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    addToast('Settings exported', 'success');
                  }}
                  style={S.btnOutline}
                >
                  📦 Export Stored Data
                </button>

                <button
                  onClick={() =>
                    setConfirmDialog({
                      title: 'Delete All Stored Data',
                      message:
                        'This will permanently delete all settings, API keys, memories, and cached data. You will need to reconfigure Rapport AI from scratch. This cannot be undone.',
                      confirmLabel: 'Delete Everything',
                      onConfirm: async () => {
                        await settingsManager.clearAllData();
                        await loadKeys();
                        addToast('All data deleted', 'success');
                        setConfirmDialog(null);
                      },
                    })
                  }
                  style={S.btnDanger}
                >
                  🗑️ Delete All Stored Data
                </button>

                <button
                  onClick={() =>
                    setConfirmDialog({
                      title: 'Reset Extension',
                      message:
                        'This will reset ALL settings to factory defaults, delete all API keys, clear all memories, and restore the extension to its initial state. Are you absolutely sure?',
                      confirmLabel: 'Reset Extension',
                      onConfirm: async () => {
                        await settingsManager.clearAllData();
                        await settingsManager.resetToDefaults();
                        await loadKeys();
                        addToast('Extension reset to factory state', 'success');
                        setConfirmDialog(null);
                      },
                    })
                  }
                  style={{ ...S.btnDanger, borderColor: TOKENS.danger }}
                >
                  ⚠️ Reset Extension
                </button>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────── */}
          {/* TAB: APPEARANCE                                              */}
          {/* ────────────────────────────────────────────────────────────── */}
          {activeTab === 'appearance' && (
            <div style={S.section}>
              <SectionHeading
                title="Appearance"
                subtitle="Customize the look and feel of the Rapport AI overlay."
              />

              {/* Theme */}
              <div style={S.fieldGroup}>
                <label style={S.label}>Theme</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(
                    [
                      { id: 'light', label: '☀️ Light', desc: 'Clean light interface' },
                      { id: 'dark', label: '🌙 Dark', desc: 'Easy on the eyes' },
                      { id: 'system', label: '💻 System', desc: 'Follow OS preference' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleUpdate({ theme: t.id as ThemePreference })}
                      style={{
                        flex: 1,
                        padding: '14px 10px',
                        borderRadius: TOKENS.radius,
                        border: `1px solid ${settings.theme === t.id ? TOKENS.accent : TOKENS.border}`,
                        background: settings.theme === t.id ? TOKENS.accentMuted : TOKENS.bgCard,
                        color: TOKENS.textPrimary,
                        cursor: 'pointer',
                        transition: `all ${TOKENS.transition}`,
                        textAlign: 'center',
                        outline: 'none',
                        fontFamily: TOKENS.fontFamily,
                      }}
                      onFocus={(e) => { e.currentTarget.style.boxShadow = `0 0 0 2px ${TOKENS.borderFocus}`; }}
                      onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <div style={{ fontSize: '20px' }}>{t.label.split(' ')[0]}</div>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, marginTop: '6px' }}>
                        {t.label.split(' ').slice(1).join(' ')}
                      </div>
                      <div style={{ fontSize: '10.5px', color: TOKENS.textSecondary, marginTop: '2px' }}>
                        {t.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Compact Mode */}
              <ToggleRow
                label="Compact Mode"
                description="Reduce padding and font sizes for a denser interface."
                checked={settings.compactMode}
                onChange={(v) => handleUpdate({ compactMode: v })}
              />

              {/* Animations */}
              <ToggleRow
                label="Animations"
                description="Enable smooth transitions and micro-animations throughout the overlay."
                checked={settings.animationsEnabled}
                onChange={(v) => handleUpdate({ animationsEnabled: v })}
              />

              {/* Overlay Position */}
              <div style={S.fieldGroup}>
                <label style={S.label}>Overlay Position</label>
                <p style={S.description}>Where the floating toolbar appears relative to the WhatsApp chat.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {(
                    [
                      { id: 'top-left', label: '↖ Top Left' },
                      { id: 'top-right', label: '↗ Top Right' },
                      { id: 'bottom-left', label: '↙ Bottom Left' },
                      { id: 'bottom-right', label: '↘ Bottom Right' },
                    ] as const
                  ).map((pos) => (
                    <button
                      key={pos.id}
                      onClick={() => handleUpdate({ overlayPosition: pos.id as OverlayPosition })}
                      style={{
                        padding: '10px',
                        borderRadius: TOKENS.radiusSm,
                        border: `1px solid ${
                          settings.overlayPosition === pos.id ? TOKENS.accent : TOKENS.border
                        }`,
                        background:
                          settings.overlayPosition === pos.id ? TOKENS.accentMuted : TOKENS.bgCard,
                        color: settings.overlayPosition === pos.id ? TOKENS.accent : TOKENS.textSecondary,
                        fontSize: '12px',
                        fontWeight: settings.overlayPosition === pos.id ? 600 : 500,
                        fontFamily: TOKENS.fontFamily,
                        cursor: 'pointer',
                        transition: `all ${TOKENS.transition}`,
                        outline: 'none',
                        textAlign: 'center',
                      }}
                      onFocus={(e) => { e.currentTarget.style.boxShadow = `0 0 0 2px ${TOKENS.borderFocus}`; }}
                      onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Color (future-ready) */}
              <div style={{ ...S.fieldGroup, opacity: 0.5 }}>
                <label style={S.label}>
                  Accent Color{' '}
                  <span style={S.badge(TOKENS.textSecondary, TOKENS.bgHover)}>Coming Soon</span>
                </label>
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    padding: '10px 12px',
                    borderRadius: TOKENS.radiusSm,
                    background: TOKENS.bgCard,
                    border: `1px solid ${TOKENS.border}`,
                  }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: TOKENS.accent,
                      border: '2px solid #fff2',
                    }}
                  />
                  <span style={{ fontSize: '12px', color: TOKENS.textTertiary }}>
                    Accent color customization will be available in a future update.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────── */}
          {/* TAB: ADVANCED                                                */}
          {/* ────────────────────────────────────────────────────────────── */}
          {activeTab === 'advanced' && (
            <div style={S.section}>
              <SectionHeading
                title="Advanced"
                subtitle="Fine-tune AI generation parameters, network behavior, and context budgets."
              />

              {/* Collapse toggle */}
              <button
                onClick={() => setAdvancedExpanded(!advancedExpanded)}
                style={{
                  ...S.btnOutline,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                }}
              >
                <span>{advancedExpanded ? 'Hide Advanced Options' : 'Show Advanced Options'}</span>
                <span
                  style={{
                    transition: `transform ${TOKENS.transition}`,
                    transform: advancedExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    display: 'inline-block',
                  }}
                >
                  ▾
                </span>
              </button>

              {advancedExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <SliderField
                    label="Temperature"
                    value={settings.temperature}
                    min={0}
                    max={1}
                    step={0.05}
                    descriptor={(v) =>
                      v < 0.3 ? 'Precise' : v < 0.6 ? 'Balanced' : v < 0.85 ? 'Creative' : 'Wild'
                    }
                    onChange={(v) => handleUpdate({ temperature: v })}
                  />

                  <SliderField
                    label="Maximum Output Tokens"
                    value={settings.maxTokens}
                    min={50}
                    max={4000}
                    step={50}
                    suffix=" tokens"
                    onChange={(v) => handleUpdate({ maxTokens: Math.floor(v) })}
                  />

                  <ToggleRow
                    label="Streaming Responses"
                    description="Display AI-generated text as it streams in real-time rather than waiting for the full response."
                    checked={settings.streamingEnabled}
                    onChange={(v) => handleUpdate({ streamingEnabled: v })}
                  />

                  <SliderField
                    label="Request Timeout"
                    value={settings.requestTimeoutMs}
                    min={3000}
                    max={120000}
                    step={1000}
                    suffix="ms"
                    descriptor={(v) =>
                      v <= 10000 ? 'Fast' : v <= 30000 ? 'Normal' : v <= 60000 ? 'Patient' : 'Very Patient'
                    }
                    onChange={(v) => handleUpdate({ requestTimeoutMs: Math.floor(v) })}
                  />

                  <SliderField
                    label="Retry Count"
                    value={settings.maxRetries}
                    min={0}
                    max={5}
                    descriptor={(v) => (v === 0 ? 'No retries' : `${v} retries`)}
                    onChange={(v) => handleUpdate({ maxRetries: Math.floor(v) })}
                  />

                  <ToggleRow
                    label="Provider Fallback"
                    description="Automatically try the fallback provider if the active provider fails."
                    checked={settings.enableProviderFallback}
                    onChange={(v) => handleUpdate({ enableProviderFallback: v })}
                  />

                  <SliderField
                    label="Memory Context Budget"
                    value={settings.maxMemoriesInBudget}
                    min={1}
                    max={20}
                    suffix=" memories"
                    onChange={(v) => handleUpdate({ maxMemoriesInBudget: Math.floor(v) })}
                  />

                  <SliderField
                    label="Prompt Context Budget"
                    value={settings.promptContextBudget}
                    min={500}
                    max={32000}
                    step={500}
                    suffix=" tokens"
                    onChange={(v) => handleUpdate({ promptContextBudget: Math.floor(v) })}
                  />

                  <SliderField
                    label="Cache Duration"
                    value={settings.cacheDurationMs / 1000}
                    min={0}
                    max={3600}
                    step={30}
                    suffix="s"
                    descriptor={(v) =>
                      v === 0 ? 'Disabled' : v < 60 ? `${v}s` : `${Math.floor(v / 60)}m ${v % 60}s`
                    }
                    onChange={(v) => handleUpdate({ cacheDurationMs: Math.floor(v) * 1000 })}
                  />
                </div>
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────── */}
          {/* TAB: DEVELOPER                                               */}
          {/* ────────────────────────────────────────────────────────────── */}
          {activeTab === 'developer' && (
            <div style={S.section}>
              <SectionHeading
                title="Developer"
                subtitle="Diagnostic tools and observability for debugging the AI pipeline."
              />

              <ToggleRow
                label="Enable Developer Mode"
                description="Unlock advanced debugging tools. These are intended for developers and advanced users."
                checked={settings.debugLogs}
                onChange={(v) => {
                  // If disabling dev mode, turn off all sub-toggles
                  if (!v) {
                    handleUpdate({
                      debugLogs: false,
                      inspectorMode: false,
                      showFinalPrompt: false,
                      showRetrievedMemories: false,
                      showProviderLogs: false,
                      showRequestTiming: false,
                      showTokenUsage: false,
                    });
                  } else {
                    handleUpdate({ debugLogs: true });
                  }
                }}
              />

              {settings.debugLogs && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <ToggleRow
                    label="Show AI Pipeline Inspector"
                    description="Display a real-time drawer showing each stage of the AI context pipeline."
                    checked={settings.inspectorMode}
                    onChange={(v) => handleUpdate({ inspectorMode: v })}
                  />

                  <ToggleRow
                    label="View Final Prompt"
                    description="Inspect the complete system and user prompts sent to the AI provider."
                    checked={settings.showFinalPrompt}
                    onChange={(v) => handleUpdate({ showFinalPrompt: v })}
                  />

                  <ToggleRow
                    label="View Retrieved Memories"
                    description="Show which memories are retrieved and included in the prompt for each request."
                    checked={settings.showRetrievedMemories}
                    onChange={(v) => handleUpdate({ showRetrievedMemories: v })}
                  />

                  <ToggleRow
                    label="Provider Logs"
                    description="Log provider request/response payloads and error details to the console."
                    checked={settings.showProviderLogs}
                    onChange={(v) => handleUpdate({ showProviderLogs: v })}
                  />

                  <ToggleRow
                    label="Request Timing"
                    description="Display latency breakdown for each request stage (context, prompt, network, parse)."
                    checked={settings.showRequestTiming}
                    onChange={(v) => handleUpdate({ showRequestTiming: v })}
                  />

                  <ToggleRow
                    label="Token Usage"
                    description="Show input/output token counts and cost estimates in the overlay."
                    checked={settings.showTokenUsage}
                    onChange={(v) => handleUpdate({ showTokenUsage: v })}
                  />

                  <hr style={S.divider} />

                  <button
                    onClick={() => {
                      const report = settingsManager.exportDebugReport();
                      const blob = new Blob([report], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `rapport-debug-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      addToast('Debug report exported', 'success');
                    }}
                    style={S.btnOutline}
                  >
                    📋 Export Debug Report
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Toast Notifications ─────────────────────────────────────────── */}
      {toasts.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            zIndex: 100,
            maxWidth: '280px',
          }}
        >
          {toasts.map((t) => (
            <Toast key={t.id} message={t} onDismiss={() => removeToast(t.id)} />
          ))}
        </div>
      )}

      {/* ── Confirm Dialog ──────────────────────────────────────────────── */}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
};
