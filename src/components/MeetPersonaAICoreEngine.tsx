import React, { useState, useRef, useEffect } from "react";
import { 
  Sparkles, 
  Activity, 
  Flame, 
  MessageSquare, 
  ThumbsUp, 
  RefreshCw, 
  Share2, 
  CheckCircle2, 
  Sliders, 
  Radio, 
  Database,
  Download,
  CloudCheck,
  HardDrive,
  Cpu,
  Mic,
  MicOff,
  Square,
  VolumeX,
  Volume2,
  Send,
  FileCode,
  Clock,
  Gauge,
  HelpCircle,
  Key,
  AlertTriangle,
  Globe,
  Lock,
  Check,
  UserPlus,
  Timer
} from "lucide-react";
import type { EngineState, TranscriptEntry } from "../types";
import { useFeedbackCollector } from "../hooks/useFeedbackCollector";
import { useLiveSpeechRecognition } from "../hooks/useLiveSpeechRecognition";
import { StorageProxy, getUserApiKey, setUserApiKey, validateApiKey, isApiKeyVerifiedLocally } from "../engine/storageProxy";
import type { ApiModel } from "../engine/storageProxy";

import personaResponseGenTrace from '../assets/llm_calls/persona_response_generation.json';
import personaAlignTrace from '../assets/llm_calls/persona_alignment_evaluation.json';
import transcriptCtxTrace from '../assets/llm_calls/transcript_context_processing.json';

interface CoreEngineProps {
  engineState: EngineState;
  onSwitchPersona: (persona: any) => void;
  onTriggerResponse: (prompt: string, model?: string, targetDurationSec?: number) => Promise<any>;
  onSubmitFeedback: (responseId: string, name: string, score: number, comment: string) => void;
  onToggleListening: () => void;
  onAddTranscript: (entry: TranscriptEntry) => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  syncStatus?: 'LOCAL_ONLY' | 'INDEXEDDB' | 'CLOUD_SYNCED';
  isSyncing?: boolean;
  onAddPersona?: (persona: any) => void;
  onUpdatePersona?: (persona: any) => void;
}

