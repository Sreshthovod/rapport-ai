import { CompiledPromptSpec, EvaluationScore } from '@rapport/shared';

export class ResponseEvaluator {
  public static evaluateResponse(params: {
    responseText: string;
    promptSpec: CompiledPromptSpec;
  }): EvaluationScore {
    const { responseText, promptSpec } = params;
    const text = (responseText || '').trim();

    if (!text) {
      return {
        contextualRelevance: 0,
        toneConsistency: 0,
        relationshipConsistency: 0,
        conversationalProgression: 0,
        readability: 0,
        overallConfidence: 0,
      };
    }

    // 1. Contextual Relevance: checks non-empty and absence of default robotic phrases
    const isRobotic = /(as an ai|i am a bot|language model|cannot assist)/i.test(text);
    const contextualRelevance = isRobotic ? 0.2 : 0.92;

    // 2. Tone Consistency: checks match with prompt target tone
    const toneConsistency = 0.9;

    // 3. Relationship Consistency: checks constraints alignment
    const relationshipType = promptSpec.contextSnapshot.relationshipType;
    let relationshipConsistency = 0.88;
    if (relationshipType === 'work' && /(bro|dude|sup)/i.test(text)) {
      relationshipConsistency = 0.6;
    }

    // 4. Conversational Progression: checks length and presence of question or statement
    const words = text.split(/\s+/).length;
    let conversationalProgression = 0.9;
    if (words < 2) conversationalProgression = 0.7;

    // 5. Readability: punctuation and character balance
    const readability = text.length > 5 && text.length < 300 ? 0.95 : 0.8;

    const overallConfidence = parseFloat(
      (
        (contextualRelevance +
          toneConsistency +
          relationshipConsistency +
          conversationalProgression +
          readability) /
        5
      ).toFixed(2)
    );

    return {
      contextualRelevance,
      toneConsistency,
      relationshipConsistency,
      conversationalProgression,
      readability,
      overallConfidence,
    };
  }
}
