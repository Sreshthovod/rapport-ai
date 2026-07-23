export type LLMProviderId = 'openai' | 'claude' | 'gemini' | 'groq' | 'fake-provider';

export type ThemePreference = 'light' | 'dark' | 'system';

export type OverlayPosition = 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';

export type ConversationStyle = 'balanced' | 'concise' | 'expressive';

export interface ProviderKeyStatus {
  hasKey: boolean;
  isValidated: boolean;
  lastChecked?: number;
}

export interface MemoryStatistics {
  totalMemories: number;
  totalContacts: number;
  storageSizeBytes: number;
  oldestMemoryDate?: number;
  newestMemoryDate?: number;
}

export interface RapportSettings {
  // ── General ────────────────────────────────────────────────────────────────
  language: string;
  defaultConversationStyle: ConversationStyle;
  suggestionCount: number;
  autoGenerate: boolean;
  conversationMode: 'natural' | 'professional' | 'warm' | 'playful' | 'flirty' | 'supportive' | 'confident';
  suggestionPersonality: 'safe' | 'balanced' | 'creative';
  writingStyle: 'usual' | 'casual' | 'friendly' | 'professional' | 'short-direct' | 'detailed' | 'humorous' | 'respectful' | 'romantic' | 'motivational';

  // ── AI ─────────────────────────────────────────────────────────────────────
  activeProviderId: LLMProviderId;
  fallbackProviderId: LLMProviderId;
  openaiModel: string;
  claudeModel: string;
  geminiModel: string;
  groqModel: string;
  temperature: number;
  maxTokens: number;
  defaultTone: string;
  streamingEnabled: boolean;

  // ── Memory ─────────────────────────────────────────────────────────────────
  enableMemory: boolean;
  maxMemoriesInBudget: number;
  autoExtractMemories: boolean;
  rememberPreferences: boolean;
  rememberPlans: boolean;
  rememberDates: boolean;
  rememberInterests: boolean;

  // ── Privacy ────────────────────────────────────────────────────────────────
  localOnlyMode: boolean;
  telemetryEnabled: boolean;
  maskContactNames: boolean;
  disabledChatIds: string[];
  memoryDisabledChatIds: string[];

  // ── Appearance ─────────────────────────────────────────────────────────────
  theme: ThemePreference;
  compactMode: boolean;
  animationsEnabled: boolean;
  overlayPosition: OverlayPosition;

  // ── Advanced ───────────────────────────────────────────────────────────────
  requestTimeoutMs: number;
  maxRetries: number;
  enableProviderFallback: boolean;
  promptContextBudget: number;
  cacheDurationMs: number;
  rawPromptInspect: boolean;

  // ── Developer ──────────────────────────────────────────────────────────────
  inspectorMode: boolean;
  debugLogs: boolean;
  showFinalPrompt: boolean;
  showRetrievedMemories: boolean;
  showProviderLogs: boolean;
  showRequestTiming: boolean;
  showTokenUsage: boolean;
  developerModeUnlocked: boolean;
}

export const DEFAULT_RAPPORT_SETTINGS: RapportSettings = {
  // General
  language: 'en',
  defaultConversationStyle: 'balanced',
  suggestionCount: 4,
  autoGenerate: true,
  conversationMode: 'natural',
  suggestionPersonality: 'balanced',
  writingStyle: 'usual',

  // AI
  activeProviderId: 'fake-provider',
  fallbackProviderId: 'fake-provider',
  openaiModel: 'gpt-4o-mini',
  claudeModel: 'claude-3-5-haiku-20241022',
  geminiModel: 'gemini-2.5-flash',
  groqModel: 'llama-3.3-70b-versatile',
  temperature: 0.7,
  maxTokens: 500,
  defaultTone: 'Friendly',
  streamingEnabled: true,

  // Memory
  enableMemory: true,
  maxMemoriesInBudget: 6,
  autoExtractMemories: true,
  rememberPreferences: true,
  rememberPlans: true,
  rememberDates: true,
  rememberInterests: true,

  // Privacy
  localOnlyMode: false,
  telemetryEnabled: true,
  maskContactNames: false,
  disabledChatIds: [],
  memoryDisabledChatIds: [],

  // Appearance
  theme: 'dark',
  compactMode: false,
  animationsEnabled: true,
  overlayPosition: 'bottom-right',

  // Advanced
  requestTimeoutMs: 15000,
  maxRetries: 2,
  enableProviderFallback: true,
  promptContextBudget: 4000,
  cacheDurationMs: 300000,
  rawPromptInspect: false,

  // Developer
  inspectorMode: false,
  debugLogs: false,
  showFinalPrompt: false,
  showRetrievedMemories: false,
  showProviderLogs: false,
  showRequestTiming: false,
  showTokenUsage: false,
  developerModeUnlocked: false,
};
