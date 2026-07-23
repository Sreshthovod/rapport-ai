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
  public static readonly DEFAULT_MAX_MEMORIES = 6;
  public static readonly DEFAULT_MAX_CHAR_LENGTH = 800;

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

    const maxMemories = options?.maxMemories ?? MemoryPromptBudget.DEFAULT_MAX_MEMORIES;
    const maxCharLength = options?.maxCharLength ?? MemoryPromptBudget.DEFAULT_MAX_CHAR_LENGTH;

    const allRecords = [...memoryContext.relevantMemories];
    const charCountBefore = allRecords.reduce((sum, r) => sum + r.content.length, 0);

    // Sort: pinned first, then by numeric importanceScore desc, then recency
    allRecords.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      const scoreDiff = (b.importanceScore ?? 40) - (a.importanceScore ?? 40);
      if (scoreDiff !== 0) return scoreDiff;
      return b.updatedAt - a.updatedAt;
    });

    const selectedMemories: MemoryRecord[] = [];
    const discardedMemories: MemoryRecord[] = [];

    let currentLength = 0;

    for (const record of allRecords) {
      const lineText = MemoryPromptBudget.formatMemoryLine(record);

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

    // Separate into categories for clearer prompt structure
    const activePlans = selectedMemories.filter((r) => r.type === 'PLAN' || r.type === 'PROMISE');
    const criticalFacts = selectedMemories.filter(
      (r) => r.importance === 'CRITICAL' || r.importance === 'HIGH'
    ).filter((r) => r.type !== 'PLAN' && r.type !== 'PROMISE');
    const other = selectedMemories.filter(
      (r) => !activePlans.includes(r) && !criticalFacts.includes(r)
    );

    const sections: string[] = [];

    if (activePlans.length > 0) {
      sections.push(
        `ACTIVE PLANS & PROMISES:\n${activePlans.map((r) => MemoryPromptBudget.formatMemoryLine(r)).join('\n')}`
      );
    }
    if (criticalFacts.length > 0) {
      sections.push(
        `IMPORTANT FACTS ABOUT THIS PERSON:\n${criticalFacts.map((r) => MemoryPromptBudget.formatMemoryLine(r)).join('\n')}`
      );
    }
    if (other.length > 0) {
      sections.push(
        `ADDITIONAL CONTEXT:\n${other.map((r) => MemoryPromptBudget.formatMemoryLine(r)).join('\n')}`
      );
    }

    const promptSection = `=== LONG-TERM MEMORY ===\n${sections.join('\n\n')}`;

    return {
      promptSection,
      selectedMemories,
      discardedMemories,
      charCountBefore,
      charCountAfter: promptSection.length,
    };
  }

  private static formatMemoryLine(record: MemoryRecord): string {
    const pin = record.pinned ? '📌 ' : '';
    const cat = record.category ? `[${record.category}] ` : `[${record.type}] `;
    return `- ${pin}${cat}${record.title}: ${record.content}`;
  }
}
