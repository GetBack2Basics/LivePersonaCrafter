/**
 * Helper utility to parse spoken microphone transcripts and extract the core question/topic.
 * Strips conversational filler, hesitation words, and common voice command preambles.
 */

export function parseQuestionFromTranscript(rawTranscript: string): string {
  if (!rawTranscript) return '';
  
  let cleaned = rawTranscript.trim();

  // Iteratively clean leading filler, greetings, and preambles
  let prev = '';
  while (cleaned !== prev) {
    prev = cleaned;
    cleaned = cleaned
      .replace(/^[\s,;!.-]+/, '')
      .replace(/^(um+|uh+|ah+|like|you know|err+|hmm+|so yeah|basically|actually)\b/gi, '')
      .replace(/^[\s,;!.-]+/, '')
      .replace(/^(hey|hi|hello|okay|so)\s+(persona|getback2basics|ai|bot|assistant|there|system)[,!]?\s*/i, '')
      .replace(/^[\s,;!.-]+/, '')
      .replace(/^(can you|could you|would you|please|i wanted to ask|i would like to know|tell me|what do you think about|how would you explain)\s+/i, '')
      .replace(/^[\s,;!.-]+/, '');
  }

  // Clean up remaining internal double spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  if (!cleaned) {
    return rawTranscript.trim();
  }

  // Ensure first character is capitalized
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function extractKeyQuestionTerms(text: string): string[] {
  if (!text) return [];
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !['what', 'how', 'why', 'when', 'where', 'that', 'this', 'with', 'from', 'have', 'your', 'about', 'some'].includes(w));
  return Array.from(new Set(words));
}
