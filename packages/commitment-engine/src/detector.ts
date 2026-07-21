const NON_COMMITMENT_PATTERNS = [
  /\bi\s+(think|wish|hope|wonder|guess)\b/i,
  /\bmaybe\b/i,
  /\bif\s+possible\b/i,
  /\bif\s+i\s+can\b/i,
  /\bnot\s+sure\b/i,
];

const COMMITMENT_PATTERNS = [
  /\b(i'll|i\s+will)\s+(send|share|call|finish|update|check|get\s+back|mail|upload|fix|give|deliver|review|look\s+at)\b/i,
  /\b(i\s+can)\s+(do\s+that|handle\s+that|take\s+care\s+of\s+it|fix\s+it)\b/i,
  /\b(we'll|we\s+will)\s+(fix|finish|send|share|handle|update)\b/i,
  /\b(i'll)\s+(be\s+there|be\s+done)\b/i,
];

const DEADLINE_PATTERNS = [
  /\b(by\s+tomorrow|tomorrow)\b/i,
  /\b(by\s+tonight|tonight)\b/i,
  /\b(by\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/i,
  /\b(later\s+today|later)\b/i,
  /\b(in\s+\d+\s+(mins?|minutes?|hours?|days?))\b/i,
];

export interface ExtractedCommitment {
  action: string;
  deadline?: string;
}

export function isNonCommitment(text: string): boolean {
  return NON_COMMITMENT_PATTERNS.some((pattern) => pattern.test(text));
}

export function extractCommitmentDetails(text: string): ExtractedCommitment | null {
  if (isNonCommitment(text)) {
    return null;
  }

  let matchedAction: string | null = null;

  for (const pattern of COMMITMENT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      matchedAction = match[0].trim();
      break;
    }
  }

  if (!matchedAction) {
    return null;
  }

  let deadline: string | undefined = undefined;
  for (const dlPattern of DEADLINE_PATTERNS) {
    const dlMatch = text.match(dlPattern);
    if (dlMatch) {
      deadline = dlMatch[0].trim();
      break;
    }
  }

  return {
    action: matchedAction,
    deadline,
  };
}
