import type { MeetingSession, TranscriptEntry, PersonaProfile, BotResponse, ParticipantFeedback } from '../types';

export const DB_CONFIG = {
  dbName: 'MeetPersonaAIDB',
  version: 1,
  stores: {
    sessions: 'sessionId, meetLink, activePersonaId, startTime',
    transcripts: 'transcriptId, sessionId, speakerRole, timestamp',
    personas: 'id, name, role',
    responses: 'responseId, transcriptId, sessionId, personaId, createdAt',
    feedbacks: 'feedbackId, responseId, sessionId, personaId, submittedAt'
  }
};

export interface DatabaseSnapshot {
  sessions: MeetingSession[];
  transcripts: TranscriptEntry[];
  personas: PersonaProfile[];
  botResponses: BotResponse[];
  feedbacks: ParticipantFeedback[];
  lastSyncedAt: string;
  isCloudSynced: boolean;
}

export function validatePersonaProfile(persona: Partial<PersonaProfile>): boolean {
  return Boolean(persona.id && persona.name && persona.role && persona.systemPrompt);
}

export function validateTranscriptEntry(entry: Partial<TranscriptEntry>): boolean {
  return Boolean(entry.transcriptId && entry.sessionId && entry.speaker && entry.text);
}

export function validateParticipantFeedback(feedback: Partial<ParticipantFeedback>): boolean {
  return Boolean(
    feedback.feedbackId && 
    feedback.responseId && 
    feedback.alignmentScore && 
    feedback.alignmentScore >= 1 && 
    feedback.alignmentScore <= 5
  );
}
