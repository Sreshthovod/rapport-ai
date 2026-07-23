export interface BasePromptPayload {
  targetGoal?: string;
  recipientStyleTags?: string[];
  commitmentNotes?: string[];
  userDraft: string;
  recentThreadSnippet?: string;
}

export const SYSTEM_PROMPT_TEMPLATE = `
You are Rapport AI, an expert interpersonal communication strategist.
Your task is to rephrase the user's draft to achieve the specified GOAL while matching the RECIPIENT STYLE.

RULES:
1. Output ONLY the exact text to be sent. Zero commentary, intro, or quotes.
2. Preserve all core factual details (dates, numbers, names).
3. Match recipient brevity preference. Never sound synthetic or overly corporate.
`.trim();

export { TemplateRegistry } from './TemplateRegistry.js';
export { PromptComposer, DEBUG_AI_PIPELINE } from './PromptComposer.js';
export { ResponseEvaluator } from './ResponseEvaluator.js';
export { MemoryPromptBudget } from './MemoryPromptBudget.js';
export * from './fixtures.js';
