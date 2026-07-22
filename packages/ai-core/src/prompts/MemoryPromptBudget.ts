import { MemoryContext, MemoryRecord } from '@rapport/memory';

export interface MemoryBudgetOptions {
  maxMemories?: number;
  maxCharLength?: number;
}

export interface BudgetedMemoryOutput {
  promptSection: string;
  selectedMemories: MemoryRecord[];
  discardedMemories: MemoryRecord[];
  charCountBefore: number;
  charCountAfter: number;
}

export class MemoryPromptBudget {
  public static readonly DEFAULT_MAX_MEMORIES = 5;
  public static readonly DEFAULT_MAX_CHAR_LENGTH = 600;

  public static budgetMemories(
    memoryContext: MemoryContext | undefined,
    options?: MemoryBudgetOptions
  ): BudgetedMemoryOutput {
    if (!memoryContext || !memoryContext.relevantMemories || memoryContext.relevantMemories.length === 0) {
      return {
        promptSection: '',
        selectedMemories: [],
        discardedMemories: [],
        charCountBefore: 0,
        charCountAfter: 0,
      };
    }

    const maxMemories = options?.maxMemories || MemoryPromptBudget.DEFAULT_MAX_MEMORIES;
    const maxCharLength = options?.maxCharLength || MemoryPromptBudget.DEFAULT_MAX_CHAR_LENGTH;

    const allRecords = [...memoryContext.relevantMemories];
    const charCountBefore = allRecords.reduce((sum, r) => sum + r.content.length, 0);

    // Sort memories by importance score
    const importanceWeight = { CRITICAL: 4, HIGH: 3, NORMAL: 2, LOW: 1 };
    allRecords.sort((a, b) => (importanceWeight[b.importance] || 2) - (importanceWeight[a.importance] || 2));

    const selectedMemories: MemoryRecord[] = [];
    const discardedMemories: MemoryRecord[] = [];

    let currentLength = 0;

    for (const record of allRecords) {
      const lineText = `- [${record.importance} ${record.type}] ${record.title}: ${record.content}`;

      if (selectedMemories.length < maxMemories && currentLength + lineText.length <= maxCharLength) {
        selectedMemories.push(record);
        currentLength += lineText.length;
      } else {
        discardedMemories.push(record);
      }
    }

    if (selectedMemories.length === 0) {
      return {
        promptSection: '',
        selectedMemories: [],
        discardedMemories: allRecords,
        charCountBefore,
        charCountAfter: 0,
      };
    }

    const memoryLines = selectedMemories.map(
      (r) => `- [${r.importance} ${r.type}] ${r.title}: ${r.content}`
    );

    const promptSection = `
=== RELEVANT INTERPERSONAL MEMORIES ===
${memoryLines.join('\n')}
`.trim();

    return {
      promptSection,
      selectedMemories,
      discardedMemories,
      charCountBefore,
      charCountAfter: promptSection.length,
    };
  }
}
