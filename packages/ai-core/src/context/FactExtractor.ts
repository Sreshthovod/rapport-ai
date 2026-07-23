import { CanonicalMessage, ExtractedFact } from '@rapport/shared';

export class ImportantFactExtractor {
  public static extractFacts(messages: CanonicalMessage[]): ExtractedFact[] {
    const facts: ExtractedFact[] = [];
    if (!messages || messages.length === 0) return facts;

    messages.forEach((msg) => {
      const text = msg.text;
      if (!text || text.length < 5) return;

      // Location detection heuristic
      const locationMatch = text.match(/(?:at|in|near|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
      if (
        locationMatch &&
        !/^(Today|Tomorrow|Yesterday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/i.test(
          locationMatch[1]
        )
      ) {
        facts.push({
          category: 'location',
          fact: `Location mentioned: ${locationMatch[1]}`,
          sourceMessageId: msg.id,
          confidence: 0.8,
        });
      }

      // Date / Time detection heuristic
      const dateMatch = text.match(
        /(?:tomorrow|today|tonight|next week|at \d{1,2}(?::\d{2})?\s*(?:am|pm)?|\b\d{1,2}\/\d{1,2}\b)/i
      );
      if (dateMatch) {
        facts.push({
          category: 'date',
          fact: `Time reference: "${dateMatch[0]}" in "${text.slice(0, 40)}"`,
          sourceMessageId: msg.id,
          confidence: 0.85,
        });
      }

      // Plan detection heuristic — populates the 'plan' category used by SummaryGenerator topic inference
      const planMatch = text.match(
        /(?:let(?:'s| us)|should we|want to|how about|are you free|we could|plan(?:ning)?|meet(?:ing)?|catch up|hang out|get together)/i
      );
      if (planMatch) {
        facts.push({
          category: 'plan',
          fact: `Plan discussed: "${text.slice(0, 60)}"`,
          sourceMessageId: msg.id,
          confidence: 0.82,
        });
      }

      // Event detection heuristic
      const eventMatch = text.match(
        /(?:birthday|anniversary|wedding|party|event|concert|game|trip|vacation|holiday)/i
      );
      if (eventMatch) {
        facts.push({
          category: 'event',
          fact: `Event mentioned: ${eventMatch[0]} in "${text.slice(0, 50)}"`,
          sourceMessageId: msg.id,
          confidence: 0.85,
        });
      }

      // Preference detection heuristic
      const prefMatch = text.match(
        /(?:i prefer|i like|i love|i hate|my favorite|i don't like|i enjoy|i'm not a fan)\s+([^.,!?]+)/i
      );
      if (prefMatch) {
        facts.push({
          category: 'preference',
          fact: `Preference: ${prefMatch[0].trim()}`,
          sourceMessageId: msg.id,
          confidence: 0.9,
        });
      }
    });

    return facts;
  }
}
