export interface PersonaProfile {
  id: string;
  name: string;
  role: string;
  avatarUrl: string;
  background: string;
  tone: string;
  speechPattern: string;
  sampleQuotes: string[];
  keyTraits: string[];
  systemPrompt: string;
  createdAt: string;
}

export interface MeetingSession {
  sessionId: string;
  meetLink: string;
  title: string;
  startTime: string;
  endTime?: string | null;
  activePersonaId: string;
  status: 'DISCONNECTED' | 'JOINING' | 'CONNECTED' | 'LISTENING' | 'SPEAKING' | 'ERROR';
  participantCount: number;
}

export interface TranscriptEntry {
  transcriptId: string;
  sessionId: string;
  speaker: string;
  speakerRole: 'human' | 'bot' | 'system';
  text: string;
  timestamp: string;
  isBotTrigger?: boolean;
  sentiment?: 'neutral' | 'positive' | 'curious' | 'critical';
}

export interface BotResponse {
  responseId: string;
  transcriptId: string;
  sessionId: string;
  personaId: string;
  promptContext: string;
  responseText: string;
  topicAddressed?: string;
  vocalizedAudioUrl?: string;
  alignmentConfidence: number; // 0-100%
  latencyMs: number;
  modelUsed?: string;
  createdAt: string;
  feedbackSubmitted?: boolean;
}

export interface ParticipantFeedback {
  feedbackId: string;
  responseId: string;
  sessionId: string;
  personaId: string;
  evaluatorName: string;
  evaluatorRole: string;
  alignmentScore: number; // 1 to 5 stars
  isPersonaMatch: boolean;
  comments: string;
  submittedAt: string;
}

export interface EngineStats {
  totalInteractions: number;
  avgAlignmentScore: number;
  transcriptsProcessed: number;
  activeSessionDurationSec: number;
  lastResponseLatencyMs: number;
  openRouterStatus: 'ONLINE' | 'STANDBY' | 'SIMULATED';
}

export interface EngineState {
  session: MeetingSession;
  personas: PersonaProfile[];
  activePersona: PersonaProfile;
  transcripts: TranscriptEntry[];
  botResponses: BotResponse[];
  feedbacks: ParticipantFeedback[];
  stats: EngineStats;
  isListening: boolean;
  isSimulating: boolean;
}
