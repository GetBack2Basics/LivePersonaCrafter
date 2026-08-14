import React, { useState, useEffect } from "react";
import {
  X,
  BookOpen,
  Key,
  Users,
  Mic,
  Star,
  Database,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  Globe,
  Bot,
  MessageSquare,
  Volume2,
  ThumbsUp,
  Download,
  RefreshCw,
  HardDrive,
  Zap,
  Info,
  FileCode,
  Cpu,
  Layers,
  Code
} from "lucide-react";

interface HowToUseGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

type GuideTab = 'GETTING_STARTED' | 'PERSONAS' | 'MIC_DEBATE' | 'FEEDBACK' | 'DATA_EXPORT' | 'TECH_STACK';

const tabs: { id: GuideTab; label: string; icon: React.ReactNode }[] = [
  { id: 'GETTING_STARTED', label: 'Getting Started', icon: <Key className="w-4 h-4" /> },
  { id: 'PERSONAS', label: 'Personas', icon: <Users className="w-4 h-4" /> },
  { id: 'MIC_DEBATE', label: 'Mic & Debate', icon: <Mic className="w-4 h-4" /> },
  { id: 'FEEDBACK', label: 'Feedback & Evaluation', icon: <Star className="w-4 h-4" /> },
  { id: 'DATA_EXPORT', label: 'Data & Export', icon: <Database className="w-4 h-4" /> },
  { id: 'TECH_STACK', label: 'Tech Stack & Architecture', icon: <FileCode className="w-4 h-4" /> },
];

function StepCard({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300 font-extrabold text-sm">
        {number}
      </div>
      <div>
        <div className="font-bold text-sm text-zinc-100 mb-1">{title}</div>
        <div className="text-xs text-zinc-400 leading-relaxed space-y-1">{children}</div>
      </div>
    </div>
  );
}

function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs text-amber-200 leading-relaxed">
      <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