export function MeetPersonaAICoreEngine({ 
  engineState: state,
  onSwitchPersona,
  onTriggerResponse,
  onSubmitFeedback,
  onToggleListening,
  onAddTranscript,
  selectedModel,
  onSelectModel,
  syncStatus = 'INDEXEDDB',
  isSyncing = false,
  onAddPersona,
  onUpdatePersona
}: CoreEngineProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [targetDurationSec, setTargetDurationSec] = useState<number>(45);
  const [latencyLeeway, setLatencyLeeway] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('HIGH');
  const [activeTab, setActiveTab] = useState<'MATRIX' | 'TRANSCRIPT' | 'FEEDBACK' | 'LLM_LOGS' | 'ARCH'>('MATRIX');
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeFeedbackResponseId, setActiveFeedbackResponseId] = useState<string | null>(null);
  const [newFeedbackScore, setNewFeedbackScore] = useState<number>(5);
  const [newFeedbackComment, setNewFeedbackComment] = useState("");

  // Evaluator list — defaults to persona name; persisted in localStorage
  const EVALUATORS_KEY = 'LPC_EVALUATOR_LIST';
  const loadEvaluators = (): string[] => {
    try {
      const stored = localStorage.getItem(EVALUATORS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  };
  const [evaluatorList, setEvaluatorList] = useState<string[]>(loadEvaluators);
  const [evaluatorName, setEvaluatorName] = useState<string>(""); // will be set from active persona
  const [isAddingEvaluator, setIsAddingEvaluator] = useState(false);
  const [newEvaluatorInput, setNewEvaluatorInput] = useState("");

  const [isAddingPersona, setIsAddingPersona] = useState(false);
  const [isEditingPersona, setIsEditingPersona] = useState(false);
  const [personaFormText, setPersonaFormText] = useState("");
  const [isGeneratingPersona, setIsGeneratingPersona] = useState(false);
  const [personaGenError, setPersonaGenError] = useState("");
  
  // For editing inline:
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editBackground, setEditBackground] = useState("");
  const [editKeyTraits, setEditKeyTraits] = useState("");

  // Real Pre-flight API Key Verification State
  const [apiKeyInput, setApiKeyInput] = useState<string>(getUserApiKey());
  const [selectedProvider, setSelectedProvider] = useState<'openrouter' | 'gemini'>(
    () => (localStorage.getItem('LPC_API_PROVIDER') as 'openrouter' | 'gemini') || 'gemini'
  );
  const [availableModels, setAvailableModels] = useState<ApiModel[]>([]);
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [keyValidationStatus, setKeyValidationStatus] = useState<{ isValid: boolean; message: string } | null>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);

  // STRICT validation: Mic & Debate are ONLY unlocked if HTTP ping returns isValid === true
  const hasValidKey = Boolean(
    apiKeyInput && 
    apiKeyInput.trim() && 
    keyValidationStatus?.isValid === true && 
    isApiKeyVerifiedLocally()
  );

  const handleApiKeyChange = (rawKey: string) => {
    setApiKeyInput(rawKey);
    setUserApiKey(rawKey, false); // Mark unverified until HTTP ping passes
    setKeyValidationStatus(null);
  };

  const handleTestAndSaveKey = async (keyToTest?: string) => {
    const targetKey = keyToTest !== undefined ? keyToTest : apiKeyInput;
    const cleanKey = targetKey.trim();
    if (!cleanKey) {
      setKeyValidationStatus({ isValid: false, message: 'API Key is empty.' });
      return;
    }

    setIsValidatingKey(true);
    const result = await validateApiKey(cleanKey, selectedProvider);
    setIsValidatingKey(false);
    setKeyValidationStatus({ isValid: result.isValid, message: result.message });
    if (result.models) {
      setAvailableModels(result.models);
    } else {
      setAvailableModels([]);
    }
  };

  useEffect(() => {
    if (apiKeyInput && apiKeyInput.trim()) {
      handleTestAndSaveKey(apiKeyInput);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Device Microphone Speech Recognition Hook
  const { 
    isTranscribing, 
    interimText, 
    latestSpokenText,
    startTranscription, 
    stopTranscription 
  } = useLiveSpeechRecognition({
    sessionId: state.session.sessionId,
    onTranscriptAdded: onAddTranscript,
    onAutoTrigger: (spokenText) => {
      if (spokenText && spokenText.trim() && hasValidKey) {
        setCustomPrompt((prev) => prev ? prev + " " + spokenText.trim() : spokenText.trim());
      }
    }
  });

  const { stats: feedbackStats, exportFeedbackDatasetJSON } = useFeedbackCollector(state.feedbacks, state.botResponses);

  // Pre-flight Mic Check: MANDATORY Real HTTP Verification before mic can start!
  const handleStartMicWithCheck = async () => {
    if (!hasValidKey) {
      if (keyInputRef.current) {
        keyInputRef.current.focus();
        keyInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setKeyValidationStatus({
        isValid: false,
        message: 'API Key Test Required! Please enter your Gemini Key (AIza...) or OpenRouter Key (sk-or-...) above and click Verify.'
      });
      return;
    }
    await startTranscription();
  };

  const handleTrigger = async (promptOverride?: string) => {
    if (!hasValidKey) {
      if (keyInputRef.current) {
        keyInputRef.current.focus();
        keyInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setKeyValidationStatus({
        isValid: false,
        message: 'API Key Verification Required! Please enter a valid Gemini (AIza...) or OpenRouter (sk-or-...) Key and click Verify Key.'
      });
      return;
    }
    const prompt = promptOverride || customPrompt || latestSpokenText || "GetBack2Basics, what is your position on comparative literature analysis and local-first systems?";
    setIsGenerating(true);
    setLastLatencyMs(null);
    const t0 = Date.now();
    const result = await onTriggerResponse(prompt, selectedModel, targetDurationSec);
    const elapsed = Date.now() - t0;
    setLastLatencyMs(result?.latencyMs ?? elapsed);
    setIsGenerating(false);
    setCustomPrompt("");
  };

  // Speak a text string using Web Speech Synthesis
  const handleSpeak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (isSpeaking) { setIsSpeaking(false); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Add evaluator to list
  const handleAddEvaluator = () => {
    const name = newEvaluatorInput.trim();
    if (!name || evaluatorList.includes(name)) return;
    const updated = [...evaluatorList, name];
    setEvaluatorList(updated);
    try { localStorage.setItem(EVALUATORS_KEY, JSON.stringify(updated)); } catch {}
    setEvaluatorName(name);
    setNewEvaluatorInput("");
    setIsAddingEvaluator(false);
  };

  const handleAddFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFeedbackResponseId) return;
    onSubmitFeedback(activeFeedbackResponseId, evaluatorName, newFeedbackScore, newFeedbackComment);
    setNewFeedbackComment("");
    setActiveFeedbackResponseId(null);
    setActiveTab('FEEDBACK');
  };

  const handleCopyFeedbackLink = () => {
    const link = `${window.location.origin}/feedback?session=${state.session.sessionId}&persona=${state.activePersona.id}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleGeneratePersona = async () => {
    if (!personaFormText.trim()) return;
    setPersonaGenError("");
    setIsGeneratingPersona(true);
    try {
      const newPersona = await StorageProxy.generatePersonaFromProfile(personaFormText);
      if (onAddPersona) {
        onAddPersona(newPersona);
      }
      setPersonaFormText("");
      setIsAddingPersona(false);
    } catch (err: any) {
      setPersonaGenError(err.message || "Failed to generate persona");
    } finally {
      setIsGeneratingPersona(false);
    }
  };

  const handleStartEdit = () => {
    setEditName(activePersona.name);
    setEditRole(activePersona.role);
    setEditBackground(activePersona.background);
    setEditKeyTraits(activePersona.keyTraits.join(", "));
    setIsEditingPersona(true);
  };

  const handleSaveEditPersona = () => {
    if (!editName.trim() || !editRole.trim()) return;
    const updated = {
      ...activePersona,
      name: editName,
      role: editRole,
      background: editBackground,
      keyTraits: editKeyTraits.split(",").map(t => t.trim()).filter(Boolean)
    };
    if (onUpdatePersona) {
      onUpdatePersona(updated);
    }
    setIsEditingPersona(false);
  };

  const activePersona = state.activePersona;
  const latestResponse = state.botResponses.length > 0 ? state.botResponses[0] : null;

  // Default evaluator name to persona name when persona changes
  useEffect(() => {
    if (activePersona?.name && !evaluatorName) {
      setEvaluatorName(activePersona.name);
    }
  }, [activePersona?.name]);

  return (
    <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-2xl text-white space-y-6 shadow-2xl">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-950/80 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Flame className="w-6 h-6 text-amber-500 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-base text-zinc-100 tracking-tight">
                MeetPersona AI Core Engine Matrix
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full flex items-center gap-1">
                <Clock className="w-3 h-3 text-indigo-400" />
                {targetDurationSec}s Target Vocal Duration
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-sans mt-0.5">
              Multi-Model OpenRouter & Gemini persona evaluation engine.
            </p>
          </div>
        </div>

        {/* Status, API Key Config, Model Selector & Sync Badges */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Provider Selection & API Key Config */}
          <div className="flex flex-col gap-1">
            <div className={`flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border rounded-xl text-xs transition-all ${
              hasValidKey 
                ? 'border-emerald-500/50 shadow-md shadow-emerald-950/40' 
                : 'border-rose-500/70 shadow-md shadow-rose-950/40'
            }`}>
              <select
                value={selectedProvider}
                onChange={(e) => {
                  const val = e.target.value as 'openrouter' | 'gemini';
                  setSelectedProvider(val);
                  localStorage.setItem('LPC_API_PROVIDER', val);
                  setKeyValidationStatus(null);
                  setUserApiKey(apiKeyInput, false); // Mark unverified when changing provider
                }}
                className="bg-transparent text-indigo-400 font-bold focus:outline-none cursor-pointer border-r border-zinc-700 pr-2 mr-1"
              >
                <option value="gemini">Gemini API</option>
                <option value="openrouter">OpenRouter</option>
              </select>
              <Key className={`w-4 h-4 ${hasValidKey ? 'text-emerald-400' : 'text-rose-400 animate-pulse'}`} />
              <input
                ref={keyInputRef}
                type="password"
                placeholder={selectedProvider === 'gemini' ? "Paste Gemini Key (AIza...)" : "Paste OpenRouter Key (sk-or...)"}
                value={apiKeyInput}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                className="bg-transparent text-zinc-100 font-mono text-xs w-56 focus:outline-none placeholder:text-zinc-500"
              />
              <button
                onClick={() => handleTestAndSaveKey()}
                disabled={isValidatingKey || !apiKeyInput.trim()}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  hasValidKey
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
                }`}
              >
                {isValidatingKey ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : hasValidKey ? (
                  <Check className="w-3.5 h-3.5 text-white" />
                ) : (
                  <Key className="w-3.5 h-3.5" />
                )}
                {isValidatingKey ? 'Testing...' : hasValidKey ? 'Verified' : 'Verify Key'}
              </button>
            </div>
            {keyValidationStatus && !keyValidationStatus.isValid && (
              <div className="text-[10px] text-rose-400 font-medium px-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {keyValidationStatus.message}
              </div>
            )}
          </div>

          {/* LLM Model Selector Dropdown & Custom Input */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-indigo-500/40 rounded-lg text-xs">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <select
                value={
                  availableModels.length > 0 
                    ? (availableModels.find(m => m.id === selectedModel) ? selectedModel : 'custom')
                    : ([
                        'gemini-1.5-flash', 'gemini-1.5-pro', 
                        'google/gemini-2.0-flash-lite-preview-02-05:free', 'meta-llama/llama-3.1-8b-instruct:free', 'qwen/qwen-2.5-7b-instruct:free', 'google/gemma-2-9b-it:free',
                        'deepseek/deepseek-chat', 'qwen/qwen-2.5-72b-instruct', 
                        'anthropic/claude-3.5-sonnet', 'openai/gpt-4o'
                      ].includes(selectedModel) ? selectedModel : 'custom')
                }
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    onSelectModel('');
                  } else {
                    onSelectModel(e.target.value);
                  }
                }}
                className="bg-transparent text-zinc-200 font-medium focus:outline-none cursor-pointer max-w-[220px]"
              >
                {availableModels.length > 0 ? (
                  <>
                    {['Free', 'Cheap', 'Medium', 'Top', 'Gemini'].map(group => {
                      const groupModels = availableModels.filter(m => m.group === group);
                      if (groupModels.length === 0) return null;
                      return (
                        <optgroup key={group} label={`${group} Models`} className="bg-zinc-900 text-emerald-400 font-bold">
                          {groupModels.map(m => (
                            <option key={m.id} value={m.id} className="bg-zinc-900 text-zinc-100">{m.name}</option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </>
                ) : (
                  <>
                    <optgroup label="Direct Gemini API Tiers (Gemini Key)" className="bg-zinc-900 text-cyan-400 font-bold">
                      <option value="gemini-1.5-flash" className="bg-zinc-900 text-zinc-100">Gemini 1.5 Flash (Default)</option>
                      <option value="gemini-1.5-pro" className="bg-zinc-900 text-zinc-100">Gemini 1.5 Pro</option>
                    </optgroup>
                    <optgroup label="Free Tier Models (OpenRouter Key)" className="bg-zinc-900 text-emerald-400 font-bold">
                      <option value="google/gemini-3.5-flash-lite" className="bg-zinc-900 text-zinc-100">Gemini 3.5 Flash Lite</option>
                      <option value="meta-llama/llama-3.1-8b-instruct:free" className="bg-zinc-900 text-zinc-100">Meta Llama 3.1 8B (Free)</option>
                      <option value="qwen/qwen-2.5-7b-instruct:free" className="bg-zinc-900 text-zinc-100">Qwen 2.5 7B (Free)</option>
                      <option value="google/gemma-2-9b-it:free" className="bg-zinc-900 text-zinc-100">Google Gemma 2 9B (Free)</option>
                    </optgroup>
                    <optgroup label="Chinese / Asian Models (OpenRouter Key)" className="bg-zinc-900 text-indigo-400 font-bold">
                      <option value="deepseek/deepseek-chat" className="bg-zinc-900 text-zinc-100">DeepSeek V3 / R1 (Chinese)</option>
                      <option value="qwen/qwen-2.5-72b-instruct" className="bg-zinc-900 text-zinc-100">Alibaba Qwen 2.5 72B (Chinese)</option>
                    </optgroup>
                    <optgroup label="High Performance Models (OpenRouter Key)" className="bg-zinc-900 text-amber-400 font-bold">
                      <option value="anthropic/claude-3.5-sonnet" className="bg-zinc-900 text-zinc-100">Anthropic Claude 3.5 Sonnet</option>
                      <option value="openai/gpt-4o" className="bg-zinc-900 text-zinc-100">OpenAI GPT-4o</option>
                    </optgroup>
                  </>
                )}
                <optgroup label="Custom Models" className="bg-zinc-900 text-purple-400 font-bold">
                  <option value="custom" className="bg-zinc-900 text-zinc-100">Custom Model (Enter Ref)...</option>
                </optgroup>
              </select>
            </div>
            {(
              availableModels.length > 0 
                ? (!availableModels.find(m => m.id === selectedModel) || selectedModel === '')
                : (![
                    'gemini-1.5-flash', 'gemini-1.5-pro', 
                    'google/gemini-2.0-flash-lite-preview-02-05:free', 'meta-llama/llama-3.1-8b-instruct:free', 'qwen/qwen-2.5-7b-instruct:free', 'google/gemma-2-9b-it:free',
                    'deepseek/deepseek-chat', 'qwen/qwen-2.5-72b-instruct', 
                    'anthropic/claude-3.5-sonnet', 'openai/gpt-4o'
                  ].includes(selectedModel) || selectedModel === '')
            ) && (
              <input
                type="text"
                placeholder="e.g. qwen/qwen-2.5-72b-instruct"
                value={selectedModel === 'custom' ? '' : selectedModel}
                onChange={(e) => onSelectModel(e.target.value)}
                className="bg-zinc-900 border border-indigo-500/40 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-400 placeholder-zinc-500"
              />
            )}
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs">
            {isSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            ) : syncStatus === 'CLOUD_SYNCED' ? (
              <CloudCheck className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span className="text-zinc-300 font-medium">
              {isSyncing ? 'Syncing...' : syncStatus === 'CLOUD_SYNCED' ? 'Cloud Synced' : 'IndexedDB Local Store'}
            </span>
          </div>

          {/* Bot Audio Mute Toggle */}
          <button
            onClick={onToggleListening}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              state.isListening 
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30' 
                : 'bg-zinc-900 text-zinc-400 border-zinc-800'
            }`}
          >
            {state.isListening ? <Radio className="w-3.5 h-3.5 animate-ping text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-zinc-500" />}
            {state.isListening ? 'Bot Audio Active' : 'Bot Muted'}
          </button>

          <button
            onClick={handleCopyFeedbackLink}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md shadow-indigo-600/20"
          >
            {copiedLink ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> : <Share2 className="w-3.5 h-3.5" />}
            {copiedLink ? 'Link Copied!' : 'Copy Evaluation Link'}
          </button>
        </div>
      </div>



      {/* Device Microphone Transcription & Control Bar */}
      <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border ${
            isTranscribing 
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400 animate-pulse' 
              : 'bg-zinc-950 border-zinc-800 text-zinc-400'
          }`}>
            {isTranscribing ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-zinc-100">Device Microphone Input</h3>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                isTranscribing 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse' 
                  : 'bg-zinc-800 text-zinc-400'
              }`}>
                {isTranscribing ? 'MIC LISTENING LIVE' : 'MIC OFF'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isTranscribing 
                ? 'Mic active! Records continuously until you click Stop Device Mic or after 30s of complete silence.' 
                : hasValidKey 
                  ? 'Click Start Device Mic to begin continuous microphone speech recording.' 
                  : 'Real API Key HTTP Verification Required before starting microphone.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isTranscribing ? (
            <button
              onClick={stopTranscription}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-600/30"
            >
              <Square className="w-4 h-4 fill-white" />
              Stop Device Mic
            </button>
          ) : (
            <button
              onClick={handleStartMicWithCheck}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                hasValidKey 
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 cursor-pointer' 
                  : 'bg-zinc-900 border border-rose-500/60 text-rose-300 hover:bg-rose-950 cursor-pointer shadow-lg shadow-rose-950/40'
              }`}
            >
              {!hasValidKey ? <Lock className="w-4 h-4 text-rose-400 animate-bounce" /> : <Mic className="w-4 h-4" />}
              {hasValidKey ? 'Start Device Mic' : 'Key Verification Required to Start Mic'}
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800 text-xs">
          <button
            onClick={() => setActiveTab('MATRIX')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'MATRIX' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            Persona Matrix & Technical Query
          </button>
          <button
            onClick={() => setActiveTab('TRANSCRIPT')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'TRANSCRIPT' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
            Live Mic Speech Log ({state.transcripts.length})
          </button>
          <button
            onClick={() => setActiveTab('FEEDBACK')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'FEEDBACK' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
            Human Evaluation Log ({state.feedbacks.length})
          </button>
          <button
            onClick={() => setActiveTab('LLM_LOGS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'LLM_LOGS' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-purple-400" />
            Exposed LLM Call Logs (.json)
          </button>
          <button
            onClick={() => setActiveTab('ARCH')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'ARCH' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            Architecture
          </button>
        </div>

        <button
          onClick={exportFeedbackDatasetJSON}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-800 rounded-lg transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-indigo-400" />
          Export Dataset JSON
        </button>
      </div>

      {/* TAB 1: PERSONA MATRIX & TECHNICAL QUERY */}
      {activeTab === 'MATRIX' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Active Persona Selector & Profile */}
          <div className="space-y-4">
            <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Active Persona Target
                </span>
                <div className="flex gap-2">
                  {!isEditingPersona && (
                    <button 
                      onClick={handleStartEdit}
                      className="text-xs px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md transition-colors"
                    >
                      Edit Persona
                    </button>
                  )}
                  <span className="text-xs px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md">
                    Active Persona
                  </span>
                </div>
              </div>

              {isEditingPersona ? (
                <div className="space-y-3 pt-1">
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Persona Name"
                    className="w-full bg-zinc-950 border border-zinc-800 p-2 text-xs rounded text-zinc-100"
                  />
                  <input
                    type="text"
                    value={editRole}
                    onChange={e => setEditRole(e.target.value)}
                    placeholder="Role"
                    className="w-full bg-zinc-950 border border-zinc-800 p-2 text-xs rounded text-zinc-100"
                  />
                  <textarea
                    value={editBackground}
                    onChange={e => setEditBackground(e.target.value)}
                    placeholder="Background"
                    rows={3}
                    className="w-full bg-zinc-950 border border-zinc-800 p-2 text-xs rounded text-zinc-100"
                  />
                  <input
                    type="text"
                    value={editKeyTraits}
                    onChange={e => setEditKeyTraits(e.target.value)}
                    placeholder="Traits (comma separated)"
                    className="w-full bg-zinc-950 border border-zinc-800 p-2 text-xs rounded text-zinc-100"
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setIsEditingPersona(false)} className="px-3 py-1.5 bg-zinc-800 text-xs rounded text-zinc-300 hover:bg-zinc-700">Cancel</button>
                    <button onClick={handleSaveEditPersona} className="px-3 py-1.5 bg-indigo-600 text-xs rounded text-white hover:bg-indigo-500">Save</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 pt-1">
                    <img
                      src={activePersona.avatarUrl}
                      alt={activePersona.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500/40"
                    />
                    <div>
                      <h3 className="font-bold text-sm text-zinc-100">{activePersona.name}</h3>
                      <p className="text-xs text-indigo-400 font-medium">{activePersona.role}</p>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/80">
                    {activePersona.background}
                  </p>
                </>
              )}

              <div className="pt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-zinc-400">Persona Selector:</span>
                  <button 
                    onClick={() => setIsAddingPersona(!isAddingPersona)}
                    className="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-0.5 rounded transition-colors"
                  >
                    {isAddingPersona ? 'Cancel' : '+ Add Persona'}
                  </button>
                </div>
                
                {isAddingPersona && (
                  <div className="p-3 bg-zinc-950/80 rounded-lg border border-emerald-500/30 mb-3 space-y-2">
                    <span className="text-xs text-emerald-400 font-semibold block">Generate from CV/LinkedIn text:</span>
                    <textarea 
                      value={personaFormText}
                      onChange={e => setPersonaFormText(e.target.value)}
                      placeholder="Paste CV or LinkedIn profile text here to generate a persona..."
                      rows={4}
                      className="w-full bg-zinc-900 border border-zinc-700 p-2 text-xs rounded text-zinc-200 resize-none focus:border-emerald-500"
                    ></textarea>
                    {personaGenError && (
                      <p className="text-rose-400 text-[10px]">{personaGenError}</p>
                    )}
                    <button 
                      onClick={handleGeneratePersona}
                      disabled={isGeneratingPersona || !hasValidKey || !personaFormText.trim()}
                      className={`w-full py-1.5 rounded text-xs font-bold transition-colors ${
                        isGeneratingPersona || !hasValidKey || !personaFormText.trim()
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {isGeneratingPersona ? 'Generating (takes ~10s)...' : 'Generate Persona Profile'}
                    </button>
                  </div>
                )}

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {state.personas.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => onSwitchPersona(p)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium transition-all ${
                        p.id === activePersona.id
                          ? 'bg-indigo-600/20 border border-indigo-500/50 text-indigo-200'
                          : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                      }`}
                    >
                      <span>{p.name}</span>
                      <span className="text-[10px] text-zinc-500">{p.role}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Response Speech Duration & Latency Leeway Controls */}
            <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  Target Vocal Duration
                </span>
                <span className="text-xs font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/30">
                  {targetDurationSec}s Speech
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {[30, 45, 60, 90, 120].map((dur) => (
                  <button
                    key={dur}
                    onClick={() => setTargetDurationSec(dur)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                      targetDurationSec === dur
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {dur}s {dur === 45 && '(Default)'}
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-zinc-800/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5 text-amber-400" />
                    Latency Leeway Budget:
                  </span>
                  <span className="text-amber-400 font-semibold">{latencyLeeway} (High SLA)</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                  <button
                    onClick={() => setLatencyLeeway('LOW')}
                    className={`py-1 rounded text-center font-medium border ${
                      latencyLeeway === 'LOW' ? 'bg-zinc-800 border-indigo-500 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                    }`}
                  >
                    &lt;500ms
                  </button>
                  <button
                    onClick={() => setLatencyLeeway('MEDIUM')}
                    className={`py-1 rounded text-center font-medium border ${
                      latencyLeeway === 'MEDIUM' ? 'bg-zinc-800 border-indigo-500 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                    }`}
                  >
                    &lt;3000ms
                  </button>
                  <button
                    onClick={() => setLatencyLeeway('HIGH')}
                    className={`py-1 rounded text-center font-medium border ${
                      latencyLeeway === 'HIGH' ? 'bg-indigo-950 border-indigo-500 text-indigo-200' : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                    }`}
                  >
                    High Leeway
                  </button>
                </div>
              </div>
            </div>

            {/* Trait Matrix */}
            <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Key Persona Traits
              </span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {activePersona.keyTraits.map((trait, idx) => (
                  <span key={idx} className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded text-[11px] font-medium border border-zinc-700/60">
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Center Column: Microphone / Technical Query Panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-bold text-sm text-zinc-100">Technical Query & Debate Trigger</h3>
                </div>
                <span className="text-xs text-indigo-400 font-mono flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5" />
                  {selectedModel} ({targetDurationSec}s target)
                </span>
              </div>

              {/* Realtime Interim Spoken Voice Bar */}
              {isTranscribing && interimText && (
                <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 font-mono italic animate-pulse flex items-center gap-2">
                  <Mic className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                  Recognizing Voice: "{interimText}"
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs text-zinc-400 block font-medium">
                  Spoken Question or Debate Topic:
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder={hasValidKey ? `Speak into your device microphone or enter a detailed technical topic for ${activePersona.name}...` : 'API Key verification required before entering questions...'}
                  disabled={!hasValidKey}
                  rows={3}
                  className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-indigo-500/70 transition-all placeholder:text-zinc-600 resize-none font-sans font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">Sample Topics:</span>
                  <button
                    onClick={() => handleTrigger("What is your architectural position on training separate AI models for comparative theological texts like the Quran vs Bible?")}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] rounded-lg transition-colors font-medium"
                  >
                    Comparative AI Models
                  </button>
                  <button
                    onClick={() => handleTrigger("How do we optimize GPU WebGL matrix depth sorting for 3D Gaussian Splatting?")}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] rounded-lg transition-colors font-medium"
                  >
                    3D Splat Depth Sorting
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {/* Latency badge */}
                  {lastLatencyMs !== null && !isGenerating && (
                    <span className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-950/60 border border-amber-500/30 text-amber-300 text-[11px] font-mono font-semibold rounded-lg">
                      <Timer className="w-3.5 h-3.5" />
                      {lastLatencyMs < 1000 ? `${lastLatencyMs}ms` : `${(lastLatencyMs / 1000).toFixed(1)}s`}
                    </span>
                  )}
                  {isGenerating && (
                    <span className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-[11px] font-mono font-semibold rounded-lg animate-pulse">
                      <Timer className="w-3.5 h-3.5 animate-spin" />
                      Timing...
                    </span>
                  )}
                  <button
                    onClick={() => handleTrigger()}
                    disabled={isGenerating || !hasValidKey}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-lg ${
                      hasValidKey 
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 cursor-pointer' 
                        : 'bg-zinc-800 text-zinc-500 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    {isGenerating ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    ) : !hasValidKey ? (
                      <Lock className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {isGenerating 
                      ? `Synthesizing ${targetDurationSec}s Response...` 
                      : !hasValidKey 
                        ? 'Key Verification Required' 
                        : `Ask ${activePersona.name} (${targetDurationSec}s)`}
                  </button>
                </div>
              </div>

              {/* Latest Generated Bot Response Output */}
              {latestResponse && (() => {
                // Find all responses that have the exact same prompt as the latest one, to compare models.
                // We'll show the current one, plus any others that share the promptContext.
                const relatedResponses = state.botResponses.filter(
                  r => r.promptContext === latestResponse.promptContext && r.personaId === latestResponse.personaId
                );

                return (
                  <div className="mt-4 space-y-4">
                    {relatedResponses.map((response) => {
                      const isNotice = response.responseText.includes('[API KEY REQUIRED]') || 
                        response.responseText.includes('[REAL API KEY REQUIRED]') || 
                        response.responseText.includes('[MODEL ACCESS NOTICE]') || 
                        response.responseText.includes('[OPENROUTER API NOTICE]') ||
                        response.responseText.includes('[GEMINI API ERROR]') ||
                        response.responseText.includes('[INVALID API KEY]') ||
                        response.responseText.includes('Key Required');
                      
                      const isLatest = response.responseId === latestResponse.responseId;

                      return (
                        <div key={response.responseId} className={`p-4 bg-indigo-950/30 border ${isLatest ? 'border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border-indigo-500/20 opacity-80'} rounded-xl space-y-3`}>
                          {/* Topic being addressed */}
                          <div className="p-3 bg-zinc-900 border border-indigo-500/40 rounded-xl flex items-center justify-between flex-wrap gap-2 shadow-inner">
                            <div className="flex items-center gap-2">
                              <HelpCircle className="w-4 h-4 text-indigo-400" />
                              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Topic being addressed:</span>
                              <span className="text-xs font-extrabold text-indigo-200">
                                {response.topicAddressed || 'Geospatial Engineering & Local Storage'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {response.modelUsed && (
                                <span className="text-[11px] font-mono font-bold text-pink-300 bg-pink-950/60 px-2 py-0.5 rounded border border-pink-500/30">
                                  Model: {response.modelUsed}
                                </span>
                              )}
                              {isLatest && lastLatencyMs !== null && (
                                <span className="text-[11px] font-mono font-semibold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                                  <Timer className="w-3 h-3" />
                                  {lastLatencyMs < 1000 ? `${lastLatencyMs}ms` : `${(lastLatencyMs / 1000).toFixed(1)}s`}
                                </span>
                              )}
                              <span className="text-[11px] font-mono font-semibold text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-500/30">
                                {response.responseText.split(/\s+/).length} Words (~{targetDurationSec}s Speech)
                              </span>
                              <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded border ${
                                isNotice 
                                  ? 'text-amber-400 bg-amber-950/60 border-amber-500/40'
                                  : 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30'
                              }`}>
                                {response.alignmentConfidence}% Alignment Confidence
                              </span>
                              {/* Speak button */}
                              {!isNotice && 'speechSynthesis' in window && (
                                <button
                                  onClick={() => handleSpeak(response.responseText)}
                                  title={isSpeaking ? 'Stop speaking' : 'Speak this response'}
                                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
                                    isSpeaking
                                      ? 'bg-emerald-600 border-emerald-500 text-white animate-pulse'
                                      : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-300'
                                  }`}
                                >
                                  {isSpeaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                                  {isSpeaking ? 'Stop' : 'Speak'}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Direct Answer Output / Notice Block */}
                          {isNotice ? (
                            <div className="p-4 bg-amber-950/40 border border-amber-500/50 rounded-xl text-xs text-amber-200 leading-relaxed font-sans space-y-3">
                              <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                                API Key Required Notice
                              </div>
                              <p className="whitespace-pre-wrap font-mono text-[11px] text-amber-100">{response.responseText}</p>
                            </div>
                          ) : (
                            <div className="p-4 bg-zinc-950/90 rounded-xl border border-zinc-800 text-xs text-zinc-100 leading-relaxed font-sans whitespace-pre-wrap space-y-2">
                              {response.responseText}
                            </div>
                          )}

                          {/* Evaluation Action */}
                          {!isNotice && (
                            <div className="pt-2 border-t border-indigo-500/20">
                              {response.feedbackSubmitted ? (
                                <div className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Feedback submitted for this model's response
                                </div>
                              ) : activeFeedbackResponseId === response.responseId ? (
                                <form onSubmit={handleAddFeedback} className="p-4 bg-zinc-900 border border-indigo-500/30 rounded-lg space-y-3 mt-2">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-zinc-200">Evaluate {response.modelUsed || 'this'} Response</h4>
                                    <button type="button" onClick={() => setActiveFeedbackResponseId(null)} className="text-[10px] text-zinc-400 hover:text-zinc-200">Cancel</button>
                                  </div>

                                  {/* Evaluator dropdown list */}
                                  <div className="space-y-1.5">
                                    <label className="text-[11px] text-zinc-400 flex items-center gap-1">
                                      Evaluator:
                                    </label>
                                    <div className="flex gap-2 items-center">
                                      <select
                                        value={evaluatorName}
                                        onChange={(e) => {
                                          if (e.target.value === '__add_new__') {
                                            setIsAddingEvaluator(true);
                                          } else {
                                            setEvaluatorName(e.target.value);
                                            setIsAddingEvaluator(false);
                                          }
                                        }}
                                        className="flex-1 p-2 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                                      >
                                        {/* Default: persona name */}
                                        <option value={activePersona.name}>{activePersona.name} (Persona)</option>
                                        {evaluatorList.map((ev) => (
                                          <option key={ev} value={ev}>{ev}</option>
                                        ))}
                                        <option value="__add_new__">+ Add New Evaluator...</option>
                                      </select>
                                    </div>
                                    {isAddingEvaluator && (
                                      <div className="flex gap-2 mt-1">
                                        <input
                                          type="text"
                                          value={newEvaluatorInput}
                                          onChange={(e) => setNewEvaluatorInput(e.target.value)}
                                          onKeyDown={(e) => e.key === 'Enter' && handleAddEvaluator()}
                                          placeholder="Enter evaluator name..."
                                          className="flex-1 p-2 bg-zinc-950 border border-emerald-500/50 rounded text-xs text-zinc-100 focus:outline-none"
                                          autoFocus
                                        />
                                        <button
                                          type="button"
                                          onClick={handleAddEvaluator}
                                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold flex items-center gap-1"
                                        >
                                          <UserPlus className="w-3 h-3" /> Add
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => { setIsAddingEvaluator(false); setNewEvaluatorInput(""); }}
                                          className="px-2 py-1.5 bg-zinc-800 text-zinc-400 rounded text-xs hover:text-zinc-200"
                                        >Cancel</button>
                                      </div>
                                    )}
                                  </div>

                                  <div className="space-y-1.5">
                                    <label className="text-[11px] text-zinc-400">Rating (1-5 Stars):</label>
                                    <div className="flex gap-1.5">
                                      {[1, 2, 3, 4, 5].map((score) => (
                                        <button
                                          type="button"
                                          key={score}
                                          onClick={() => setNewFeedbackScore(score)}
                                          className={`w-7 h-7 rounded text-[10px] font-bold transition-all ${
                                            newFeedbackScore === score
                                              ? 'bg-indigo-600 text-white'
                                              : 'bg-zinc-950 border border-zinc-700 text-zinc-400 hover:text-white'
                                          }`}
                                        >
                                          {score}★
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-[11px] text-zinc-400">Comments:</label>
                                    <textarea
                                      value={newFeedbackComment}
                                      onChange={(e) => setNewFeedbackComment(e.target.value)}
                                      placeholder="How well did this capture the persona?"
                                      rows={2}
                                      className="w-full p-2 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-100 focus:outline-none focus:border-indigo-500 resize-none"
                                    />
                                  </div>
                                  <button type="submit" className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-all shadow-md">
                                    Submit Evaluation
                                  </button>
                                </form>
                              ) : (
                                <button 
                                  onClick={() => setActiveFeedbackResponseId(response.responseId)}
                                  className="text-xs px-3 py-1.5 bg-zinc-900 border border-zinc-700 hover:border-indigo-500 text-zinc-300 hover:text-indigo-300 rounded transition-colors flex items-center gap-1.5"
                                >
                                  <ThumbsUp className="w-3 h-3" />
                                  Rate this Response
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Performance Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl text-center">
                <span className="text-[11px] text-zinc-400 font-medium block">Interactions</span>
                <span className="text-lg font-black text-zinc-100">{state.stats.totalInteractions}</span>
              </div>
              <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl text-center">
                <span className="text-[11px] text-zinc-400 font-medium block">Match Rate</span>
                <span className="text-lg font-black text-emerald-400">{feedbackStats.matchRatePercentage}%</span>
              </div>
              <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl text-center">
                <span className="text-[11px] text-zinc-400 font-medium block">Mic Transcripts</span>
                <span className="text-lg font-black text-indigo-400">{state.stats.transcriptsProcessed}</span>
              </div>
              <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl text-center">
                <span className="text-[11px] text-zinc-400 font-medium block">Avg Alignment</span>
                <span className="text-lg font-black text-amber-400">{state.stats.avgAlignmentScore} / 5</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE TRANSCRIPT FEED */}
      {activeTab === 'TRANSCRIPT' && (
        <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-200">Device Microphone Speech Log</span>
              {isTranscribing && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </div>
            <span className="text-xs text-zinc-500">Direct Device Mic Mode</span>
          </div>

          {isTranscribing && interimText && (
            <div className="p-2.5 bg-emerald-950/30 border border-emerald-500/30 rounded-lg text-xs text-emerald-200 font-mono italic animate-pulse">
              Listening... "{interimText}"
            </div>
          )}

          {state.transcripts.length === 0 ? (
            <div className="p-8 text-center bg-zinc-950 rounded-xl border border-zinc-800/80 space-y-2">
              <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-xs text-zinc-400 font-medium">No device microphone speech recorded yet.</p>
              <p className="text-[11px] text-zinc-500">
                Click <span className="text-emerald-400 font-semibold">Start Device Mic</span> above to speak into your microphone.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {state.transcripts.map((t: TranscriptEntry) => (
                <div
                  key={t.transcriptId}
                  className={`p-3 rounded-xl border text-xs leading-relaxed transition-all ${
                    t.speakerRole === 'bot'
                      ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-100'
                      : 'bg-zinc-950 border-zinc-800/80 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-bold ${t.speakerRole === 'bot' ? 'text-indigo-400' : 'text-zinc-200'}`}>
                      {t.speaker}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {new Date(t.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p>{t.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: HUMAN ALIGNMENT FEEDBACK FORM */}
      {activeTab === 'FEEDBACK' && (
        <div className="space-y-6">
          <div className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-zinc-100">Participant Feedback Log</h3>
              <span className="text-xs text-indigo-400">GetBack2Basics Benchmark</span>
            </div>
            {state.feedbacks.length === 0 ? (
              <p className="text-xs text-zinc-500 italic p-4 text-center">No evaluations logged yet. Ask a question and submit feedback from the Matrix tab.</p>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {state.feedbacks.map((fb) => {
                  const linkedResponse = state.botResponses.find(r => r.responseId === fb.responseId);
                  return (
                    <div key={fb.feedbackId} className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-xs space-y-3">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-200">{fb.evaluatorName}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">{new Date(fb.submittedAt).toLocaleString()}</span>
                        </div>
                        <span className="text-emerald-400 font-bold bg-emerald-950/30 px-2 py-1 rounded">{fb.alignmentScore} / 5 ★</span>
                      </div>
                      
                      {linkedResponse && (
                        <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/80 space-y-2">
                          <div>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase">User Prompt:</span>
                            <p className="text-zinc-300 italic">"{linkedResponse.promptContext}"</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase">Model Used:</span>
                            <span className="ml-2 text-[10px] font-mono font-bold text-pink-300">{linkedResponse.modelUsed || 'Unknown'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase">Response Snippet:</span>
                            <p className="text-zinc-400 mt-1 line-clamp-3">{linkedResponse.responseText}</p>
                          </div>
                        </div>
                      )}

                      <div className="pt-1">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">Evaluator Comments:</span>
                        <p className="text-indigo-200 font-medium mt-1">"{fb.comments}"</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: EXPOSED LLM CALL LOGS */}
      {activeTab === 'LLM_LOGS' && (
        <div className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-purple-400" />
              Exposed LLM Call Traces (`src/assets/llm_calls/*.json`)
            </h3>
            <span className="text-xs text-purple-300 font-mono">3 Exposed JSON Endpoints</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
              <span className="font-mono text-xs text-indigo-400 font-bold block">persona_response_generation.json</span>
              <pre className="text-[10px] text-zinc-300 font-mono bg-zinc-900 p-2.5 rounded border border-zinc-800 max-h-56 overflow-y-auto whitespace-pre-wrap">
                {JSON.stringify(personaResponseGenTrace, null, 2)}
              </pre>
            </div>

            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
              <span className="font-mono text-xs text-emerald-400 font-bold block">persona_alignment_evaluation.json</span>
              <pre className="text-[10px] text-zinc-300 font-mono bg-zinc-900 p-2.5 rounded border border-zinc-800 max-h-56 overflow-y-auto whitespace-pre-wrap">
                {JSON.stringify(personaAlignTrace, null, 2)}
              </pre>
            </div>

            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
              <span className="font-mono text-xs text-amber-400 font-bold block">transcript_context_processing.json</span>
              <pre className="text-[10px] text-zinc-300 font-mono bg-zinc-900 p-2.5 rounded border border-zinc-800 max-h-56 overflow-y-auto whitespace-pre-wrap">
                {JSON.stringify(transcriptCtxTrace, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ARCHITECTURE OVERVIEW */}
      {activeTab === 'ARCH' && (
        <div className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-4 text-xs leading-relaxed text-zinc-300">
          <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            Technical Synthesis & Latency Budget Architecture
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-zinc-300">
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-1.5">
              <span className="font-bold text-indigo-400 block">1. Real Provider Ping Verification</span>
              <p className="text-[11px] text-zinc-400">Pings Google Gemini or OpenRouter endpoints (HTTP 200 OK) before unlocking key verification.</p>
            </div>
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-1.5">
              <span className="font-bold text-amber-400 block">2. Strict Prefix Format Rules</span>
              <p className="text-[11px] text-zinc-400">Keys must start with 'AIza...' (Gemini) or 'sk-or-...' (OpenRouter). Pseudo-keys are rejected.</p>
            </div>
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-1.5">
              <span className="font-bold text-emerald-400 block">3. Multi-Model Gemini & OpenRouter Engine</span>
              <p className="text-[11px] text-zinc-400">Supports Gemini 1.5 Flash, Gemini 1.5 Pro, DeepSeek, Qwen Chinese, Claude 3.5, and GPT-4o.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
