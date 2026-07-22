import React, { useEffect, useState } from 'react';
import { LLMProviderId, RapportSettings } from '@rapport/shared';
import { ApiKeyManager, ModelRegistry, ProviderManager, SettingsManager } from '@rapport/ai-core';

export interface SettingsViewProps {
  onClose?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onClose }) => {
  const settingsManager = SettingsManager.getInstance();
  const keyManager = ApiKeyManager.getInstance();
  const providerManager = ProviderManager.getInstance();
  const modelRegistry = ModelRegistry.getInstance();

  const [settings, setSettings] = useState<RapportSettings>(settingsManager.getSettings());
  const [activeTab, setActiveTab] = useState<
    'provider' | 'keys' | 'models' | 'generation' | 'memory' | 'privacy' | 'advanced' | 'developer'
  >('provider');

  // Key state
  const [openaiKey, setOpenaiKey] = useState('');
  const [claudeKey, setClaudeKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});
  const [keyStatuses, setKeyStatuses] = useState<{ [key: string]: boolean }>({});
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const unsub = settingsManager.subscribe(setSettings);
    loadKeys();
    return unsub;
  }, []);

  const loadKeys = async () => {
    const o = await keyManager.getKey('openai');
    const c = await keyManager.getKey('claude');
    const g = await keyManager.getKey('gemini');

    setOpenaiKey(o || '');
    setClaudeKey(c || '');
    setGeminiKey(g || '');

    const oStat = await keyManager.getKeyStatus('openai');
    const cStat = await keyManager.getKeyStatus('claude');
    const gStat = await keyManager.getKeyStatus('gemini');

    setKeyStatuses({
      openai: oStat.hasKey,
      claude: cStat.hasKey,
      gemini: gStat.hasKey,
    });
  };

  const handleSaveKey = async (providerId: string, val: string) => {
    await keyManager.setKey(providerId, val);
    await loadKeys();
  };

  const handleTestKey = async (providerId: string) => {
    setTestingKey(providerId);
    setTestResult((prev) => ({ ...prev, [providerId]: 'Testing connection...' }));
    const isValid = await providerManager.healthCheck(providerId);
    setTestingKey(null);
    if (isValid) {
      setTestResult((prev) => ({ ...prev, [providerId]: '✓ Connected successfully!' }));
    } else {
      setTestResult((prev) => ({ ...prev, [providerId]: '✕ Connection failed. Check key & network.' }));
    }
  };

  const handleUpdate = (updates: Partial<RapportSettings>) => {
    settingsManager.updateSettings(updates);
  };

  const tabs: { id: typeof activeTab; label: string; icon: string }[] = [
    { id: 'provider', label: 'AI Provider', icon: '⚡' },
    { id: 'keys', label: 'API Keys', icon: '🔑' },
    { id: 'models', label: 'Models', icon: '🧠' },
    { id: 'generation', label: 'Generation', icon: '✨' },
    { id: 'memory', label: 'Memory', icon: '💾' },
    { id: 'privacy', label: 'Privacy', icon: '🛡️' },
    { id: 'advanced', label: 'Advanced', icon: '⚙️' },
    { id: 'developer', label: 'Developer', icon: '🛠️' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: '720px',
        maxHeight: '620px',
        background: 'var(--rapport-bg, #1a1d21)',
        color: 'var(--rapport-text-primary, #ffffff)',
        borderRadius: '12px',
        border: '1px solid var(--rapport-border, #2d3239)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
        fontFamily: 'Inter, system-ui, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--rapport-border, #2d3239)',
          background: 'rgba(0, 0, 0, 0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>⚙️</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Rapport AI Settings</h3>
            <span style={{ fontSize: '11px', color: 'var(--rapport-text-secondary, #9ca3af)' }}>
              Configure AI providers, models, privacy, and memory integration
            </span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
              fontSize: '18px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Main Container: Sidebar Tabs + Content */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Sidebar Nav */}
        <div
          style={{
            width: '180px',
            borderRight: '1px solid var(--rapport-border, #2d3239)',
            padding: '12px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            background: 'rgba(0, 0, 0, 0.1)',
            flexShrink: 0,
          }}
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === t.id ? 'var(--rapport-accent, #00a884)' : 'transparent',
                color: activeTab === t.id ? '#ffffff' : 'var(--rapport-text-primary, #d1d5db)',
                fontSize: '12.5px',
                fontWeight: activeTab === t.id ? 600 : 500,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Panel */}
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
          {/* TAB 1: AI PROVIDER */}
          {activeTab === 'provider' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>Active AI Provider</h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
                  Select the primary LLM engine to generate contextual replies.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { id: 'fake-provider', title: 'Offline Mode (Local Deterministic)', desc: 'Zero API keys required. Operates offline.', badge: 'Local' },
                  { id: 'openai', title: 'OpenAI GPT (GPT-5 / GPT-4o)', desc: 'Industry-standard reasoning and conversational naturalness.', badge: keyStatuses.openai ? 'Ready' : 'Requires Key' },
                  { id: 'claude', title: 'Anthropic Claude (Claude 3.5 Sonnet / Haiku)', desc: 'Unmatched tone accuracy and interpersonal empathy.', badge: keyStatuses.claude ? 'Ready' : 'Requires Key' },
                  { id: 'gemini', title: 'Google Gemini (Gemini 2.5 Pro / Flash)', desc: 'Sub-second streaming and ultra-long thread comprehension.', badge: keyStatuses.gemini ? 'Ready' : 'Requires Key' },
                ].map((p) => (
                  <label
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: `1px solid ${settings.activeProviderId === p.id ? 'var(--rapport-accent, #00a884)' : '#2d3239'}`,
                      background: settings.activeProviderId === p.id ? 'rgba(0, 168, 132, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="radio"
                        name="activeProvider"
                        checked={settings.activeProviderId === p.id}
                        onChange={() => handleUpdate({ activeProviderId: p.id as LLMProviderId })}
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{p.title}</div>
                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>{p.desc}</div>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background: p.badge === 'Ready' || p.badge === 'Local' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: p.badge === 'Ready' || p.badge === 'Local' ? '#10b981' : '#ef4444',
                        fontWeight: 600,
                      }}
                    >
                      {p.badge}
                    </span>
                  </label>
                ))}
              </div>

              <div style={{ marginTop: '10px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Fallback Provider (On failure or rate limit)
                </label>
                <select
                  value={settings.fallbackProviderId}
                  onChange={(e) => handleUpdate({ fallbackProviderId: e.target.value as LLMProviderId })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #2d3239',
                    background: '#1a1d21',
                    color: '#ffffff',
                    fontSize: '12.5px',
                  }}
                >
                  <option value="fake-provider">Offline Mode (FakeProvider)</option>
                  <option value="openai">OpenAI GPT</option>
                  <option value="claude">Anthropic Claude</option>
                  <option value="gemini">Google Gemini</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 2: API KEYS */}
          {activeTab === 'keys' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>API Keys</h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
                  Keys are stored encrypted locally in browser storage and never logged.
                </p>
              </div>

              {[
                { id: 'openai', name: 'OpenAI API Key', keyVal: openaiKey, setKeyVal: setOpenaiKey, ph: 'sk-proj-...' },
                { id: 'claude', name: 'Anthropic Claude API Key', keyVal: claudeKey, setKeyVal: setClaudeKey, ph: 'sk-ant-...' },
                { id: 'gemini', name: 'Google Gemini API Key', keyVal: geminiKey, setKeyVal: setGeminiKey, ph: 'AIzaSy...' },
              ].map((k) => (
                <div key={k.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600 }}>{k.name}</label>
                    {keyStatuses[k.id] && (
                      <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 600 }}>✓ Key Configured</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type={showKeys[k.id] ? 'text' : 'password'}
                      value={k.keyVal}
                      placeholder={k.ph}
                      onChange={(e) => k.setKeyVal(e.target.value)}
                      onBlur={() => handleSaveKey(k.id, k.keyVal)}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #2d3239',
                        background: '#1a1d21',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                      }}
                    />
                    <button
                      onClick={() => setShowKeys((prev) => ({ ...prev, [k.id]: !prev[k.id] }))}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #2d3239',
                        background: '#252930',
                        color: '#d1d5db',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      {showKeys[k.id] ? 'Hide' : 'Show'}
                    </button>
                    <button
                      onClick={() => handleTestKey(k.id)}
                      disabled={testingKey === k.id || !k.keyVal}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--rapport-accent, #00a884)',
                        background: 'rgba(0, 168, 132, 0.15)',
                        color: 'var(--rapport-accent, #00a884)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Test
                    </button>
                  </div>
                  {testResult[k.id] && (
                    <span style={{ fontSize: '11px', color: testResult[k.id].includes('✓') ? '#10b981' : '#ef4444' }}>
                      {testResult[k.id]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: MODELS */}
          {activeTab === 'models' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>Model Configuration</h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
                  Choose specific models and adjust generation parameters.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    OpenAI Model
                  </label>
                  <select
                    value={settings.openaiModel}
                    onChange={(e) => handleUpdate({ openaiModel: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #2d3239', background: '#1a1d21', color: '#fff', fontSize: '12px' }}
                  >
                    {modelRegistry.getModelsForProvider('openai').map((m) => (
                      <option key={m.id} value={m.id}>{m.name} ({m.description})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Anthropic Claude Model
                  </label>
                  <select
                    value={settings.claudeModel}
                    onChange={(e) => handleUpdate({ claudeModel: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #2d3239', background: '#1a1d21', color: '#fff', fontSize: '12px' }}
                  >
                    {modelRegistry.getModelsForProvider('claude').map((m) => (
                      <option key={m.id} value={m.id}>{m.name} ({m.description})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Google Gemini Model
                  </label>
                  <select
                    value={settings.geminiModel}
                    onChange={(e) => handleUpdate({ geminiModel: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #2d3239', background: '#1a1d21', color: '#fff', fontSize: '12px' }}
                  >
                    {modelRegistry.getModelsForProvider('gemini').map((m) => (
                      <option key={m.id} value={m.id}>{m.name} ({m.description})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600 }}>Temperature ({settings.temperature})</span>
                    <span style={{ color: '#9ca3af' }}>{settings.temperature < 0.4 ? 'Precise' : settings.temperature > 0.8 ? 'Creative' : 'Balanced'}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.temperature}
                    onChange={(e) => handleUpdate({ temperature: parseFloat(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600 }}>Max Tokens ({settings.maxTokens})</span>
                  </div>
                  <input
                    type="range"
                    min="150"
                    max="2000"
                    step="50"
                    value={settings.maxTokens}
                    onChange={(e) => handleUpdate({ maxTokens: parseInt(e.target.value, 10) })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GENERATION */}
          {activeTab === 'generation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>Suggestion Preferences</h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
                  Customize default tone, length, and auto-suggestion behaviors.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Default Tone Preference
                  </label>
                  <select
                    value={settings.defaultTone}
                    onChange={(e) => handleUpdate({ defaultTone: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #2d3239', background: '#1a1d21', color: '#fff', fontSize: '12px' }}
                  >
                    {['Friendly', 'Professional', 'Casual', 'Playful', 'Supportive', 'Flirty', 'Formal'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Suggestions per Request ({settings.suggestionCount})
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={settings.suggestionCount}
                    onChange={(e) => handleUpdate({ suggestionCount: parseInt(e.target.value, 10) })}
                    style={{ width: '100%' }}
                  />
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.autoGenerate}
                    onChange={(e) => handleUpdate({ autoGenerate: e.target.checked })}
                  />
                  <span>Auto-generate suggestions when chat opens in WhatsApp Web</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 5: MEMORY */}
          {activeTab === 'memory' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>Interpersonal Memory System</h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
                  Configure long-term facts, active plans, and relationship memory context.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.enableMemory}
                    onChange={(e) => handleUpdate({ enableMemory: e.target.checked })}
                  />
                  <span>Enable Interpersonal Memory Integration in prompts</span>
                </label>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Max Memories in Prompt Budget ({settings.maxMemoriesInBudget})
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="10"
                    value={settings.maxMemoriesInBudget}
                    onChange={(e) => handleUpdate({ maxMemoriesInBudget: parseInt(e.target.value, 10) })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PRIVACY */}
          {activeTab === 'privacy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>Privacy & Local Data Protection</h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
                  Control telemetry, contact name masking, and local-only processing.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.localOnlyMode}
                    onChange={(e) => handleUpdate({ localOnlyMode: e.target.checked, activeProviderId: e.target.checked ? 'fake-provider' : settings.activeProviderId })}
                  />
                  <span>Enforce Strict Local-Only Mode (Forces Offline Provider)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.maskContactNames}
                    onChange={(e) => handleUpdate({ maskContactNames: e.target.checked })}
                  />
                  <span>Mask real contact names before sending to external LLM providers</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 7: ADVANCED */}
          {activeTab === 'advanced' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>Advanced Network & Retries</h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Request Timeout (ms): {settings.requestTimeoutMs}
                  </label>
                  <input
                    type="range"
                    min="5000"
                    max="60000"
                    step="2500"
                    value={settings.requestTimeoutMs}
                    onChange={(e) => handleUpdate({ requestTimeoutMs: parseInt(e.target.value, 10) })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Max Retries on Transient Failures ({settings.maxRetries})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    value={settings.maxRetries}
                    onChange={(e) => handleUpdate({ maxRetries: parseInt(e.target.value, 10) })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: DEVELOPER */}
          {activeTab === 'developer' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>Developer Observability</h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.inspectorMode}
                    onChange={(e) => handleUpdate({ inspectorMode: e.target.checked })}
                  />
                  <span>Enable Real-Time AI Pipeline Inspector Drawer in Overlay</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.debugLogs}
                    onChange={(e) => handleUpdate({ debugLogs: e.target.checked })}
                  />
                  <span>Enable Verbose Console Debug Logs</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