function InlineBadge({ color, children }: { color: string; children: React.ReactNode }) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-950/60 text-indigo-300 border-indigo-500/30',
    emerald: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30',
    amber: 'bg-amber-950/60 text-amber-300 border-amber-500/30',
    cyan: 'bg-cyan-950/60 text-cyan-300 border-cyan-500/30',
    rose: 'bg-rose-950/60 text-rose-300 border-rose-500/30',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-semibold ${colorMap[color] || colorMap.indigo}`}>
      {children}
    </span>
  );
}

function GettingStartedTab() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
        <div className="p-2 bg-indigo-950/60 border border-indigo-500/30 rounded-xl">
          <Bot className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h3 className="font-extrabold text-base text-zinc-100">Welcome to LivePersona Crafter</h3>
          <p className="text-xs text-zinc-400">Real-Time Persona Evaluation & Debate Engine by GetBack2Basics</p>
        </div>
      </div>

      <p className="text-sm text-zinc-300 leading-relaxed">
        LivePersona Crafter lets you create AI-powered debate personas, generate real-time spoken responses,
        and evaluate persona alignment with human feedback — all running locally-first with offline persistence.
      </p>

      <div className="space-y-3">
        <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-400 flex items-center gap-2">
          <Key className="w-3.5 h-3.5" /> Step 1 — Connect Your API Key
        </h4>

        <StepCard number={1} title="Choose Your AI Provider">
          <p>At the top of the engine panel, select either:</p>
          <ul className="mt-1 space-y-1 ml-2">
            <li className="flex items-center gap-2">
              <InlineBadge color="cyan">Gemini API</InlineBadge>
              — Google's Gemini models. Get a free key at{" "}
              <span className="text-indigo-400 font-mono">aistudio.google.com</span>
            </li>
            <li className="flex items-center gap-2">
              <InlineBadge color="amber">OpenRouter</InlineBadge>
              — Multi-model gateway. Get a key at{" "}
              <span className="text-indigo-400 font-mono">openrouter.ai</span>
            </li>
          </ul>
        </StepCard>

        <StepCard number={2} title="Paste & Verify Your Key">
          <p>Paste your key into the password field next to the provider selector.</p>
          <p className="mt-1">
            Click <InlineBadge color="indigo">Verify Key</InlineBadge> — the app performs a live HTTP ping to
            confirm the key is valid before enabling any AI features.
          </p>
          <p className="mt-1">
            Once verified, the border turns{" "}
            <InlineBadge color="emerald"><CheckCircle2 className="w-3 h-3" /> green</InlineBadge> and the
            button shows "Verified".
          </p>
        </StepCard>

        <StepCard number={3} title="Select Your Model">
          <p>Use the model dropdown next to the provider. When your key is verified, it automatically selects the top free-tier model:</p>
          <ul className="mt-1 space-y-0.5 ml-2">
            <li>• <span className="text-emerald-400 font-semibold">OpenRouter Key:</span> Auto-selects <code className="text-xs bg-zinc-800 px-1 py-0.5 rounded text-emerald-300">google/gemini-2.0-flash-lite-preview-02-05:free [Free]</code></li>
            <li>• <span className="text-emerald-400 font-semibold">Gemini API Key:</span> Auto-selects <code className="text-xs bg-zinc-800 px-1 py-0.5 rounded text-emerald-300">gemini-1.5-flash [Free]</code></li>
          </ul>
          <p className="mt-1">All models display transparent pricing in brackets <code className="text-xs bg-zinc-800 px-1 py-0.5 rounded text-zinc-300">[Free]</code>, <code className="text-xs bg-zinc-800 px-1 py-0.5 rounded text-zinc-300">[$0.07/M]</code>, <code className="text-xs bg-zinc-800 px-1 py-0.5 rounded text-zinc-300">[$0.15/M]</code>.</p>
        </StepCard>
      </div>

      <TipBox>
        <strong>Your key is stored only in your browser's localStorage</strong> — it never leaves your device
        except when making direct API calls to the provider you chose.
      </TipBox>
    </div>
  );
}

function PersonasTab() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
        <div className="p-2 bg-purple-950/60 border border-purple-500/30 rounded-xl">
          <Users className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="font-extrabold text-base text-zinc-100">Persona Management</h3>
          <p className="text-xs text-zinc-400">Create, switch, and edit AI debate personas</p>
        </div>
      </div>

      <p className="text-sm text-zinc-300 leading-relaxed">
        A <strong className="text-zinc-100">Persona</strong> is a named AI character with a role, background,
        and key traits that shapes how the AI responds in debates. You can switch between personas mid-session.
      </p>

      <div className="space-y-3">
        <h4 className="font-bold text-xs uppercase tracking-wider text-purple-400 flex items-center gap-2">
          <Users className="w-3.5 h-3.5" /> Working With Personas
        </h4>

        <StepCard number={1} title="Switch Active Persona">
          <p>In the <strong className="text-zinc-200">Active Persona</strong> sidebar (bottom-left card), click any persona card to make it active.</p>
          <p className="mt-1">The active persona is highlighted with an <InlineBadge color="emerald">Active</InlineBadge> badge.</p>
          <p className="mt-1">All subsequent AI responses will use this persona's voice, background, and traits.</p>
        </StepCard>

        <StepCard number={2} title="Create a New Persona via AI">
          <p>In the <strong className="text-zinc-200">Persona Matrix</strong> tab, click <InlineBadge color="indigo"><Sparkles className="w-3 h-3" /> Add New Persona</InlineBadge>.</p>
          <p className="mt-1">Paste any profile text — a LinkedIn bio, a job description, or a character brief — into the text area.</p>
          <p className="mt-1">Click <InlineBadge color="indigo">Generate Persona</InlineBadge>. The AI will extract a structured persona (name, role, traits, background) automatically.</p>
        </StepCard>

        <StepCard number={3} title="Edit an Existing Persona">
          <p>With the persona active, switch to the <strong className="text-zinc-200">Persona Matrix</strong> tab.</p>
          <p className="mt-1">Click <InlineBadge color="amber">Edit</InlineBadge> to inline-edit the name, role, background and key traits.</p>
          <p className="mt-1">Click <InlineBadge color="emerald">Save Changes</InlineBadge> to persist the edits.</p>
        </StepCard>
      </div>

      <TipBox>
        <strong>Tip:</strong> Each persona's avatar is auto-assigned from a curated avatar URL. You can update this via the edit form by pasting a direct image URL.
      </TipBox>
    </div>
  );
}

function MicDebateTab() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
        <div className="p-2 bg-amber-950/60 border border-amber-500/30 rounded-xl">
          <Mic className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h3 className="font-extrabold text-base text-zinc-100">Mic & Debate Engine</h3>
          <p className="text-xs text-zinc-400">Live speech recognition, JSON core question synthesis, and persona response generation</p>
        </div>
      </div>

      <p className="text-sm text-zinc-300 leading-relaxed">
        The debate engine captures your speech via your device microphone, synthesizes the core question using an LLM JSON schema, and generates in-character persona responses.
      </p>

      <div className="space-y-3">
        <h4 className="font-bold text-xs uppercase tracking-wider text-amber-400 flex items-center gap-2">
          <Mic className="w-3.5 h-3.5" /> Running a Debate Session
        </h4>

        <StepCard number={1} title="Start Microphone & 3000ms Silence Latency">
          <p>Click <InlineBadge color="amber"><Mic className="w-3 h-3" /> Start Device Mic</InlineBadge> in the Debate Control panel.</p>
          <p className="mt-1">Your browser will request microphone permission — click Allow.</p>
          <p className="mt-1">
            <strong>Silence Latency (Default 3000ms):</strong> Speech recognition uses a 3000 ms silence latency by default (customizable in UI) before finalizing spoken transcript entries.
          </p>
          <p className="mt-1">A real-time 16-band noise frequency graph visualizes your microphone audio levels.</p>
        </StepCard>

        <StepCard number={2} title="Synthesize Core Question (Create Question)">
          <p>Speak your prompt or discussion topic into the microphone.</p>
          <p className="mt-1">
            Click <InlineBadge color="indigo">Create Question</InlineBadge>. The LLM receives the spoken audio transcript and extracts the core question strictly using JSON schema:
            <code className="block text-[11px] bg-zinc-950 p-2 rounded mt-1 font-mono text-indigo-300">{`{\n  "core_question": "string"\n}`}</code>
          </p>
        </StepCard>

        <StepCard number={3} title="Generate Persona Response (Respond as Persona)">
          <p>Once the core question is synthesized, the <InlineBadge color="emerald">Respond as Persona</InlineBadge> button activates.</p>
          <p className="mt-1">Click <InlineBadge color="emerald">Respond as Persona</InlineBadge> to generate a direct 45-second (~75+ word) technical response in the active persona's voice without repeating the question.</p>
          <p className="mt-1">If the selected model encounters upstream rate limits, the system automatically retries with Gemini 2.0 Flash Lite Free.</p>
        </StepCard>

        <StepCard number={4} title="Text-to-Speech Playback & Controls">
          <p>On any generated response card, click <InlineBadge color="cyan"><Volume2 className="w-3 h-3" /> Speak</InlineBadge> to hear it read aloud using browser synthesis (supports rate and pitch controls).</p>
          <p className="mt-1">Click <InlineBadge color="rose">Stop Device Mic</InlineBadge> when done recording.</p>
        </StepCard>
      </div>

      <TipBox>
        <strong>Prerequisite & Verification:</strong> A verified API key is required before asking questions. Verified keys automatically select the top free-tier model for your chosen provider.
      </TipBox>
    </div>
  );
}

function FeedbackTab() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
        <div className="p-2 bg-emerald-950/60 border border-emerald-500/30 rounded-xl">
          <ThumbsUp className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h3 className="font-extrabold text-base text-zinc-100">Feedback & Human Evaluation</h3>
          <p className="text-xs text-zinc-400">Rate AI persona responses and track alignment scores</p>
        </div>
      </div>

      <p className="text-sm text-zinc-300 leading-relaxed">
        After each AI response is generated, you or other evaluators can score how well the persona
        performed — rating alignment with human expectations on a 1–5 scale.
      </p>

      <div className="space-y-3">
        <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-400 flex items-center gap-2">
          <Star className="w-3.5 h-3.5" /> Submitting Feedback
        </h4>

        <StepCard number={1} title="Select Your Evaluator Name">
          <p>In the <strong className="text-zinc-200">Feedback</strong> tab, your name defaults to the active persona name.</p>
          <p className="mt-1">Click the evaluator dropdown to switch to a previously used name, or click <InlineBadge color="indigo">+ Add Evaluator</InlineBadge> to register a new evaluator name.</p>
          <p className="mt-1">Evaluator names are persisted in localStorage across sessions.</p>
        </StepCard>

        <StepCard number={2} title="Rate a Response">
          <p>Click <InlineBadge color="amber"><MessageSquare className="w-3 h-3" /> Rate This Response</InlineBadge> on any generated response.</p>
          <p className="mt-1">A feedback form appears with:</p>
          <ul className="mt-1 space-y-0.5 ml-2">
            <li>• <strong className="text-zinc-200">Score (1–5):</strong> Use the slider or click star buttons</li>
            <li>• <strong className="text-zinc-200">Comment:</strong> Optional qualitative notes</li>
          </ul>
          <p className="mt-1">Click <InlineBadge color="emerald">Submit Feedback</InlineBadge> to save.</p>
        </StepCard>

        <StepCard number={3} title="View the Feedback Log">
          <p>Open the <strong className="text-zinc-200">Feedback</strong> tab to see all submitted evaluations, including who rated, what score, and when.</p>
          <p className="mt-1">The dashboard header shows the <strong className="text-zinc-200">average alignment score</strong> across all submissions.</p>
        </StepCard>

        <StepCard number={4} title="Share a Feedback Link">
          <p>Click <InlineBadge color="cyan"><Globe className="w-3 h-3" /> Copy Feedback Link</InlineBadge> to copy a shareable URL.</p>
          <p className="mt-1">Share this link with colleagues or stakeholders to collect distributed feedback on the same session.</p>
        </StepCard>
      </div>

      <TipBox>
        <strong>Use the Feedback tab</strong> to track how consistently the persona responds in-character across multiple triggered debates during a session.
      </TipBox>
    </div>
  );
}

function DataExportTab() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
        <div className="p-2 bg-cyan-950/60 border border-cyan-500/30 rounded-xl">
          <HardDrive className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h3 className="font-extrabold text-base text-zinc-100">Data Storage & Export</h3>
          <p className="text-xs text-zinc-400">Local-first IndexedDB persistence and JSON export</p>
        </div>
      </div>

      <p className="text-sm text-zinc-300 leading-relaxed">
        All session data — transcripts, AI responses, and feedback — is stored locally in your browser's
        IndexedDB. No account or internet connection is required to access past sessions.
      </p>

      <div className="space-y-3">
        <h4 className="font-bold text-xs uppercase tracking-wider text-cyan-400 flex items-center gap-2">
          <Database className="w-3.5 h-3.5" /> Understanding Local Storage
        </h4>

        <StepCard number={1} title="Local Store Telemetry">
          <p>The <strong className="text-zinc-200">Local Store Telemetry</strong> card (bottom-center) shows live counts:</p>
          <ul className="mt-1 space-y-0.5 ml-2">
            <li>• <strong className="text-zinc-200">Mic Transcripts:</strong> Spoken segments captured this session</li>
            <li>• <strong className="text-zinc-200">Bot Responses:</strong> AI persona responses generated</li>
            <li>• <strong className="text-zinc-200">Feedback Evaluations:</strong> Human ratings submitted</li>
          </ul>
          <p className="mt-1">
            The DB Status shows <InlineBadge color="cyan">IndexedDB Offline Persistence</InlineBadge> when working locally.
          </p>
        </StepCard>

        <StepCard number={2} title="Export Feedback as JSON">
          <p>In the <strong className="text-zinc-200">Feedback</strong> tab, click <InlineBadge color="indigo"><Download className="w-3 h-3" /> Export Dataset JSON</InlineBadge>.</p>
          <p className="mt-1">This downloads a structured JSON file containing all responses paired with their human ratings — ready for analysis or model fine-tuning workflows.</p>
        </StepCard>

        <StepCard number={3} title="LLM Call Logs">
          <p>Switch to the <strong className="text-zinc-200">LLM Logs</strong> tab to inspect the raw prompt/response traces for every AI call made in this session.</p>
          <p className="mt-1">Three trace types are shown: Persona Response, Alignment Evaluation, and Transcript Context Processing.</p>
        </StepCard>

        <StepCard number={4} title="Reset Session State">
          <p>Click the <InlineBadge color="rose"><RefreshCw className="w-3 h-3" /> Reset</InlineBadge> icon in the top-right of the Header to clear all in-memory state and return to defaults.</p>
          <p className="mt-1">
            <strong className="text-rose-300">Note:</strong> This resets runtime state only. IndexedDB data persists until manually cleared via your browser's DevTools storage panel.
          </p>
        </StepCard>
      </div>

      <div className="flex gap-3 p-4 bg-indigo-950/30 border border-indigo-500/30 rounded-xl text-xs">
        <ChevronRight className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-indigo-200 leading-relaxed">
          <strong className="text-indigo-300">GetBack2Basics Portfolio Context:</strong> The knowledge base embedded in this engine references 5 real repositories —
          SpatialCourse_Crafter, SplatOlympics, Enterprise_Geo_Metadata, BibleStudy-Crafter, and CoverLetter-Crafter.
          These inform the persona's contextual knowledge during debates.
        </div>
      </div>
    </div>
  );
}

function TechStackTab() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
        <div className="p-2 bg-indigo-950/60 border border-indigo-500/30 rounded-xl">
          <FileCode className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h3 className="font-extrabold text-base text-zinc-100">Technical Architecture & Tech Stack</h3>
          <p className="text-xs text-zinc-400">Languages, Hardware APIs, AI Frameworks & GitHub Repositories</p>
        </div>
      </div>

      <p className="text-xs text-zinc-300 leading-relaxed">
        LivePersona Crafter is built as a local-first, privacy-respecting AI persona evaluation and debate platform.
        Here is the comprehensive technical breakdown of languages, libraries, hardware APIs, AI orchestrators, and open-source GitHub repositories used in this project:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Languages & Frontend */}
        <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-2">
          <div className="font-bold text-xs text-indigo-400 uppercase tracking-wider flex items-center gap-2">
            <Code className="w-3.5 h-3.5" /> Core Languages & Web Framework
          </div>
          <ul className="text-xs text-zinc-300 space-y-1.5 list-disc list-inside">
            <li><strong className="text-zinc-100">TypeScript 5.x:</strong> Strict type-safety across client hooks, storage proxies, and backend orchestrators.</li>
            <li><strong className="text-zinc-100">React 18 & Vite:</strong> Ultra-fast component rendering, HMR, and modular SPA state hooks (<code className="text-indigo-300">usePersonaEngine</code>).</li>
            <li><strong className="text-zinc-100">TailwindCSS & Lucide Icons:</strong> Sleek dark-mode Bento UI system with responsive glassmorphic cards.</li>
          </ul>
        </div>

        {/* Hardware & Web APIs */}
        <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-2">
          <div className="font-bold text-xs text-emerald-400 uppercase tracking-wider flex items-center gap-2">
            <Mic className="w-3.5 h-3.5" /> Hardware & Browser Audio APIs
          </div>
          <ul className="text-xs text-zinc-300 space-y-1.5 list-disc list-inside">
            <li><strong className="text-zinc-100">Web Speech API (SpeechRecognition):</strong> Continuous live device microphone speech-to-text input.</li>
            <li><strong className="text-zinc-100">Web Audio API (AudioContext & AnalyserNode):</strong> Real-time FFT 16-band audio noise graph visualizer.</li>
            <li><strong className="text-zinc-100">Web Speech API (SpeechSynthesis):</strong> Natural vocalization rate & pitch synthesis.</li>
          </ul>
        </div>

        {/* AI & Multi-Model Providers */}
        <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-2">
          <div className="font-bold text-xs text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5" /> Multi-Model AI Orchestration
          </div>
          <ul className="text-xs text-zinc-300 space-y-1.5 list-disc list-inside">
            <li><strong className="text-zinc-100">Google Gemini API:</strong> Direct Google Cloud inference (<code className="text-amber-300">gemini-1.5-flash</code>, <code className="text-amber-300">gemini-1.5-pro</code>, <code className="text-amber-300">gemini-2.0-flash</code>, <code className="text-amber-300">gemini-2.5-flash</code>).</li>
            <li><strong className="text-zinc-100">OpenRouter API Router:</strong> Open multi-provider routing (Gemma 2 9B Free, Llama 3.3 70B, DeepSeek V3/R1, Qwen 2.5 72B, Claude 3.5, GPT-4o).</li>
            <li><strong className="text-zinc-100">Node.js Express Server:</strong> Backend proxy (<code className="text-zinc-400">server/llmOrchestrator.ts</code>) on port 3005 for structured trace logs.</li>
          </ul>
        </div>

        {/* Local Storage & Persistence */}
        <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-2">
          <div className="font-bold text-xs text-cyan-400 uppercase tracking-wider flex items-center gap-2">
            <HardDrive className="w-3.5 h-3.5" /> Local-First Offline Storage
          </div>
          <ul className="text-xs text-zinc-300 space-y-1.5 list-disc list-inside">
            <li><strong className="text-zinc-100">Browser LocalStorage:</strong> Synchronous engine state & verified key token storage.</li>
            <li><strong className="text-zinc-100">IndexedDBStore:</strong> Async client database for multi-session transcripts & feedback dataset logs.</li>
            <li><strong className="text-zinc-100">Firebase Firestore:</strong> Optional cloud synchronization for multi-device evaluation benchmarks.</li>
          </ul>
        </div>
      </div>

      {/* Embedded Repositories */}
      <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-3">
        <div className="font-bold text-xs text-purple-400 uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-3.5 h-3.5" /> Embedded Projects & GitHub Repositories
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-300">
          <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800">
            <strong className="text-indigo-300 font-mono">GetBack2Basics/LivePersonaCrafter</strong>
            <p className="text-[11px] text-zinc-400 mt-0.5">Primary repository for real-time persona craft engine, evaluation benchmarks, and exposed JSON traces.</p>
          </div>
          <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800">
            <strong className="text-indigo-300 font-mono">SpatialCourse_Crafter</strong>
            <p className="text-[11px] text-zinc-400 mt-0.5">Local-first spatial map course generator and waypoint scoring engine.</p>
          </div>
          <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800">
            <strong className="text-indigo-300 font-mono">SplatOlympics</strong>
            <p className="text-[11px] text-zinc-400 mt-0.5">WebGPU and WebGL 3D Gaussian Splatting rendering engine offloaded to web workers.</p>
          </div>
          <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800">
            <strong className="text-indigo-300 font-mono">Enterprise_Geo_Metadata</strong>
            <p className="text-[11px] text-zinc-400 mt-0.5">Spatial CRS reprojection pipeline (GDA94 to GDA2020) and enterprise metadata catalog.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HowToUseGuide({ isOpen, onClose }: HowToUseGuideProps) {
  const [activeTab, setActiveTab] = useState<GuideTab>('GETTING_STARTED');

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const renderContent = () => {
    switch (activeTab) {
      case 'GETTING_STARTED': return <GettingStartedTab />;
      case 'PERSONAS': return <PersonasTab />;
      case 'MIC_DEBATE': return <MicDebateTab />;
      case 'FEEDBACK': return <FeedbackTab />;
      case 'DATA_EXPORT': return <DataExportTab />;
      case 'TECH_STACK': return <TechStackTab />;
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-950/60 border border-indigo-500/30 rounded-xl">
              <BookOpen className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-zinc-100">How to Use LivePersona Crafter</h2>
              <p className="text-xs text-zinc-400">Step-by-step guide to the Persona Evaluation & Debate Engine</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/how-to-use.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg transition-all"
            >
              <Globe className="w-3.5 h-3.5" />
              Open Full Guide
            </a>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-xl transition-all"
              aria-label="Close guide"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto gap-1 px-4 pt-3 pb-2 border-b border-zinc-800 flex-shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-800 flex-shrink-0 bg-zinc-950/80">
          <span className="text-[10px] text-zinc-500 font-mono">LivePersonaCrafter © GetBack2Basics</span>
          <div className="flex items-center gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`h-1.5 rounded-full transition-all ${
                  activeTab === tab.id ? 'bg-indigo-400 w-4' : 'bg-zinc-700 hover:bg-zinc-500 w-1.5'
                }`}
                aria-label={`Go to ${tab.label}`}
              />
            ))}
          </div>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            Close (ESC)
          </button>
        </div>
      </div>
    </div>
  );
}
