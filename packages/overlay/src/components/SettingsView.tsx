import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ConversationStyle,
  LLMProviderId,
  OverlayPosition,
  RapportSettings,
  ThemePreference,
  WritingStyleProfile,
} from '@rapport/shared';
import { ApiKeyManager, ModelRegistry, ProviderManager, SettingsManager, WritingStyleEngine } from '@rapport/ai-core';
import { BrowserStorageMemoryStore, MemoryRecord, MemoryCategory, MemoryService } from '@rapport/memory';

// ─────────────────────────────────────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────────────────────────────────────

type PreferencesTab =
  | 'provider'
  | 'mode'
  | 'personality'
  | 'style'
  | 'memory'
  | 'privacy'
  | 'appearance'
  | 'about'
  | 'advanced'
  | 'developer';

export interface SettingsViewProps {
  onClose?: () => void;
  mode?: 'popup' | 'sidepanel' | 'overlay' | 'workspace';
}

interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error' | 'info';
}

// ─────────────────────────────────────────────────────────────────────────────
// PreferencesView Component (Redesigned from SettingsView)
// ─────────────────────────────────────────────────────────────────────────────

export const SettingsView: React.FC<SettingsViewProps> = ({ onClose, mode = 'overlay' }) => {
  const settingsManager = SettingsManager.getInstance();
  const keyManager = ApiKeyManager.getInstance();
  const providerManager = ProviderManager.getInstance();
  const modelRegistry = ModelRegistry.getInstance();

  // Core settings state
  const [settings, setSettings] = useState<RapportSettings>(settingsManager.getSettings());
  const [activeTab, setActiveTab] = useState<PreferencesTab>('provider');

  // Memory Statistics state
  const [memStats, setMemStats] = useState({ totalMemories: 0, totalContacts: 0, storageSizeBytes: 0 });

  const refreshMemStats = useCallback(() => {
    settingsManager.getMemoryStatisticsAsync().then(setMemStats).catch(() => {});
  }, [settingsManager]);

  // Memory Viewer state
  const memoryService = new MemoryService(BrowserStorageMemoryStore.getInstance());
  const [memRecords, setMemRecords] = useState<MemoryRecord[]>([]);
  const [memSearch, setMemSearch] = useState('');
  const [memCategoryFilter, setMemCategoryFilter] = useState<MemoryCategory | 'all'>('all');
  const [memSortBy, setMemSortBy] = useState<'recent' | 'importance'>('recent');
  const [memLoading, setMemLoading] = useState(false);
  const [editingMemory, setEditingMemory] = useState<MemoryRecord | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [newMemTitle, setNewMemTitle] = useState('');
  const [newMemContent, setNewMemContent] = useState('');
  const [newMemCategory, setNewMemCategory] = useState<MemoryCategory>('Personal');

  const loadMemories = useCallback(async () => {
    setMemLoading(true);
    try {
      const all = await memoryService.getAllMemories();
      setMemRecords(all);
      const totalBytes = JSON.stringify(all).length;
      const contactIds = new Set(all.map((m) => m.contactId));
      setMemStats({ totalMemories: all.length, totalContacts: contactIds.size, storageSizeBytes: totalBytes });
    } catch { /* noop */ } finally {
      setMemLoading(false);
    }
  }, []);

  // Writing Style state
  const [styleProfile, setStyleProfile] = useState<WritingStyleProfile | null>(null);

  const loadStyleProfile = useCallback(async () => {
    try {
      const prof = await WritingStyleEngine.getInstance().getProfile();
      setStyleProfile(prof);
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    if (activeTab === 'memory') {
      loadMemories();
    } else if (activeTab === 'style') {
      loadStyleProfile();
    }
  }, [activeTab, loadMemories, loadStyleProfile]);

  // API Keys state
  const [openaiKey, setOpenaiKey] = useState('');
  const [claudeKey, setClaudeKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [keyStatuses, setKeyStatuses] = useState<Record<string, 'connected' | 'invalid' | 'missing'>>({});
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { message: string; success: boolean }>>({});

  // Developer Mode unlock count
  const [versionClicks, setVersionClicks] = useState(0);

  // Dialog and toast UI states
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

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode !== 'overlay') return;

    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements && focusableElements.length > 0) {
      (focusableElements[0] as HTMLElement).focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onClose) {
          e.preventDefault();
          onClose();
        }
        return;
      }

      if (e.key === 'Tab') {
        if (!modalRef.current) return;
        const elements = Array.from(
          modalRef.current.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ) as HTMLElement[];

        if (elements.length === 0) return;

        const firstEl = elements[0];
        const lastEl = elements[elements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            lastEl.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastEl) {
            firstEl.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, onClose]);

  // ─── Theme & Adaptive Color Palette ─────────────────────────────────────────
  const [systemIsDark, setSystemIsDark] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      setSystemIsDark(media.matches);
      const listener = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, []);

  const isDark = settings.theme === 'dark' || (settings.theme === 'system' && systemIsDark);

  const C = {
    bg: 'var(--rapport-bg-solid)',
    bgCard: 'var(--rapport-bg)',
    bgHover: 'var(--rapport-bg-hover)',
    bgInput: 'var(--rapport-bg-input)',
    bgToast: 'var(--rapport-bg-solid)',
    border: 'var(--rapport-border)',
    borderFocus: 'var(--rapport-accent)',
    borderDanger: '#ef4444',
    accent: 'var(--rapport-accent)',
    accentHover: 'var(--rapport-accent-hover)',
    accentMuted: 'var(--rapport-accent-muted)',
    danger: '#ef4444',
    dangerMuted: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.06)',
    dangerHover: '#dc2626',
    warning: '#f59e0b',
    warningMuted: isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.06)',
    textPrimary: 'var(--rapport-text-primary)',
    textSecondary: 'var(--rapport-text-secondary)',
    textTertiary: 'var(--rapport-text-tertiary)',
    textDanger: isDark ? '#fca5a5' : '#b91c1c',
    success: '#10b981',
    successMuted: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.08)',
    radius: 'var(--rapport-radius)',
    radiusSm: 'var(--rapport-radius-sm)',
    radiusLg: 'var(--rapport-radius-lg)',
    shadow: 'var(--rapport-shadow)',
    transition: 'var(--rapport-transition-normal)',
    fontFamily: 'var(--rapport-font-family)',
    fontMono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  };

  // ─── Inline Styles ──────────────────────────────────────────────────────────
  const S = {
    label: {
      display: 'block',
      fontSize: '12px',
      fontWeight: 600,
      color: C.textPrimary,
      marginBottom: '6px',
      letterSpacing: '0.01em',
    } as React.CSSProperties,

    description: {
      fontSize: '11px',
      color: C.textSecondary,
      margin: '0 0 4px 0',
      lineHeight: 1.45,
    } as React.CSSProperties,

    select: {
      width: '100%',
      padding: '8px 12px',
      borderRadius: C.radiusSm,
      border: `1px solid ${C.border}`,
      background: C.bgInput,
      color: C.textPrimary,
      fontSize: '12.5px',
      fontFamily: C.fontFamily,
      outline: 'none',
      transition: `border-color ${C.transition}`,
      cursor: 'pointer',
      appearance: 'none' as const,
      WebkitAppearance: 'none' as const,
    } as React.CSSProperties,

    input: {
      width: '100%',
      padding: '8px 12px',
      borderRadius: C.radiusSm,
      border: `1px solid ${C.border}`,
      background: C.bgInput,
      color: C.textPrimary,
      fontSize: '12.5px',
      fontFamily: C.fontMono,
      outline: 'none',
      transition: `border-color ${C.transition}`,
      boxSizing: 'border-box' as const,
    } as React.CSSProperties,

    slider: {
      width: '100%',
      accentColor: C.accent,
      cursor: 'pointer',
    } as React.CSSProperties,

    section: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '20px',
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
      borderRadius: C.radiusSm,
      border: `1px solid ${C.border}`,
      background: C.bgCard,
      cursor: 'pointer',
      transition: `background ${C.transition}, border-color ${C.transition}`,
    } as React.CSSProperties,

    btnPrimary: {
      padding: '8px 16px',
      borderRadius: C.radiusSm,
      border: 'none',
      background: C.accent,
      color: '#ffffff',
      fontSize: '12px',
      fontWeight: 600,
      fontFamily: C.fontFamily,
      cursor: 'pointer',
      transition: `background ${C.transition}`,
      outline: 'none',
    } as React.CSSProperties,

    btnOutline: {
      padding: '8px 16px',
      borderRadius: C.radiusSm,
      border: `1px solid ${C.border}`,
      background: 'transparent',
      color: C.textPrimary,
      fontSize: '12px',
      fontWeight: 500,
      fontFamily: C.fontFamily,
      cursor: 'pointer',
      transition: `background ${C.transition}, border-color ${C.transition}`,
      outline: 'none',
    } as React.CSSProperties,

    btnDanger: {
      padding: '8px 16px',
      borderRadius: C.radiusSm,
      border: `1px solid ${C.borderDanger}`,
      background: C.dangerMuted,
      color: C.textDanger,
      fontSize: '12px',
      fontWeight: 600,
      fontFamily: C.fontFamily,
      cursor: 'pointer',
      transition: `background ${C.transition}`,
      outline: 'none',
    } as React.CSSProperties,

    divider: {
      height: '1px',
      background: C.border,
      border: 'none',
      margin: '6px 0',
    } as React.CSSProperties,

    badge: (color: string, bg: string): React.CSSProperties => ({
      fontSize: '9.5px',
      padding: '2px 8px',
      borderRadius: '20px',
      background: bg,
      color,
      fontWeight: 600,
      letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
    }),
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const addToast = useCallback((text: string, type: 'success' | 'error' | 'info') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev.slice(-2), { id, text, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ─── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = settingsManager.subscribe((newSettings) => {
      setSettings(newSettings);
    });
    settingsManager.onSaveToast((msg, type) => addToast(msg, type));
    loadKeys();
    return unsub;
  }, []);

  // Scroll tab content panel to top on active tab change
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [activeTab]);

  const loadKeys = async () => {
    const o = await keyManager.getKey('openai');
    const c = await keyManager.getKey('claude');
    const g = await keyManager.getKey('gemini');
    const gr = await keyManager.getKey('groq');

    setOpenaiKey(o || '');
    setClaudeKey(c || '');
    setGeminiKey(g || '');
    setGroqKey(gr || '');

    const statuses: Record<string, 'connected' | 'invalid' | 'missing'> = {};
    for (const pid of ['openai', 'claude', 'gemini', 'groq']) {
      const stat = await keyManager.getKeyStatus(pid);
      statuses[pid] = stat.hasKey ? (stat.isValidated ? 'connected' : 'invalid') : 'missing';
    }
    setKeyStatuses(statuses);
  };

  const handleSaveKey = async (providerId: string, val: string) => {
    const cleanKey = val.trim();
    const providerName = providerId === 'openai' ? 'OpenAI' : providerId === 'claude' ? 'Claude' : providerId === 'gemini' ? 'Gemini' : 'Groq';
    if (cleanKey) {
      await keyManager.setKey(providerId, cleanKey);
      addToast(`${providerName} key saved`, 'success');
    } else {
      await keyManager.deleteKey(providerId);
      addToast(`${providerName} key removed`, 'info');
    }
    await loadKeys();
  };

  const handleRemoveKey = async (providerId: string) => {
    await keyManager.deleteKey(providerId);
    if (providerId === 'openai') setOpenaiKey('');
    if (providerId === 'claude') setClaudeKey('');
    if (providerId === 'gemini') setGeminiKey('');
    if (providerId === 'groq') setGroqKey('');
    const providerName = providerId === 'openai' ? 'OpenAI' : providerId === 'claude' ? 'Claude' : providerId === 'gemini' ? 'Gemini' : 'Groq';
    addToast(`${providerName} key removed`, 'info');
    await loadKeys();
  };

  const handleTestKey = async (providerId: string) => {
    setTestingKey(providerId);
    setTestResult((prev) => ({ ...prev, [providerId]: { message: 'Connecting...', success: false } }));
    try {
      const isValid = await providerManager.healthCheck(providerId);
      setTestResult((prev) => ({
        ...prev,
        [providerId]: isValid
          ? { message: 'Connection successful', success: true }
          : { message: 'Connection failed', success: false },
      }));
      const providerName = providerId === 'openai' ? 'OpenAI' : providerId === 'claude' ? 'Claude' : providerId === 'gemini' ? 'Gemini' : 'Groq';
      if (isValid) {
        addToast(`${providerName} verified`, 'success');
      } else {
        addToast(`${providerName} failed`, 'error');
      }
    } catch {
      setTestResult((prev) => ({
        ...prev,
        [providerId]: { message: 'Network error', success: false },
      }));
      addToast('Network verification error', 'error');
    }
    setTestingKey(null);
    await loadKeys();
  };

  const handleUpdate = async (updates: Partial<RapportSettings>) => {
    const updated = await settingsManager.updateSettings(updates);
    setSettings(updated);
  };

  const handleVersionClick = () => {
    if (settings.developerModeUnlocked) {
      addToast('Developer Preferences already unlocked', 'info');
      return;
    }
    const nextClicks = versionClicks + 1;
    setVersionClicks(nextClicks);

    if (nextClicks >= 7) {
      handleUpdate({ developerModeUnlocked: true, debugLogs: true });
      addToast('Developer Preferences Unlocked! 🛠️', 'success');
      setActiveTab('developer');
      setVersionClicks(0);
    } else {
      const remaining = 7 - nextClicks;
      addToast(`Click ${remaining} more times to unlock Developer options`, 'info');
    }
  };

  // ─── Sidebar categories / Preferences IA ────────────────────────────────────
  const tabs: { id: PreferencesTab; label: string; icon: string; hidden?: boolean }[] = [
    { id: 'provider', label: 'AI Provider', icon: '⚡' },
    { id: 'mode', label: 'Conversation Mode', icon: '💬' },
    { id: 'personality', label: 'Personality', icon: '🎭' },
    { id: 'style', label: 'Writing Style', icon: '✍️' },
    { id: 'memory', label: 'Memory', icon: '🧠' },
    { id: 'privacy', label: 'Privacy', icon: '🛡️' },
    { id: 'appearance', label: 'Appearance', icon: '🎨' },
    { id: 'about', label: 'About', icon: 'ℹ️' },
    { id: 'advanced', label: 'Advanced', icon: '🔧' },
    {
      id: 'developer',
      label: 'Developer',
      icon: '🛠️',
      hidden: !settings.developerModeUnlocked,
    },
  ];

  // Layout sizing config based on display modes
  const [size, setSize] = useState(() => {
    const defaultHeight = typeof window !== 'undefined' ? Math.round(window.innerHeight * 0.85) : 760;
    return {
      width: mode === 'popup' ? 440 : (mode === 'sidepanel' ? 320 : (mode === 'workspace' ? 420 : 1100)),
      height: mode === 'popup' ? 560 : (mode === 'sidepanel' ? 650 : (mode === 'workspace' ? 350 : defaultHeight))
    };
  });

  // Prevent background scrolling when overlay modal is active
  useEffect(() => {
    if (mode === 'popup' || mode === 'sidepanel' || mode === 'workspace') return;
  }, [mode]);

  // ─── Key status badge helper ────────────────────────────────────────────────
  const keyStatusBadge = (providerId: string) => {
    const status = keyStatuses[providerId] || 'missing';
    if (status === 'connected') return <span style={S.badge(C.success, C.successMuted)}>Verified</span>;
    if (status === 'invalid') return <span style={S.badge(C.warning, C.warningMuted)}>Invalid</span>;
    return <span style={S.badge(C.textTertiary, C.bgHover)}>Missing Key</span>;
  };

  const providerReadyBadge = (providerId: string) => {
    if (providerId === 'fake-provider') return <span style={S.badge(C.success, C.successMuted)}>Offline Mode</span>;
    const status = keyStatuses[providerId] || 'missing';
    if (status === 'connected') return <span style={S.badge(C.success, C.successMuted)}>Active</span>;
    return <span style={S.badge(C.textTertiary, C.bgHover)}>Configure Key</span>;
  };

  const sizeRef = useRef(size);
  const isResizingRef = useRef(false);

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  useEffect(() => {
    const loadPersistedSize = async () => {
      if (mode === 'popup' || mode === 'sidepanel' || mode === 'workspace') return;
      try {
        let savedSize = null;
        const chromeObj = typeof window !== 'undefined' ? (window as any).chrome : null;
        if (chromeObj && chromeObj.storage && chromeObj.storage.local) {
          const res = typeof chromeObj.storage.local.get === 'function'
            ? await chromeObj.storage.local.get(['rapport_preferences_window_size'])
            : await new Promise<Record<string, any>>((resolve) => {
                chromeObj.storage.local.get(['rapport_preferences_window_size'], resolve);
              });
          savedSize = res?.rapport_preferences_window_size;
        } else if (typeof localStorage !== 'undefined') {
          const raw = localStorage.getItem('rapport_preferences_window_size');
          if (raw) savedSize = JSON.parse(raw);
        }
        if (savedSize && savedSize.width && savedSize.height) {
          const maxW = Math.round(window.innerWidth * 0.95);
          const maxH = Math.round(window.innerHeight * 0.95);
          setSize({
            width: Math.max(900, Math.min(maxW, savedSize.width)),
            height: Math.max(650, Math.min(maxH, savedSize.height))
          });
        }
      } catch (err) {
        console.warn('Failed to load settings window size:', err);
      }
    };
    loadPersistedSize();
  }, [mode]);

  const handleResizeStart = useCallback((e: React.MouseEvent, direction: 'r' | 'b' | 'br') => {
    e.preventDefault();
    e.stopPropagation();
    isResizingRef.current = true;
    const startWidth = sizeRef.current.width;
    const startHeight = sizeRef.current.height;
    const startX = e.clientX;
    const startY = e.clientY;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const minW = 900;
      const minH = 650;
      const maxW = Math.round(window.innerWidth * 0.95);
      const maxH = Math.round(window.innerHeight * 0.95);

      let newWidth = startWidth;
      let newHeight = startHeight;

      if (direction === 'r' || direction === 'br') {
        newWidth = Math.max(minW, Math.min(maxW, startWidth + deltaX));
      }
      if (direction === 'b' || direction === 'br') {
        newHeight = Math.max(minH, Math.min(maxH, startHeight + deltaY));
      }

      setSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      const finalSize = sizeRef.current;
      try {
        const chromeObj = typeof window !== 'undefined' ? (window as any).chrome : null;
        if (chromeObj && chromeObj.storage && chromeObj.storage.local) {
          chromeObj.storage.local.set({ rapport_preferences_window_size: finalSize });
        } else if (typeof localStorage !== 'undefined') {
          localStorage.setItem('rapport_preferences_window_size', JSON.stringify(finalSize));
        }
      } catch (err) {
        console.warn('Failed to save settings window size:', err);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleWindowResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  const isSmallScreen = windowWidth <= 960 && mode !== 'popup' && mode !== 'sidepanel';
  const isLaptop = windowWidth <= 1200 && windowWidth > 960 && mode !== 'popup' && mode !== 'sidepanel';

  const sidebarWidth = mode === 'popup'
    ? '60px'
    : mode === 'sidepanel'
    ? '60px'
    : isSmallScreen
    ? '60px'
    : isLaptop
    ? '240px'
    : '280px';

  const showLabels = mode !== 'popup' && mode !== 'sidepanel' && !isSmallScreen;

  const tabIds: PreferencesTab[] = tabs.filter((t) => !t.hidden).map((t) => t.id);

  const handleSidebarKeyDown = (e: React.KeyboardEvent) => {
    const currentIndex = tabIds.indexOf(activeTab);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % tabIds.length;
      setActiveTab(tabIds[nextIndex]);
      const buttons = modalRef.current
        ? Array.from(modalRef.current.querySelectorAll('[role="tab"]')) as HTMLElement[]
        : [];
      if (buttons && buttons[nextIndex]) {
        buttons[nextIndex].focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + tabIds.length) % tabIds.length;
      setActiveTab(tabIds[prevIndex]);
      const buttons = modalRef.current
        ? Array.from(modalRef.current.querySelectorAll('[role="tab"]')) as HTMLElement[]
        : [];
      if (buttons && buttons[prevIndex]) {
        buttons[prevIndex].focus();
      }
    }
  };

  return (
    <div
      ref={modalRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: mode === 'workspace' ? '100%' : `${size.width}px`,
        height: mode === 'workspace' ? '100%' : `${size.height}px`,
        maxWidth: mode === 'workspace' ? '100%' : (mode === 'popup' || mode === 'sidepanel' ? '100vw' : '90vw'),
        maxHeight: mode === 'workspace' ? '100%' : (mode === 'popup' || mode === 'sidepanel' ? '100vh' : '90vh'),
        background: mode === 'workspace' ? 'transparent' : 'rgba(15, 23, 42, 0.88)',
        color: C.textPrimary,
        borderRadius: mode === 'workspace' ? '0' : '18px',
        border: mode === 'workspace' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: mode === 'workspace' ? 'none' : '0 24px 64px rgba(0, 0, 0, 0.55)',
        backdropFilter: mode === 'workspace' ? 'none' : 'blur(20px)',
        fontFamily: C.fontFamily,
        overflow: 'hidden',
        position: 'relative',
        userSelect: 'none',
      }}
      role="dialog"
      aria-label="Rapport Preferences"
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      {mode !== 'workspace' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: `1px solid ${C.border}`,
            background: isDark ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.3)',
            flexShrink: 0,
          }}
        >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: `linear-gradient(135deg, ${C.accent}, #00b4d8)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '15px',
              color: '#ffffff',
              fontWeight: 700,
            }}
          >
            R
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, letterSpacing: '-0.01em' }}>
              Rapport Preferences
            </h3>
            <span style={{ fontSize: '10.5px', color: C.textTertiary }}>
              Customize your conversational assistant
            </span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close preferences"
            style={{
              background: 'transparent',
              border: `1px solid ${C.border}`,
              borderRadius: C.radiusSm,
              color: C.textSecondary,
              fontSize: '14px',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: `all ${C.transition}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = C.bgHover;
              e.currentTarget.style.color = C.textPrimary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = C.textSecondary;
            }}
          >
            ✕
          </button>
        )}
        </div>
      )}

      {/* ── Main Container: Sidebar + Content Panel ─────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Sidebar Nav */}
        <nav
          onKeyDown={handleSidebarKeyDown}
          style={{
            width: sidebarWidth,
            borderRight: `1px solid ${C.border}`,
            padding: '12px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            background: isDark ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.01)',
            flexShrink: 0,
            overflowY: 'auto',
          }}
          role="tablist"
        >
          {tabs
            .filter((t) => !t.hidden)
            .map((t) => {
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  role="tab"
                  aria-selected={isActive}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: showLabels ? 'flex-start' : 'center',
                    gap: showLabels ? '8px' : '0',
                    padding: showLabels ? '8px 12px' : '10px 0',
                    borderRadius: C.radiusSm,
                    border: 'none',
                    background: isActive ? C.accentMuted : 'transparent',
                    color: isActive ? C.accent : C.textSecondary,
                    fontSize: '12.5px',
                    fontWeight: isActive ? 600 : 500,
                    fontFamily: C.fontFamily,
                    textAlign: showLabels ? 'left' : 'center',
                    cursor: 'pointer',
                    transition: `all ${C.transition}`,
                    outline: 'none',
                  }}
                  title={!showLabels ? t.label : undefined}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = C.bgHover;
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = `inset 0 0 0 1.5px ${C.accent}33`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <span style={{ fontSize: '13.5px', width: showLabels ? '16px' : '20px', textAlign: 'center' }}>
                    {t.icon}
                  </span>
                  {showLabels && <span>{t.label}</span>}
                </button>
              );
            })}
        </nav>

        {/* Content Panel */}
        <div
          ref={contentRef}
          role="tabpanel"
          style={{
            flex: 1,
            padding: '20px 24px',
            overflowY: 'auto',
            overflowX: 'hidden',
            background: C.bgCard,
          }}
        >
          {/* ────────────────────────────────────────────────────────────────── */}
          {/* TAB: AI PROVIDER                                                   */}
          {/* ────────────────────────────────────────────────────────────────── */}
          {activeTab === 'provider' && (
            <div style={S.section}>
              <SectionHeading
                title="AI Provider"
                subtitle="Select the intelligence engine used to analyze chats and write responses."
              />

              <div style={S.fieldGroup}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    {
                      id: 'fake-provider' as LLMProviderId,
                      title: 'Offline Assistant',
                      desc: 'Runs entirely on your machine. Zero network requests or keys required.',
                    },
                    {
                      id: 'openai' as LLMProviderId,
                      title: 'OpenAI GPT Engine',
                      desc: 'Powered by GPT-4o. Best for natural logic and fast replies.',
                    },
                    {
                      id: 'claude' as LLMProviderId,
                      title: 'Anthropic Claude Engine',
                      desc: 'Powered by Claude 3.5. Excels at deep empathy and matching style.',
                    },
                    {
                      id: 'gemini' as LLMProviderId,
                      title: 'Google Gemini Engine',
                      desc: 'Powered by Gemini 2.5. Highly efficient for long chats.',
                    },
                    {
                      id: 'groq' as LLMProviderId,
                      title: 'Groq Cloud Engine',
                      desc: 'Powered by LLaMA 3.3. Blazing fast response generation.',
                    },
                  ].map((p) => {
                    const isSelected = settings.activeProviderId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() =>
                          handleUpdate({
                            activeProviderId: p.id,
                            localOnlyMode: p.id === 'fake-provider',
                          })
                        }
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          borderRadius: C.radius,
                          border: `1px solid ${isSelected ? C.accent : C.border}`,
                          background: isSelected ? C.accentMuted : 'transparent',
                          cursor: 'pointer',
                          transition: `all ${C.transition}`,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="radio"
                            name="activeProviderId"
                            checked={isSelected}
                            onChange={() =>
                              handleUpdate({
                                activeProviderId: p.id,
                                localOnlyMode: p.id === 'fake-provider',
                              })
                            }
                            style={{ accentColor: C.accent, cursor: 'pointer' }}
                          />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary }}>
                              {p.title}
                            </div>
                            <div style={{ fontSize: '11px', color: C.textSecondary, marginTop: '1px' }}>
                              {p.desc}
                            </div>
                          </div>
                        </div>
                        {providerReadyBadge(p.id)}
                      </div>
                    );
                  })}
                </div>
              </div>

              {settings.activeProviderId !== 'fake-provider' && (
                <>
                  <hr style={S.divider} />
                  <SectionHeading title="API Key Status" subtitle="Verification status and connection health." />

                  {/* Active Provider API Key Config */}
                  {([
                    { id: 'openai', name: 'OpenAI API Key', keyVal: openaiKey, setKeyVal: setOpenaiKey, ph: 'sk-proj-...' },
                    { id: 'claude', name: 'Claude API Key', keyVal: claudeKey, setKeyVal: setClaudeKey, ph: 'sk-ant-...' },
                    { id: 'gemini', name: 'Gemini API Key', keyVal: geminiKey, setKeyVal: setGeminiKey, ph: 'AIzaSy...' },
                    { id: 'groq', name: 'Groq API Key', keyVal: groqKey, setKeyVal: setGroqKey, ph: 'gsk_...' },
                  ])
                    .filter((k) => k.id === settings.activeProviderId)
                    .map((k) => (
                      <div
                        key={k.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          padding: '12px',
                          borderRadius: C.radius,
                          border: `1px solid ${C.border}`,
                          background: C.bgInput,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600 }}>{k.name}</span>
                          {keyStatusBadge(k.id)}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type={showKeys[k.id] ? 'text' : 'password'}
                            value={k.keyVal}
                            placeholder={k.ph}
                            onChange={(e) => k.setKeyVal(e.target.value)}
                            onBlur={() => handleSaveKey(k.id, k.keyVal)}
                            style={{ ...S.input, flex: 1 }}
                            aria-label={k.name}
                          />
                          <button
                            onClick={() => setShowKeys((p) => ({ ...p, [k.id]: !p[k.id] }))}
                            style={{ ...S.btnOutline, padding: '0 10px' }}
                            title={showKeys[k.id] ? 'Hide Key' : 'Show Key'}
                          >
                            {showKeys[k.id] ? '🙈' : '👁️'}
                          </button>
                          <button
                            onClick={() => handleTestKey(k.id)}
                            disabled={testingKey === k.id || !k.keyVal.trim()}
                            style={S.btnPrimary}
                          >
                            {testingKey === k.id ? 'Testing...' : 'Verify'}
                          </button>
                          {k.keyVal && (
                            <button
                              onClick={() => handleRemoveKey(k.id)}
                              style={{ ...S.btnDanger, padding: '0 10px' }}
                              title="Clear Key"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        {testResult[k.id] && (
                          <div
                            style={{
                              fontSize: '11px',
                              color: testResult[k.id].success ? C.success : C.danger,
                              fontWeight: 500,
                            }}
                          >
                            {testResult[k.id].success ? '✓' : '✕'} {testResult[k.id].message}
                          </div>
                        )}
                      </div>
                    ))}

                  <hr style={S.divider} />
                  <div style={S.fieldGroup}>
                    <label style={S.label}>Model Selection</label>
                    <p style={S.description}>Choose the specific logic model to load.</p>
                    <select
                      value={
                        settings.activeProviderId === 'openai'
                          ? settings.openaiModel
                          : settings.activeProviderId === 'claude'
                          ? settings.claudeModel
                          : settings.activeProviderId === 'gemini'
                          ? settings.geminiModel
                          : settings.groqModel
                      }
                      onChange={(e) => {
                        const key =
                          settings.activeProviderId === 'openai'
                            ? 'openaiModel'
                            : settings.activeProviderId === 'claude'
                            ? 'claudeModel'
                            : settings.activeProviderId === 'gemini'
                            ? 'geminiModel'
                            : 'groqModel';
                        handleUpdate({ [key]: e.target.value });
                      }}
                      style={S.select}
                    >
                      {modelRegistry.getModelsForProvider(settings.activeProviderId).map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} — {m.description}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* TAB: CONVERSATION MODE                                             */}
          {/* ────────────────────────────────────────────────────────────────── */}
          {activeTab === 'mode' && (
            <div style={S.section}>
              <SectionHeading
                title="Conversation Mode"
                subtitle="Select the primary conversational behavior preset."
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { id: 'natural', title: 'Natural', desc: 'Standard WhatsApp flow. Easygoing and casual.' },
                  { id: 'professional', title: 'Professional', desc: 'Polite, clear, and business-appropriate.' },
                  { id: 'warm', title: 'Warm', desc: 'Friendly, inviting, and emotionally close.' },
                  { id: 'playful', title: 'Playful', desc: 'Lighthearted, energetic, and witty.' },
                  { id: 'flirty', title: 'Flirty', desc: 'Charming, engaging, and personal.' },
                  { id: 'supportive', title: 'Supportive', desc: 'Empathetic, active listener, helpful.' },
                  { id: 'confident', title: 'Confident', desc: 'Assertive, clear, and direct.' },
                ].map((modeItem) => {
                  const isSelected = settings.conversationMode === modeItem.id;
                  return (
                    <label
                      key={modeItem.id}
                      onClick={() => handleUpdate({ conversationMode: modeItem.id as any })}
                      style={{
                        ...S.checkRow,
                        border: `1px solid ${isSelected ? C.accent : C.border}`,
                        background: isSelected ? C.accentMuted : 'transparent',
                        padding: '12px',
                      }}
                    >
                      <input
                        type="radio"
                        name="conversationMode"
                        checked={isSelected}
                        onChange={() => {}}
                        style={{ accentColor: C.accent, marginTop: '3px' }}
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary }}>
                          {modeItem.title}
                        </div>
                        <div style={{ fontSize: '11px', color: C.textSecondary, marginTop: '2px' }}>
                          {modeItem.desc}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* TAB: SUGGESTION PERSONALITY                                        */}
          {/* ────────────────────────────────────────────────────────────────── */}
          {activeTab === 'personality' && (
            <div style={S.section}>
              <SectionHeading
                title="Suggestion Personality"
                subtitle="Choose the behavior profile for response generations. Technical settings (like randomness and temperature) are managed automatically."
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  {
                    id: 'safe',
                    title: 'Safe',
                    desc: 'Highly grounded. Generates safe, highly reliable, and direct suggestions with minimal risk of awkward phrasing.',
                  },
                  {
                    id: 'balanced',
                    title: 'Balanced',
                    desc: 'The perfect blend of natural expression and structured guidance. Standard conversational flow.',
                  },
                  {
                    id: 'creative',
                    title: 'Creative',
                    desc: 'Expressive and highly imaginative. Generates varied, charismatic responses with witty wording.',
                  },
                ].map((personalityItem) => {
                  const isSelected = settings.suggestionPersonality === personalityItem.id;
                  return (
                    <label
                      key={personalityItem.id}
                      onClick={() => handleUpdate({ suggestionPersonality: personalityItem.id as any })}
                      style={{
                        ...S.checkRow,
                        border: `1px solid ${isSelected ? C.accent : C.border}`,
                        background: isSelected ? C.accentMuted : 'transparent',
                        padding: '14px',
                      }}
                    >
                      <input
                        type="radio"
                        name="suggestionPersonality"
                        checked={isSelected}
                        onChange={() => {}}
                        style={{ accentColor: C.accent, marginTop: '3px' }}
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary }}>
                          {personalityItem.title}
                        </div>
                        <div style={{ fontSize: '11.5px', color: C.textSecondary, marginTop: '3px', lineHeight: 1.45 }}>
                          {personalityItem.desc}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* TAB: WRITING STYLE                                                 */}
          {/* ────────────────────────────────────────────────────────────────── */}
          {activeTab === 'style' && (
            <div style={S.section}>
              <SectionHeading
                title="Writing Style"
                subtitle="Configure the text style directives sent to the AI model."
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  {
                    id: 'usual',
                    title: 'My Usual Style (Dynamic Learning)',
                    desc: 'Adapts to your dynamic messaging style. Infers format, length, and cues from memory, context, and prior chats.',
                  },
                  { id: 'casual', title: 'Casual & Relaxed', desc: 'Short contractions, abbreviations, everyday chat language.' },
                  { id: 'friendly', title: 'Friendly & Welcoming', desc: 'Polite, inviting, and highly positive phrasing.' },
                  { id: 'professional', title: 'Professional & Polished', desc: 'Clean grammar, polite distance, business-safe.' },
                  { id: 'short-direct', title: 'Short & Direct', desc: 'No fluff. Expresses ideas in as few words as possible.' },
                  { id: 'detailed', title: 'Detailed & Thorough', desc: 'Comprehensive sentences providing complete answers.' },
                  { id: 'humorous', title: 'Humorous', desc: 'Injects playful wit and lighthearted comments.' },
                  { id: 'respectful', title: 'Respectful', desc: 'High courtesy, mindful of boundaries.' },
                  { id: 'romantic', title: 'Romantic', desc: 'Deeply personal, warm, and intimate.' },
                  { id: 'motivational', title: 'Motivational', desc: 'Encouraging, inspiring, and positive reinforcement.' },
                ].map((styleItem) => {
                  const isSelected = settings.writingStyle === styleItem.id;
                  return (
                    <label
                      key={styleItem.id}
                      onClick={() => handleUpdate({ writingStyle: styleItem.id as any })}
                      style={{
                        ...S.checkRow,
                        border: `1px solid ${isSelected ? C.accent : C.border}`,
                        background: isSelected ? C.accentMuted : 'transparent',
                        padding: '12px',
                      }}
                    >
                      <input
                        type="radio"
                        name="writingStyle"
                        checked={isSelected}
                        onChange={() => {}}
                        style={{ accentColor: C.accent, marginTop: '3px' }}
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary }}>
                          {styleItem.title}
                        </div>
                        <div style={{ fontSize: '11px', color: C.textSecondary, marginTop: '2px' }}>
                          {styleItem.desc}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* LEARNED WRITING STYLE PROFILE CARD */}
              {(settings.writingStyle === 'usual' || !settings.writingStyle) && (
                <>
                  <hr style={S.divider} />
                  <SectionHeading
                    title="Learned Writing Style"
                    subtitle="Directly inferred by analyzing your actual outgoing messages."
                  />

                  {styleProfile && styleProfile.samplesAnalyzed > 0 ? (
                    <div style={{
                      background: C.bgCard,
                      border: `1px solid ${C.border}`,
                      borderRadius: C.radius,
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11.5px', color: C.textSecondary, fontWeight: 500 }}>
                          Analyzed Messages: <strong style={{ color: C.textPrimary }}>{styleProfile.samplesAnalyzed}</strong>
                        </span>
                        {styleProfile.samplesAnalyzed < 10 && (
                          <span style={S.badge(C.warning, C.warningMuted)}>Learning (Needs 10 msgs)</span>
                        )}
                        {styleProfile.samplesAnalyzed >= 10 && (
                          <span style={S.badge(C.success, C.successMuted)}>Active</span>
                        )}
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '10px',
                        fontSize: '12px',
                        lineHeight: 1.5,
                      }}>
                        <div>
                          <div style={{ color: C.textTertiary, fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700 }}>Avg Length</div>
                          <div style={{ color: C.textPrimary, fontWeight: 500 }}>{styleProfile.avgMessageLength} words</div>
                        </div>
                        <div>
                          <div style={{ color: C.textTertiary, fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700 }}>Emoji Frequency</div>
                          <div style={{ color: C.textPrimary, fontWeight: 500 }}>{(styleProfile.emojiFrequency / 100).toFixed(1)} per msg</div>
                        </div>
                        <div>
                          <div style={{ color: C.textTertiary, fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700 }}>Language Mix</div>
                          <div style={{ color: C.textPrimary, fontWeight: 500 }}>
                            {styleProfile.hinglishRatio >= 0.25 ? 'Hinglish Mix' : 'English Only'}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: C.textTertiary, fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700 }}>Slang Usage</div>
                          <div style={{ color: C.textPrimary, fontWeight: 500 }}>
                            {styleProfile.slangRatio >= 0.3 ? 'Frequent' : styleProfile.slangRatio >= 0.1 ? 'Occasional' : 'Rare'}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: C.textTertiary, fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700 }}>Capitalization</div>
                          <div style={{ color: C.textPrimary, fontWeight: 500 }}>
                            {styleProfile.capitalizationRatio <= 0.2 ? 'Lowercase' : 'Standard'}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: C.textTertiary, fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700 }}>Punctuation</div>
                          <div style={{ color: C.textPrimary, fontWeight: 500 }}>
                            {styleProfile.punctuationRatio <= 0.2 ? 'Rare' : 'Standard'}
                          </div>
                        </div>
                      </div>

                      {styleProfile.commonPhrases.length > 0 && (
                        <div>
                          <div style={{ color: C.textTertiary, fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Common Words & Phrases</div>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {styleProfile.commonPhrases.map((phrase, i) => (
                              <span key={i} style={{
                                fontSize: '11px',
                                background: C.bgInput,
                                border: `1px solid ${C.border}`,
                                borderRadius: C.radiusSm,
                                padding: '2px 6px',
                                color: C.textSecondary,
                              }}>{phrase}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => setConfirmDialog({
                          title: 'Reset Learned Style',
                          message: 'Are you sure you want to permanently erase the writing style profile learned from your outgoing messages? This cannot be undone.',
                          confirmLabel: 'Reset Style',
                          onConfirm: async () => {
                            await WritingStyleEngine.getInstance().reset();
                            setStyleProfile(null);
                            addToast('Learned writing style reset successfully', 'success');
                            setConfirmDialog(null);
                          },
                        })}
                        style={{ ...S.btnDanger, marginTop: '4px' }}
                      >
                        Reset Learned Style
                      </button>
                    </div>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      padding: '24px 16px',
                      border: `1px dashed ${C.border}`,
                      borderRadius: C.radius,
                      color: C.textTertiary,
                      fontSize: '12px',
                    }}>
                      No writing style learned yet. Send outgoing messages in chat and Rapport will automatically discover your natural writing style!
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* TAB: MEMORY                                                        */}
          {/* ────────────────────────────────────────────────────────────────── */}
          {activeTab === 'memory' && (() => {
            // ── Derived filtered / sorted list ──────────────────────────────
            const CATEGORY_ICONS: Record<string, string> = {
              'Personal': '👤', 'Preferences': '❤️', 'Relationships': '🤝',
              'Plans': '📅', 'Important dates': '🎂', 'Interests': '⭐',
            };
            const IMPORTANCE_COLOR: Record<string, string> = {
              'CRITICAL': '#ef4444', 'HIGH': '#f59e0b', 'NORMAL': C.accent, 'LOW': C.textTertiary,
            };

            const filtered = memRecords
              .filter((m) => {
                if (memCategoryFilter !== 'all' && m.category !== memCategoryFilter) return false;
                if (memSearch) {
                  const q = memSearch.toLowerCase();
                  return m.title.toLowerCase().includes(q) || m.content.toLowerCase().includes(q) || m.contactId.toLowerCase().includes(q);
                }
                return true;
              })
              .sort((a, b) => {
                if (a.pinned && !b.pinned) return -1;
                if (!a.pinned && b.pinned) return 1;
                if (memSortBy === 'importance') return b.importanceScore - a.importanceScore;
                return b.updatedAt - a.updatedAt;
              });

            // ── Group by date ───────────────────────────────────────────────
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
            const lastWeek = new Date(today); lastWeek.setDate(today.getDate() - 7);

            type DateGroup = { label: string; items: MemoryRecord[] };
            const groups: DateGroup[] = [];
            const addToGroup = (label: string, item: MemoryRecord) => {
              let g = groups.find((g) => g.label === label);
              if (!g) { g = { label, items: [] }; groups.push(g); }
              g.items.push(item);
            };
            filtered.forEach((m) => {
              const d = new Date(m.updatedAt); d.setHours(0, 0, 0, 0);
              if (d.getTime() === today.getTime()) addToGroup('Today', m);
              else if (d.getTime() === yesterday.getTime()) addToGroup('Yesterday', m);
              else if (d >= lastWeek) addToGroup('This week', m);
              else addToGroup('Older', m);
            });

            const MemCard = ({ m }: { m: MemoryRecord }) => (
              <div key={m.id} style={{
                background: m.pinned ? (isDark ? 'rgba(0,168,132,0.07)' : 'rgba(0,168,132,0.04)') : C.bgCard,
                border: `1px solid ${m.pinned ? 'rgba(0,168,132,0.25)' : C.border}`,
                borderRadius: C.radiusSm,
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {m.pinned && <span style={{ fontSize: '12px', lineHeight: 1 }}>📌</span>}
                  <span style={{
                    fontSize: '9.5px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px',
                    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                    color: C.textSecondary,
                  }}>
                    {CATEGORY_ICONS[m.category] || '💡'} {m.category}
                  </span>
                  <span style={{
                    fontSize: '9.5px', fontWeight: 600, padding: '2px 7px', borderRadius: '20px',
                    background: `${IMPORTANCE_COLOR[m.importance]}18`,
                    color: IMPORTANCE_COLOR[m.importance],
                  }}>
                    {m.importance}
                  </span>
                  <span style={{ fontSize: '10px', color: C.textTertiary, marginLeft: 'auto' }}>
                    {m.contactId}
                  </span>
                </div>
                {/* Title */}
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: C.textPrimary }}>{m.title}</div>
                {/* Content */}
                <div style={{ fontSize: '11.5px', color: C.textSecondary, lineHeight: 1.45 }}>{m.content}</div>
                {/* Action row */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                  <button
                    onClick={async () => {
                      m.pinned ? await memoryService.unpinMemory(m.id) : await memoryService.pinMemory(m.id);
                      await loadMemories();
                    }}
                    style={{ ...S.btnOutline, padding: '3px 10px', fontSize: '11px' }}
                  >{m.pinned ? 'Unpin' : 'Pin'}</button>
                  <button
                    onClick={() => { setEditingMemory(m); setEditTitle(m.title); setEditContent(m.content); }}
                    style={{ ...S.btnOutline, padding: '3px 10px', fontSize: '11px' }}
                  >Edit</button>
                  <button
                    onClick={() => setConfirmDialog({
                      title: 'Delete Memory',
                      message: `Delete "${m.title}"? This cannot be undone.`,
                      confirmLabel: 'Delete',
                      onConfirm: async () => {
                        await memoryService.deleteMemory(m.id);
                        await loadMemories();
                        addToast('Memory deleted', 'success');
                        setConfirmDialog(null);
                      },
                    })}
                    style={{ ...S.btnDanger, padding: '3px 10px', fontSize: '11px', marginLeft: 'auto' }}
                  >Delete</button>
                </div>
              </div>
            );

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Edit Memory Modal */}
                {editingMemory && (
                  <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{
                      background: C.bgCard, borderRadius: C.radius, padding: '20px', width: '340px',
                      border: `1px solid ${C.border}`, boxShadow: C.shadow,
                      display: 'flex', flexDirection: 'column', gap: '12px',
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: C.textPrimary }}>Edit Memory</div>
                      <div style={S.fieldGroup}>
                        <span style={S.label}>Title</span>
                        <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                          style={{ ...S.input, fontFamily: C.fontFamily }} />
                      </div>
                      <div style={S.fieldGroup}>
                        <span style={S.label}>Content</span>
                        <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)}
                          rows={4} style={{ ...S.input, fontFamily: C.fontFamily, resize: 'vertical' as const }} />
                      </div>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => setEditingMemory(null)} style={S.btnOutline}>Cancel</button>
                        <button
                          onClick={async () => {
                            if (!editingMemory) return;
                            await memoryService.updateMemory(editingMemory.id, { title: editTitle.trim(), content: editContent.trim() });
                            await loadMemories();
                            addToast('Memory updated', 'success');
                            setEditingMemory(null);
                          }}
                          style={S.btnPrimary}
                        >Save</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Add Memory Modal */}
                {showAddMemory && (
                  <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{
                      background: C.bgCard, borderRadius: C.radius, padding: '20px', width: '340px',
                      border: `1px solid ${C.border}`, boxShadow: C.shadow,
                      display: 'flex', flexDirection: 'column', gap: '12px',
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: C.textPrimary }}>Add Memory</div>
                      <div style={S.fieldGroup}>
                        <span style={S.label}>Title</span>
                        <input placeholder="e.g. Priya loves sushi" value={newMemTitle}
                          onChange={(e) => setNewMemTitle(e.target.value)}
                          style={{ ...S.input, fontFamily: C.fontFamily }} />
                      </div>
                      <div style={S.fieldGroup}>
                        <span style={S.label}>Content</span>
                        <textarea placeholder="Describe the memory in detail..." value={newMemContent}
                          onChange={(e) => setNewMemContent(e.target.value)}
                          rows={3} style={{ ...S.input, fontFamily: C.fontFamily, resize: 'vertical' as const }} />
                      </div>
                      <div style={S.fieldGroup}>
                        <span style={S.label}>Category</span>
                        <select value={newMemCategory} onChange={(e) => setNewMemCategory(e.target.value as MemoryCategory)}
                          style={S.select}>
                          {(['Personal','Preferences','Relationships','Plans','Important dates','Interests'] as MemoryCategory[]).map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => { setShowAddMemory(false); setNewMemTitle(''); setNewMemContent(''); }} style={S.btnOutline}>Cancel</button>
                        <button
                          onClick={async () => {
                            if (!newMemTitle.trim() || !newMemContent.trim()) {
                              addToast('Title and content are required', 'error'); return;
                            }
                            await memoryService.createMemory({
                              contactId: 'user_explicit',
                              type: 'CUSTOM',
                              category: newMemCategory,
                              title: newMemTitle.trim(),
                              content: newMemContent.trim(),
                              source: 'user_explicit',
                              importance: 'NORMAL',
                              importanceScore: 45,
                            });
                            await loadMemories();
                            addToast('Memory added', 'success');
                            setShowAddMemory(false);
                            setNewMemTitle('');
                            setNewMemContent('');
                          }}
                          style={S.btnPrimary}
                        >Add Memory</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: C.textPrimary }}>🧠 Memory</div>
                    <div style={{ fontSize: '11px', color: C.textSecondary, marginTop: '2px' }}>
                      Long-term memory recalled to personalise replies.
                    </div>
                  </div>
                  <button onClick={() => setShowAddMemory(true)} style={S.btnPrimary}>
                    + Add
                  </button>
                </div>

                {/* Stats bar */}
                <div style={{
                  background: C.bgInput, border: `1px solid ${C.border}`,
                  borderRadius: C.radiusSm, padding: '10px 14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-around',
                }}>
                  {[
                    { label: 'Memories', value: memStats.totalMemories, color: C.accent },
                    { label: 'Contacts', value: memStats.totalContacts, color: C.textPrimary },
                    { label: 'Size', value: `${(memStats.storageSizeBytes / 1024).toFixed(1)} KB`, color: C.textPrimary },
                  ].map((stat, i, arr) => (
                    <React.Fragment key={stat.label}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '10.5px', color: C.textSecondary, fontWeight: 500 }}>{stat.label}</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                      </div>
                      {i < arr.length - 1 && <div style={{ width: '1px', height: '20px', background: C.border }} />}
                    </React.Fragment>
                  ))}
                </div>

                {/* Search + Filters */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    placeholder="🔍  Search memories..."
                    value={memSearch}
                    onChange={(e) => setMemSearch(e.target.value)}
                    style={{ ...S.input, fontFamily: C.fontFamily, fontSize: '12px' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select value={memCategoryFilter} onChange={(e) => setMemCategoryFilter(e.target.value as MemoryCategory | 'all')}
                      style={{ ...S.select, fontSize: '11.5px' }}>
                      <option value="all">All Categories</option>
                      {(['Personal','Preferences','Relationships','Plans','Important dates','Interests'] as MemoryCategory[]).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <select value={memSortBy} onChange={(e) => setMemSortBy(e.target.value as 'recent' | 'importance')}
                      style={{ ...S.select, fontSize: '11.5px' }}>
                      <option value="recent">Sort: Recent</option>
                      <option value="importance">Sort: Importance</option>
                    </select>
                  </div>
                </div>

                {/* Timeline */}
                {memLoading ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: C.textTertiary, fontSize: '12px' }}>Loading memories...</div>
                ) : filtered.length === 0 ? (
                  <div style={{
                    textAlign: 'center', padding: '30px 16px',
                    border: `1px dashed ${C.border}`, borderRadius: C.radiusSm,
                    color: C.textTertiary, fontSize: '12px',
                  }}>
                    {memSearch || memCategoryFilter !== 'all' ? 'No memories match your filter.' : 'No memories yet. They will be extracted automatically during conversations.'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {groups.map((group) => (
                      <div key={group.label}>
                        <div style={{
                          fontSize: '10px', fontWeight: 700, color: C.textTertiary,
                          textTransform: 'uppercase', letterSpacing: '0.08em',
                          marginBottom: '6px', padding: '0 2px',
                        }}>{group.label}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {group.items.map((m) => <MemCard key={m.id} m={m} />)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Memory Settings Toggles */}
                <hr style={S.divider} />
                <SectionHeading title="Memory Settings" subtitle="Control what types of information are remembered." />

                <ToggleRow
                  label="Remember Preferences"
                  description="Stores choices, likes, and dislikes mentioned in chat."
                  checked={settings.rememberPreferences}
                  onChange={(v) => handleUpdate({ rememberPreferences: v })}
                />
                <ToggleRow
                  label="Remember Plans"
                  description="Retains upcoming scheduled tasks, invitations, and appointments."
                  checked={settings.rememberPlans}
                  onChange={(v) => handleUpdate({ rememberPlans: v })}
                />
                <ToggleRow
                  label="Remember Important Dates"
                  description="Stores birthdays, milestones, and deadlines."
                  checked={settings.rememberDates}
                  onChange={(v) => handleUpdate({ rememberDates: v })}
                />
                <ToggleRow
                  label="Remember Interests"
                  description="Identifies hobbies, activities, and recurring topics."
                  checked={settings.rememberInterests}
                  onChange={(v) => handleUpdate({ rememberInterests: v })}
                />

                {/* Memory Actions */}
                <hr style={S.divider} />
                <SectionHeading title="Memory Actions" subtitle="Remove local stored data for privacy control." />

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setConfirmDialog({
                      title: 'Forget This Contact',
                      message: 'Permanently erase all memories for the current active contact? This cannot be undone.',
                      confirmLabel: 'Forget Contact',
                      onConfirm: async () => {
                        // In overlay context the contactId is 'active-chat'; in settings use a placeholder
                        await memoryService.forgetContact('active-chat');
                        await loadMemories();
                        addToast('Contact memories forgotten', 'success');
                        setConfirmDialog(null);
                      },
                    })}
                    style={S.btnOutline}
                  >
                    Forget This Contact
                  </button>
                  <button
                    onClick={() => setConfirmDialog({
                      title: 'Clear All Memories',
                      message: 'This will erase the complete memory database for ALL contacts. This cannot be undone.',
                      confirmLabel: 'Clear Database',
                      onConfirm: async () => {
                        await BrowserStorageMemoryStore.getInstance().clear();
                        await loadMemories();
                        addToast('All memory records cleared', 'success');
                        setConfirmDialog(null);
                      },
                    })}
                    style={S.btnDanger}
                  >
                    Clear All Memories
                  </button>
                </div>
              </div>
            );
          })()}

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* TAB: PRIVACY                                                       */}
          {/* ────────────────────────────────────────────────────────────────── */}
          {activeTab === 'privacy' && (
            <div style={S.section}>
              <SectionHeading
                title="Privacy Control"
                subtitle="Manage on-device protection, telemetry, and local data footprint."
              />

              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: C.radius,
                  background: C.accentMuted,
                  border: `1px solid ${C.accent}33`,
                  fontSize: '11.5px',
                  color: C.textSecondary,
                  lineHeight: 1.55,
                }}
              >
                <strong style={{ color: C.textPrimary }}>Security Stance:</strong>
                <br />
                Your credentials, memories, and parameters reside exclusively in browser storage.
                Conversations are never uploaded to Rapport AI servers — they go directly to the
                selected provider (OpenAI, Anthropic, or Google) solely for generating replies.
              </div>

              <ToggleRow
                label="Local-Only Processing"
                description="Locks down the extension to Offline Mode. Completely blocks external internet calls."
                checked={settings.localOnlyMode}
                onChange={(v) => handleUpdate({ localOnlyMode: v, activeProviderId: v ? 'fake-provider' : settings.activeProviderId })}
              />

              <ToggleRow
                label="Mask Contact Names"
                description="Automatically strip real names from the conversation transcript before invoking AI models."
                checked={settings.maskContactNames}
                onChange={(v) => handleUpdate({ maskContactNames: v })}
              />

              <ToggleRow
                label="Disable AI Suggestions for this Chat"
                description="Turn off the suggestion floating bar for the active WhatsApp chat."
                checked={settings.disabledChatIds?.includes('active-chat') || false}
                onChange={(v) => {
                  const chatList = settings.disabledChatIds || [];
                  const updated = v
                    ? [...chatList, 'active-chat']
                    : chatList.filter((id) => id !== 'active-chat');
                  handleUpdate({ disabledChatIds: updated });
                  addToast(v ? 'AI disabled for current chat' : 'AI re-enabled for current chat', 'info');
                }}
              />

              <ToggleRow
                label="Disable Memory for this Chat"
                description="Prevent memory extraction and context recall in the active conversation."
                checked={settings.memoryDisabledChatIds?.includes('active-chat') || false}
                onChange={(v) => {
                  const chatList = settings.memoryDisabledChatIds || [];
                  const updated = v
                    ? [...chatList, 'active-chat']
                    : chatList.filter((id) => id !== 'active-chat');
                  handleUpdate({ memoryDisabledChatIds: updated });
                  addToast(v ? 'Memory blocked for current chat' : 'Memory unblocked', 'info');
                }}
              />

              <hr style={S.divider} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={() => {
                    const json = settingsManager.exportSettings();
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `rapport-preferences-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    addToast('Configuration settings exported', 'success');
                  }}
                  style={S.btnOutline}
                >
                  📦 Export My Data
                </button>

                <button
                  onClick={() =>
                    setConfirmDialog({
                      title: 'Delete My Data',
                      message:
                        'Are you sure you want to permanently clear your stored settings, key tokens, and history? This cannot be undone.',
                      confirmLabel: 'Erase Stored Data',
                      onConfirm: async () => {
                        await settingsManager.clearAllData();
                        await loadKeys();
                        addToast('Local data deleted', 'success');
                        setConfirmDialog(null);
                      },
                    })
                  }
                  style={S.btnDanger}
                >
                  🗑️ Delete My Data
                </button>

                <button
                  onClick={() =>
                    setConfirmDialog({
                      title: 'Reset Rapport AI',
                      message:
                        'This will restore factory settings, delete all keys, wipe memories, and reset the extension. Proceed?',
                      confirmLabel: 'Reset Extension',
                      onConfirm: async () => {
                        await settingsManager.clearAllData();
                        await settingsManager.resetToDefaults();
                        await loadKeys();
                        addToast('Extension restored to defaults', 'success');
                        setConfirmDialog(null);
                      },
                    })
                  }
                  style={{ ...S.btnDanger, borderColor: C.danger }}
                >
                  ⚠️ Reset Rapport AI
                </button>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* TAB: APPEARANCE                                                    */}
          {/* ────────────────────────────────────────────────────────────────── */}
          {activeTab === 'appearance' && (
            <div style={S.section}>
              <SectionHeading
                title="Appearance"
                subtitle="Customize the overlay theme, dimensions, and styling."
              />

              <div style={S.fieldGroup}>
                <label style={S.label}>Theme Preference</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(
                    [
                      { id: 'light', label: '☀️ Light', desc: 'Notion light theme' },
                      { id: 'dark', label: '🌙 Dark', desc: 'Linear dark theme' },
                      { id: 'system', label: '💻 System', desc: 'Match system preference' },
                    ] as const
                  ).map((t) => {
                    const isSelected = settings.theme === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleUpdate({ theme: t.id as ThemePreference })}
                        style={{
                          flex: 1,
                          padding: '14px 10px',
                          borderRadius: C.radius,
                          border: `1px solid ${isSelected ? C.accent : C.border}`,
                          background: isSelected ? C.accentMuted : 'transparent',
                          color: C.textPrimary,
                          cursor: 'pointer',
                          transition: `all ${C.transition}`,
                          textAlign: 'center',
                          outline: 'none',
                          fontFamily: C.fontFamily,
                        }}
                      >
                        <div style={{ fontSize: '20px' }}>{t.label.split(' ')[0]}</div>
                        <div style={{ fontSize: '12px', fontWeight: 600, marginTop: '4px' }}>
                          {t.label.split(' ').slice(1).join(' ')}
                        </div>
                        <div style={{ fontSize: '10px', color: C.textSecondary, marginTop: '2px' }}>
                          {t.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <ToggleRow
                label="Compact Overlay Layout"
                description="Reduces padding and typography sizes inside the chat interface to save space."
                checked={settings.compactMode}
                onChange={(v) => handleUpdate({ compactMode: v })}
              />

              <ToggleRow
                label="Interface Animations"
                description="Enables smooth UI animations, list transitions, and loading states."
                checked={settings.animationsEnabled}
                onChange={(v) => handleUpdate({ animationsEnabled: v })}
              />

              <div style={S.fieldGroup}>
                <label style={S.label}>Accent Color</label>
                <p style={S.description}>Select the primary brand highlight color.</p>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {['#00a884', '#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b'].map((color) => (
                    <button
                      key={color}
                      disabled
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: color,
                        border: color === '#00a884' ? '2px solid #ffffffaa' : 'none',
                        opacity: 0.65,
                        cursor: 'not-allowed',
                      }}
                      title="Custom accent colors coming soon"
                    />
                  ))}
                  <span style={{ fontSize: '10.5px', color: C.textTertiary, marginLeft: '6px' }}>
                    Custom accents coming soon
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* TAB: ABOUT                                                         */}
          {/* ────────────────────────────────────────────────────────────────── */}
          {activeTab === 'about' && (
            <div style={S.section}>
              <SectionHeading
                title="About Rapport AI"
                subtitle="Version details, licensing, and options."
              />

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '24px',
                  borderRadius: C.radius,
                  border: `1px solid ${C.border}`,
                  background: C.bgHover,
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                    background: `linear-gradient(135deg, ${C.accent}, #0ea5e9)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    color: '#ffffff',
                    fontWeight: 800,
                    marginBottom: '12px',
                    boxShadow: '0 4px 14px rgba(0, 168, 132, 0.3)',
                  }}
                >
                  R
                </div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: C.textPrimary }}>
                  Rapport AI
                </h4>
                <p style={{ margin: '0 0 16px 0', fontSize: '11.5px', color: C.textSecondary }}>
                  Intelligent Conversation Copilot for WhatsApp Web
                </p>

                <div
                  onClick={handleVersionClick}
                  style={{
                    fontSize: '11px',
                    color: C.textTertiary,
                    background: C.bgCard,
                    padding: '4px 10px',
                    borderRadius: '20px',
                    border: `1px solid ${C.border}`,
                    cursor: 'pointer',
                    userSelect: 'none',
                    fontWeight: 600,
                  }}
                >
                  Version 1.1.0
                </div>
              </div>

              <div style={{ fontSize: '11px', color: C.textTertiary, lineHeight: 1.5, padding: '0 4px' }}>
                Rapport AI is distributed under a proprietary commercial license. Created with care for productivity.
                <br />
                Need help? Visit our docs or submit a diagnostic report in Developer preferences.
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* TAB: ADVANCED (Progressive Disclosure)                             */}
          {/* ────────────────────────────────────────────────────────────────── */}
          {activeTab === 'advanced' && (
            <div style={S.section}>
              <SectionHeading
                title="Advanced Controls"
                subtitle="Exposes deep configuration fields for request formatting, budgets, and timeouts."
              />

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
                <span style={{ transform: advancedExpanded ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}>
                  ▼
                </span>
              </button>

              <div
                style={{
                  display: advancedExpanded ? 'flex' : 'none',
                  flexDirection: 'column',
                  gap: '16px',
                  marginTop: '10px',
                  padding: '16px',
                  borderRadius: C.radius,
                  border: `1px dashed ${C.border}`,
                  background: isDark ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.02)',
                }}
              >
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: C.radiusSm,
                    background: C.warningMuted,
                    border: `1px solid ${C.warning}33`,
                    fontSize: '11.5px',
                    color: C.warning,
                    fontWeight: 500,
                  }}
                >
                  ⚠️ These settings are intended for advanced users. Modifying these values may degrade suggestion quality or exceed rate limits.
                </div>

                <SliderField
                  label="Temperature (Randomness Override)"
                  value={settings.temperature}
                  min={0}
                  max={1}
                  step={0.05}
                  descriptor={(v) => (v < 0.35 ? 'Precise' : v < 0.65 ? 'Balanced' : v < 0.85 ? 'Creative' : 'Experimental')}
                  onChange={(v) => handleUpdate({ temperature: v })}
                />

                <SliderField
                  label="Maximum Tokens"
                  value={settings.maxTokens}
                  min={50}
                  max={4000}
                  step={50}
                  suffix=" tokens"
                  onChange={(v) => handleUpdate({ maxTokens: Math.floor(v) })}
                />

                <ToggleRow
                  label="Streaming Responses"
                  description="Receive incremental token chunks in real-time."
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
                  onChange={(v) => handleUpdate({ requestTimeoutMs: Math.floor(v) })}
                />

                <SliderField
                  label="Retry Count"
                  value={settings.maxRetries}
                  min={0}
                  max={5}
                  onChange={(v) => handleUpdate({ maxRetries: Math.floor(v) })}
                />

                <ToggleRow
                  label="Provider Fallback"
                  description="Use backup provider if active provider experiences a failure."
                  checked={settings.enableProviderFallback}
                  onChange={(v) => handleUpdate({ enableProviderFallback: v })}
                />

                <ToggleRow
                  label="Reply Quality Engine"
                  description="Scores suggestions on naturalness, relevance, grammar, and repetition before showing."
                  checked={settings.enableReplyQualityEngine}
                  onChange={(v) => handleUpdate({ enableReplyQualityEngine: v })}
                />

                <SliderField
                  label="Memory Context Budget"
                  value={settings.maxMemoriesInBudget}
                  min={1}
                  max={20}
                  suffix=" items"
                  onChange={(v) => handleUpdate({ maxMemoriesInBudget: Math.floor(v) })}
                />

                <SliderField
                  label="Prompt Budget"
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
                  onChange={(v) => handleUpdate({ cacheDurationMs: Math.floor(v) * 1000 })}
                />
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* TAB: DEVELOPER (Hidden by default, click Version 7 times)           */}
          {/* ────────────────────────────────────────────────────────────────── */}
          {activeTab === 'developer' && settings.developerModeUnlocked && (
            <div style={S.section}>
              <SectionHeading
                title="Developer Preferences"
                subtitle="Exposes diagnostic logging, timing data, and prompt inspections."
              />

              <ToggleRow
                label="AI Pipeline Inspector"
                description="Enable visual inspect panels in the suggestion overlay."
                checked={settings.inspectorMode}
                onChange={(v) => handleUpdate({ inspectorMode: v })}
              />

              <ToggleRow
                label="Conversation Analysis"
                description="Trace parsed dialog cues and contextual metrics."
                checked={settings.debugLogs}
                onChange={(v) => handleUpdate({ debugLogs: v })}
              />

              <ToggleRow
                label="Relationship Analysis"
                description="Trace closeness, tone alignment, and style ratios."
                checked={settings.showRequestTiming} // reusing timing toggles for UI
                onChange={(v) => handleUpdate({ showRequestTiming: v })}
              />

              <ToggleRow
                label="Memory Retrieval Trace"
                description="Log vectors and semantic scores of recalled context."
                checked={settings.showRetrievedMemories}
                onChange={(v) => handleUpdate({ showRetrievedMemories: v })}
              />

              <ToggleRow
                label="Show Final Prompt Spec"
                description="Inspect the final compiled XML/markdown prompt structure."
                checked={settings.showFinalPrompt}
                onChange={(v) => handleUpdate({ showFinalPrompt: v })}
              />

              <ToggleRow
                label="Provider Payload Logs"
                description="Log JSON raw API request/response payloads in console."
                checked={settings.showProviderLogs}
                onChange={(v) => handleUpdate({ showProviderLogs: v })}
              />

              <ToggleRow
                label="Latency Profiling"
                description="Trace detailed millisecond breakdown for execution stages."
                checked={settings.showRequestTiming}
                onChange={(v) => handleUpdate({ showRequestTiming: v })}
              />

              <ToggleRow
                label="Token Usage Profiling"
                description="Log token usage statistics and cost estimations."
                checked={settings.showTokenUsage}
                onChange={(v) => handleUpdate({ showTokenUsage: v })}
              />

              <hr style={S.divider} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={() => {
                    const report = settingsManager.exportDebugReport();
                    const blob = new Blob([report], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `rapport-diagnostic-report-${Date.now()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    addToast('Diagnostic report exported', 'success');
                  }}
                  style={S.btnOutline}
                >
                  📋 Export Diagnostic Report
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Toast Notifications ─────────────────────────────────────────────── */}
      {toasts.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            zIndex: 1000,
            maxWidth: '280px',
          }}
        >
          {toasts.map((t) => (
            <Toast key={t.id} message={t} onDismiss={() => removeToast(t.id)} />
          ))}
        </div>
      )}

      {/* ── Confirm Action Dialog ───────────────────────────────────────────── */}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* Resizing Grab Handles */}
      {mode !== 'popup' && mode !== 'sidepanel' && mode !== 'workspace' && (
        <>
          {/* Right edge */}
          <div
            onMouseDown={(e) => handleResizeStart(e, 'r')}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '6px',
              height: '100%',
              cursor: 'ew-resize',
              zIndex: 10000,
            }}
          />
          {/* Bottom edge */}
          <div
            onMouseDown={(e) => handleResizeStart(e, 'b')}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              height: '6px',
              cursor: 'ns-resize',
              zIndex: 10000,
            }}
          />
          {/* Bottom-right corner */}
          <div
            onMouseDown={(e) => handleResizeStart(e, 'br')}
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: '16px',
              height: '16px',
              cursor: 'se-resize',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'flex-end',
              padding: '3px',
              zIndex: 10001,
            }}
          >
            <svg
              width="8"
              height="8"
              viewBox="0 0 8 8"
              style={{
                fill: 'var(--rapport-text-tertiary)',
                opacity: 0.6,
                pointerEvents: 'none',
              }}
            >
              <path d="M6 0 L8 0 L8 8 L0 8 L0 6 L4 6 L4 2 L6 2 Z" fill="var(--rapport-text-tertiary)" opacity="0.3" />
              <path d="M7 3 L8 3 L8 8 L3 8 L3 7 L5 7 L5 5 L7 5 Z" fill="var(--rapport-text-tertiary)" opacity="0.6" />
            </svg>
          </div>
        </>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-Components Helper Definitions
// ─────────────────────────────────────────────────────────────────────────────

const SectionHeading: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div style={{ marginBottom: '4px' }}>
    <h4
      style={{
        margin: 0,
        fontSize: '13.5px',
        fontWeight: 700,
        letterSpacing: '-0.01em',
      }}
    >
      {title}
    </h4>
    {subtitle && (
      <p style={{ fontSize: '11px', margin: '3px 0 0 0', lineHeight: 1.4, opacity: 0.65 }}>
        {subtitle}
      </p>
    )}
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
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
      padding: '10px 12px',
      borderRadius: '6px',
      border: '1px solid var(--rapport-border, rgba(128,128,128,0.15))',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
    }}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => !disabled && onChange(e.target.checked)}
      disabled={disabled}
      style={{ marginTop: '2px', cursor: disabled ? 'not-allowed' : 'pointer' }}
    />
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '12px', fontWeight: 600 }}>{label}</div>
      {description && (
        <div style={{ fontSize: '10.5px', opacity: 0.65, marginTop: '2.5px', lineHeight: 1.35 }}>
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
  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <label style={{ fontSize: '12px', fontWeight: 600 }}>
        {label}
        <span style={{ fontWeight: 400, opacity: 0.6, marginLeft: '6px' }}>
          {value}{suffix || ''}
        </span>
      </label>
      {descriptor && (
        <span style={{ fontSize: '10.5px', color: '#00a884', fontWeight: 600 }}>
          {descriptor(value)}
        </span>
      )}
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={{ width: '100%', cursor: 'pointer' }}
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
      background: 'rgba(0, 0, 0, 0.55)',
      backdropFilter: 'blur(3px)',
      zIndex: 10000,
    }}
    onClick={onCancel}
  >
    <div
      style={{
        background: 'var(--rapport-bg-card, #121417)',
        borderRadius: '12px',
        border: '1px solid var(--rapport-border-danger, #ef4444)',
        padding: '20px',
        maxWidth: '360px',
        width: '90%',
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.5)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 700 }}>
        {title}
      </h4>
      <p style={{ margin: '0 0 16px 0', fontSize: '11.5px', opacity: 0.7, lineHeight: 1.45 }}>
        {message}
      </p>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          style={{
            padding: '8px 14px',
            borderRadius: '6px',
            border: '1px solid var(--rapport-border, rgba(128,128,128,0.25))',
            background: 'transparent',
            color: 'inherit',
            fontSize: '11.5px',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          style={{
            padding: '8px 14px',
            borderRadius: '6px',
            border: 'none',
            background: '#ef4444',
            color: '#ffffff',
            fontSize: '11.5px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
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

  const isError = message.type === 'error';
  const isSuccess = message.type === 'success';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '9px 14px',
        borderRadius: '6px',
        background: isError ? 'rgba(239, 68, 68, 0.12)' : isSuccess ? 'rgba(16, 185, 129, 0.12)' : 'rgba(128, 128, 128, 0.12)',
        border: `1px solid ${isError ? '#ef444433' : isSuccess ? '#10b98133' : 'rgba(128,128,128,0.2)'}`,
        color: isError ? '#ef4444' : isSuccess ? '#10b981' : 'inherit',
        fontSize: '12px',
        fontWeight: 500,
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
      }}
    >
      <span>{isSuccess ? '✓' : isError ? '✕' : 'ℹ'}</span>
      <span style={{ flex: 1 }}>{message.text}</span>
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          fontSize: '13px',
          padding: '0 2px',
          opacity: 0.6,
        }}
      >
        ×
      </button>
    </div>
  );
};
