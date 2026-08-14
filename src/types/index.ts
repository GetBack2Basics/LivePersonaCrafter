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

/** Represents a single captured LLM API call — shown as clickable/expandable cards in the UI */
export interface LlmCallTrace {
  traceId: string;
  type: 'QUESTION_EXTRACTION' | 'PERSONA_RESPONSE';
  model: string;
  systemPrompt: string;
  userMessage: string;
  rawResponse: string;
  latencyMs: number;
  timestamp: string;
}

export type IssueCategory = 'BUG' | 'FEATURE' | 'ENHANCEMENT' | 'UI_UX' | 'PERFORMANCE';
export type IssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IssueCriticality = 'P3_LOW' | 'P2_MEDIUM' | 'P1_HIGH' | 'P0_BLOCKER';
export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface IssueItem {
  id: string;
  title: string;
  description: string;
  category: IssueCategory;
  severity: IssueSeverity;
  criticality: IssueCriticality;
  status: IssueStatus;
  reportedBy: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  votes: number;
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

