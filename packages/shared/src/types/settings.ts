export type LLMProvider = 'openai' | 'anthropic' | 'gemini';

export interface UserSettings {
  id: string;
  encryptedApiKey?: string;
  llmProvider: LLMProvider;
  blacklistedDomains: string[];
  localFirstOnly: boolean;
  autoDeescalate: boolean;
  showCommitmentWarnings: boolean;
}
