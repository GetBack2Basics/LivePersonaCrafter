import { 
  Users, 
  Mic, 
  Star, 
  Zap, 
  BrainCircuit,
  HardDrive
} from 'lucide-react';
import type { EngineState, PersonaProfile, TranscriptEntry, LlmCallTrace } from '../types';
import { MeetPersonaAICoreEngine } from './MeetPersonaAICoreEngine';

interface BentoGridProps {
  state: EngineState;
  onStateUpdate: (newState: EngineState) => void;
  onSwitchPersona: (persona: PersonaProfile) => void;
  onTriggerResponse: (prompt: string, model?: string, targetDurationSec?: number) => Promise<any>;
  onSubmitFeedback: (responseId: string, name: string, score: number, comment: string) => void;
  onToggleListening: () => void;
  onAddTranscript: (entry: TranscriptEntry) => void;
  onUpdateTranscript?: (transcriptId: string, text: string) => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  syncStatus?: 'LOCAL_ONLY' | 'INDEXEDDB' | 'CLOUD_SYNCED';
  isSyncing?: boolean;
  onAddPersona: (persona: PersonaProfile) => void;
  onUpdatePersona: (persona: PersonaProfile) => void;
  lastLlmCalls?: LlmCallTrace[];
  aiTranscript?: string;
  onClearAiTranscript?: () => void;
}

export function BentoGrid({ 
  state, 
  onSwitchPersona,
  onTriggerResponse,
  onSubmitFeedback,
  onToggleListening,
  onAddTranscript,
  onUpdateTranscript,
  selectedModel,
  onSelectModel,
  syncStatus,
  isSyncing,
  onAddPersona,
  onUpdatePersona,
  lastLlmCalls = [],
  aiTranscript = '',
  onClearAiTranscript
}: BentoGridProps) {
  const { activePersona, personas, transcripts, botResponses, feedbacks, stats } = state;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Top Bento Row: Live Session Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Active Persona */}
        <div className="glass-panel p-4 rounded-2xl flex items-center justify-between border-l-4 border-l-indigo-500">
          <div>
            <span className="text-xs text-zinc-400 font-medium">Active Persona</span>
            <div className="font-bold text-sm text-zinc-100 truncate max-w-[140px] mt-1">
              {activePersona.name}
            </div>
            <p className="text-[10px] text-indigo-400 font-medium">{activePersona.role}</p>
          </div>
          <img
            src={activePersona.avatarUrl}
            alt={activePersona.name}
            className="w-10 h-10 rounded-full object-cover border border-indigo-500/40"
          />
        </div>

        {/* Metric 2: Live Mic Transcripts */}
        <div className="glass-panel p-4 rounded-2xl flex items-center justify-between border-l-4 border-l-amber-500">
          <div>
            <span className="text-xs text-zinc-400 font-medium">Device Mic Transcripts</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="font-extrabold text-xl text-amber-400">{transcripts.length}</span>
              <span className="text-xs text-zinc-500">spoken</span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-0.5">Live Speech Recognition</p>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Mic className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3: Human Alignment Score */}
        <div className="glass-panel p-4 rounded-2xl flex items-center justify-between border-l-4 border-l-emerald-500">
          <div>
            <span className="text-xs text-zinc-400 font-medium">Human Evaluation Rating</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="font-extrabold text-xl text-emerald-400">
                {feedbacks.length > 0 ? stats.avgAlignmentScore : 'N/A'}
              </span>
              <span className="text-xs text-zinc-500">{feedbacks.length > 0 ? '/ 5.0' : ''}</span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              {feedbacks.length} Submissions Logged
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Star className="w-5 h-5 fill-emerald-400/20" />
          </div>
        </div>

        {/* Metric 4: LLM Response Latency */}
        <div className="glass-panel p-4 rounded-2xl flex items-center justify-between border-l-4 border-l-cyan-500">
          <div>
            <span className="text-xs text-zinc-400 font-medium">LLM Response Latency</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="font-extrabold text-xl text-cyan-400">
                {botResponses.length > 0 ? stats.lastResponseLatencyMs : '--'}
              </span>
              <span className="text-xs text-zinc-500">ms</span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-0.5 truncate max-w-[130px]">{selectedModel}</p>
          </div>
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
            <Zap className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Core Engine Component */}
      <MeetPersonaAICoreEngine
        engineState={state}
        onSwitchPersona={onSwitchPersona}
        onTriggerResponse={onTriggerResponse}
        onSubmitFeedback={onSubmitFeedback}
        onToggleListening={onToggleListening}
        onAddTranscript={onAddTranscript}
        onUpdateTranscript={onUpdateTranscript}
        selectedModel={selectedModel}
        onSelectModel={onSelectModel}
        syncStatus={syncStatus}
        isSyncing={isSyncing}
        onAddPersona={onAddPersona}
        onUpdatePersona={onUpdatePersona}
        lastLlmCalls={lastLlmCalls}
        aiTranscript={aiTranscript}
        onClearAiTranscript={onClearAiTranscript}
      />

      {/* Bottom Bento Row: Live Telemetry & Persona Knowledge Base */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Firestore Cloud Telemetry */}
        <div className="glass-panel p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              Firestore Cloud Telemetry
            </h3>
            <span className="text-[10px] text-cyan-400 font-mono">Firestore DB Active</span>
          </div>

          <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-400">Stored Mic Transcripts:</span>
              <span className="font-bold text-zinc-200">{transcripts.length} entries</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Stored Bot Responses:</span>
              <span className="font-bold text-indigo-400">{botResponses.length} statements</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Stored Feedback Evaluations:</span>
              <span className="font-bold text-emerald-400">{feedbacks.length} submissions</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Database Engine:</span>
              <span className="font-semibold text-cyan-400">
                {syncStatus === 'CLOUD_SYNCED' ? 'Firestore Cloud Synced' : 'Firestore DB Active'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Persona Portfolio & Knowledge Base */}
        <div className="glass-panel p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-emerald-400" />
              GetBack2Basics Portfolio Context
            </h3>
            <span className="text-[10px] text-zinc-500">GitHub Verified</span>
          </div>

          <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2 text-xs">
            <div className="font-semibold text-indigo-400">Embedded Repositories:</div>
            <ul className="space-y-1 text-zinc-300 text-[11px]">
              <li className="flex items-center gap-1.5">• <span className="font-mono text-amber-300">SpatialCourse_Crafter</span> - Local-first map course generator</li>
              <li className="flex items-center gap-1.5">• <span className="font-mono text-amber-300">SplatOlympics</span> - WebGPU 3D Gaussian Splatting</li>
              <li className="flex items-center gap-1.5">• <span className="font-mono text-amber-300">Enterprise_Geo_Metadata</span> - CRS GDA94/GDA2020 reprojection</li>
              <li className="flex items-center gap-1.5">• <span className="font-mono text-amber-300">BibleStudy-Crafter</span> - Offline text AI processing engine</li>
              <li className="flex items-center gap-1.5">• <span className="font-mono text-amber-300">CoverLetter-Crafter</span> - Resume context extraction</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
