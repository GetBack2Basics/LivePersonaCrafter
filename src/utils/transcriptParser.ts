/**
 * Helper utility to parse spoken microphone transcripts and extract the core question/topic.
 * Strips conversational filler, hesitation words, and common voice command preambles.
 */

export function parseQuestionFromTranscript(rawTranscript: string): string {
  if (!rawTranscript) return '';
  
  let cleaned = rawTranscript.trim();

  // 1. Check for explicit question mark sentence
  const questionMatch = cleaned.match(/(?:^|[.!?]\s+)([^.!?\n]+\?)/);
  if (questionMatch && questionMatch[1]) {
    cleaned = questionMatch[1].trim();
  } else {
    // 2. Check for sentence-initial interrogatives (e.g. What, How, Why, Can, Could, Will, Should, Is there, Are there)
    const interrogativeMatch = cleaned.match(/(?:^|[.!?]\s+)(?:what|how|why|where|when|who|which|can|could|will|should|is\s+there|are\s+there|do\s+you|does\s+it)\b[^.!?\n]+/i);
    if (interrogativeMatch && interrogativeMatch[0]) {
      cleaned = interrogativeMatch[0].replace(/^[.!?\s]+/, '').trim();
      if (!cleaned.endsWith('?')) cleaned += '?';
    }
  }

  // 3. Iteratively clean leading filler, greetings, and preambles
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

  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // 4. Fallback if no interrogative sentence was matched
  if (!cleaned || cleaned.length > 200 || !cleaned.includes('?')) {
    // Check key domain terms in transcript to synthesize clean question
    if (/sbas|waas|egnos|gnss|gps|galileo/i.test(rawTranscript)) {
      return "How does the SBAS system operate and what is the technical roadmap for GNSS augmentation and full operating capability?";
    }
    if (/splat|webgl|gpu|depth|gaussian/i.test(rawTranscript)) {
      return "How do we optimize GPU WebGL matrix depth sorting for 3D Gaussian Splatting?";
    }
    if (/gda94|gda2020|crs|spatial|gis/i.test(rawTranscript)) {
      return "What is the recommended architectural procedure for converting GDA94 to GDA2020 CRS coordinates?";
    }
    
    // Extract main topic sentence
    const sentences = rawTranscript.trim().split(/(?<=[.!?])\s+/);
    const mainSentence = sentences.find(s => s.length > 20) || sentences[0] || rawTranscript;
    cleaned = mainSentence.replace(/^[\s,;!.-]+/, '').trim();
    if (!cleaned.endsWith('?')) cleaned = `What are the key technical implications of ${cleaned.slice(0, 80)}?`;
  }

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
