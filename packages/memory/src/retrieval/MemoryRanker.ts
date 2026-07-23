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

      // 1. Pinned memories always surface first (+30 pts)
      if (record.pinned) {
        score += 30;
      }

      // 2. Contact Match Score (+40 pts)
      if (record.contactId === query.contactId) {
        score += 40;
      }

      // 3. Numeric Importance Score (0–100, scaled to 0–25 pts)
      score += Math.round((record.importanceScore ?? 40) * 0.25);

      // 4. Topic & Keyword Overlap (+20 pts max)
      const text = `${record.title} ${record.content} ${record.tags.join(' ')}`.toLowerCase();
      if (topic && text.includes(topic)) {
        score += 15;
      }

      let keywordHits = 0;
      keywords.forEach((kw) => {
        if (text.includes(kw)) keywordHits++;
      });
      score += Math.min(keywordHits * 5, 20);

      // 5. Recency Score (+10 pts max for recent records)
      const daysOld = (Date.now() - record.createdAt) / (1000 * 60 * 60 * 24);
      if (daysOld <= 7) {
        score += 10;
      } else if (daysOld <= 30) {
        score += 5;
      }

      // 6. Confidence Multiplier
      const finalScore = score * (record.confidence || 0.9);

      return {
        record,
        relevanceScore: Math.round(finalScore * 100) / 100,
      };
    });

    return ranked.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
}
