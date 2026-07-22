export type LLMProviderId = 'openai' | 'claude' | 'gemini' | 'fake-provider';

export interface ProviderKeyStatus {
  hasKey: boolean;
  isValidated: boolean;
  lastChecked?: number;
}

export interface RapportSettings {
  // 1. AI Provider
  activeProviderId: LLMProviderId;
  fallbackProviderId: LLMProviderId;

  // 2. Models
  openaiModel: string;
  claudeModel: string;
  geminiModel: string;
  temperature: number;
  maxTokens: number;

  // 3. Generation
  defaultTone: string;
  defaultLength: 'concise' | 'balanced' | 'detailed';
  suggestionCount: number;
  autoGenerate: boolean;

  // 4. Memory
  enableMemory: boolean;
  maxMemoriesInBudget: number;
  autoExtractMemories: boolean;

  // 5. Privacy
  localOnlyMode: boolean;
  telemetryEnabled: boolean;
  maskContactNames: boolean;

  // 6. Advanced
  requestTimeoutMs: number;
  maxRetries: number;
  rawPromptInspect: boolean;

  // 7. Developer
  inspectorMode: boolean;
  debugLogs: boolean;
}

export const DEFAULT_RAPPORT_SETTINGS: RapportSettings = {
  activeProviderId: 'fake-provider',
  fallbackProviderId: 'fake-provider',

  openaiModel: 'gpt-4o-mini',
  claudeModel: 'claude-3-5-haiku-20241022',
  geminiModel: 'gemini-2.5-flash',
  temperature: 0.7,
  maxTokens: 500,

  defaultTone: 'Friendly',
  defaultLength: 'balanced',
  suggestionCount: 4,
  autoGenerate: true,

  enableMemory: true,
  maxMemoriesInBudget: 6,
  autoExtractMemories: true,

  localOnlyMode: false,
  telemetryEnabled: true,
  maskContactNames: false,

  requestTimeoutMs: 15000,
  maxRetries: 2,
  rawPromptInspect: false,

  inspectorMode: false,
  debugLogs: false,
};
