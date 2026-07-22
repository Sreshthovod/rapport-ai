import { MemoryRecord, MemoryRetrievalQuery } from '../types/MemoryTypes.js';

export interface RankedMemory {
  record: MemoryRecord;
  relevanceScore: number;
}

export class MemoryRanker {
  public static rankMemories(records: MemoryRecord[], query: MemoryRetrievalQuery): RankedMemory[] {
    const topic = (query.currentTopic || '').toLowerCase();
    const keywords = (query.recentKeywords || []).map((k) => k.toLowerCase());

    const ranked: RankedMemory[] = records.map((record) => {
      let score = 0;

      // 1. Contact Match Score (+40 pts)
      if (record.contactId === query.contactId) {
        score += 40;
      }

      // 2. Importance Score (+5 to +25 pts)
      const importanceMap = { CRITICAL: 25, HIGH: 18, NORMAL: 10, LOW: 5 };
      score += importanceMap[record.importance] || 10;

      // 3. Topic & Keyword Overlap (+20 pts max)
      const text = `${record.title} ${record.content} ${record.tags.join(' ')}`.toLowerCase();
      if (topic && text.includes(topic)) {
        score += 15;
      }

      let keywordHits = 0;
      keywords.forEach((kw) => {
        if (text.includes(kw)) keywordHits++;
      });
      score += Math.min(keywordHits * 5, 20);

      // 4. Recency Score (+10 pts max for recent records)
      const daysOld = (Date.now() - record.createdAt) / (1000 * 60 * 60 * 24);
      if (daysOld <= 7) {
        score += 10;
      } else if (daysOld <= 30) {
        score += 5;
      }

      // 5. Confidence Score Multiplier
      const finalScore = score * (record.confidence || 0.9);

      return {
        record,
        relevanceScore: Math.round(finalScore * 100) / 100,
      };
    });

    return ranked.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
}
