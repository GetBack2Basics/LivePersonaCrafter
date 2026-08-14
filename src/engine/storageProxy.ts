import type { EngineState, PersonaProfile, TranscriptEntry, LlmCallTrace } from '../types';
import { INITIAL_PERSONAS, INITIAL_SESSION, INITIAL_TRANSCRIPTS, INITIAL_BOT_RESPONSES, INITIAL_FEEDBACKS } from '../data/initialData';
import { parseQuestionFromTranscript } from '../utils/transcriptParser';

const LOCAL_STORAGE_KEY = 'MEET_PERSONA_AI_STATE_V15';
const USER_API_KEY_STORAGE_KEY = 'MEET_PERSONA_USER_API_KEY';
const KEY_VERIFIED_STORAGE_KEY = 'MEET_PERSONA_KEY_VERIFIED_V1';

export function getUserApiKey(): string {
  try {
    if (typeof localStorage === 'undefined') return '';
    return (localStorage.getItem(USER_API_KEY_STORAGE_KEY) || '').trim();
  } catch {
    return '';
  }
}

export function isApiKeyVerifiedLocally(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(KEY_VERIFIED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setUserApiKey(key: string, isVerified: boolean = false): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const clean = key.trim();
    localStorage.setItem(USER_API_KEY_STORAGE_KEY, clean);
    localStorage.setItem(KEY_VERIFIED_STORAGE_KEY, isVerified ? 'true' : 'false');
  } catch (e) {
    console.warn('Failed to save user API Key:', e);
  }
}

export interface ApiModel {
  id: string;
  name: string;
  group: 'Free' | 'Cheap' | 'Medium' | 'Top' | 'Gemini';
}

/**
 * Real API Key verification test against official Gemini or OpenRouter endpoints.
 */
export async function validateApiKey(key: string, provider: 'openrouter' | 'gemini' = 'gemini'): Promise<{ isValid: boolean; provider: string; message: string; models?: ApiModel[] }> {
  const clean = key.trim();
  if (!clean) {
    setUserApiKey('', false);
    return { isValid: false, provider: 'None', message: `API Key is empty. Please enter your ${provider === 'gemini' ? 'Gemini' : 'OpenRouter'} Key.` };
  }

  // 1. Determine which API to hit based on explicit provider dropdown
  const isGeminiProvider = provider === 'gemini';
  const isOpenRouterProvider = provider === 'openrouter';

  // 2. Real Gemini API Ping Test
  if (isGeminiProvider) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${clean}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setUserApiKey(clean, true);
        
        let models: ApiModel[] = [];
        if (data.models && Array.isArray(data.models)) {
          models = data.models
            .filter((m: any) => m.name.includes('gemini') && m.supportedGenerationMethods.includes('generateContent'))
            .map((m: any) => ({
              id: m.name.replace('models/', ''),
              name: m.displayName || m.name,
              group: 'Gemini' as const
            }));
        }
        
        return { isValid: true, provider: 'Gemini API', message: 'Gemini API Key Verified & Active (HTTP 200 OK)!', models };
      }
      const data = await res.json().catch(() => ({}));
      const errMsg = data?.error?.message || `HTTP ${res.status} Unauthorized`;
      setUserApiKey(clean, false);
      return { isValid: false, provider: 'Gemini API', message: `Gemini Key Validation Failed: ${errMsg}` };
    } catch (e: any) {
      setUserApiKey(clean, false);
      return { isValid: false, provider: 'Gemini API', message: `Gemini Key Ping Error: ${e?.message || 'Network error'}` };
    }
  }

  // 3. Real OpenRouter API Ping Test
  if (isOpenRouterProvider) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { Authorization: `Bearer ${clean}` }
      });
      if (res.ok) {
        const data = await res.json();
        const label = data?.data?.label ? ` (${data.data.label})` : '';
        setUserApiKey(clean, true);

        // Fetch OpenRouter Models
        let models: ApiModel[] = [];
        try {
          const modelsRes = await fetch('https://openrouter.ai/api/v1/models');
          if (modelsRes.ok) {
            const modelsData = await modelsRes.json();
            if (modelsData.data && Array.isArray(modelsData.data)) {
              const allModels = modelsData.data.map((m: any) => {
                const promptPrice = parseFloat(m.pricing?.prompt || '0');
                const completionPrice = parseFloat(m.pricing?.completion || '0');
                const totalPrice = promptPrice + completionPrice;
                return {
                  id: m.id,
                  name: m.name,
                  price: totalPrice,
                  isFree: m.id.endsWith(':free') || totalPrice === 0
                };
              });

              const VERIFIED_FREE_MODEL_IDS = [
                'google/gemini-2.0-flash-lite-preview-02-05:free',
                'meta-llama/llama-3.3-70b-instruct:free',
                'google/gemma-2-9b-it:free',
                'qwen/qwen-2.5-72b-instruct:free',
                'deepseek/deepseek-r1:free'
              ];
              const freeCandidates = allModels.filter((m: any) => {
                if (!m.isFree) return false;
                const idLower = (m.id || '').toLowerCase();
                if (idLower.includes('dots-studio') || idLower.includes('auto-beta') || idLower.includes('dummy') || idLower.includes('test')) {
                  return false;
                }
                return true;
              });
              freeCandidates.sort((a: any, b: any) => {
                const indexA = VERIFIED_FREE_MODEL_IDS.indexOf(a.id);
                const indexB = VERIFIED_FREE_MODEL_IDS.indexOf(b.id);
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;
                return 0;
              });
              const freeModels = freeCandidates.slice(0, 5).map((m: any) => ({ ...m, group: 'Free' as const }));
              
              const paidModels = allModels.filter((m: any) => !m.isFree).sort((a: any, b: any) => a.price - b.price);
              const totalPaid = paidModels.length;
              
              const cheapModels = paidModels.slice(0, 3).map((m: any) => ({ ...m, group: 'Cheap' as const }));
              const topModels = paidModels.slice(totalPaid - 3).map((m: any) => ({ ...m, group: 'Top' as const }));
              const midIndex = Math.floor(totalPaid / 2);
              const mediumModels = paidModels.slice(midIndex, midIndex + 3).map((m: any) => ({ ...m, group: 'Medium' as const }));

              models = [...freeModels, ...cheapModels, ...mediumModels, ...topModels].map(m => ({ id: m.id, name: m.name, group: m.group }));
            }
          }
        } catch (e) {
          console.warn('Failed to fetch OpenRouter models:', e);
        }

        return { isValid: true, provider: 'OpenRouter API', message: `OpenRouter Key Verified & Active${label} (HTTP 200 OK)!`, models };
      }
      const data = await res.json().catch(() => ({}));
      const errMsg = data?.error?.message || `HTTP ${res.status} Unauthorized`;
      setUserApiKey(clean, false);
      return { isValid: false, provider: 'OpenRouter API', message: `OpenRouter Key Validation Failed: ${errMsg}` };
    } catch (e: any) {
      setUserApiKey(clean, false);
      return { isValid: false, provider: 'OpenRouter API', message: `OpenRouter Key Ping Error: ${e?.message || 'Network error'}` };
    }
  }

  setUserApiKey(clean, false);
  return { isValid: false, provider: 'Unknown', message: 'API key validation failed.' };
}

export function buildCombinedTranscriptContext(prompt: string, recentTranscripts: TranscriptEntry[]): string {
  const humanEntries = (recentTranscripts || [])
    .filter(t => t.speakerRole === 'human' && t.text && t.text.trim())
    .map(t => t.text.trim());

  if (prompt && prompt.trim()) {
    const pTrim = prompt.trim();
    if (!humanEntries.includes(pTrim)) {
      humanEntries.push(pTrim);
    }
  }

  if (humanEntries.length === 0) {
    return 'General Software Architecture & Local-First Systems';
  }

  return humanEntries.join(' ');
}

export function extractTopicFromPrompt(fullContextText: string): string {
  const p = fullContextText.trim();
  if (!p) return 'General Software Architecture & Systems';
  const lower = p.toLowerCase();

  if (lower.includes('quran') || lower.includes('bible') || lower.includes('koran') || lower.includes('theological') || lower.includes('secondary literature') || lower.includes('cross') || lower.includes('etymology')) {
    return 'Training Separate AI Models on Comparative Literature & Theological Texts (Quran vs Bible)';
  }
  if (lower.includes('splat') || lower.includes('3d') || lower.includes('gaussian') || lower.includes('depth sort')) {
    return 'GPU WebWorker Depth Sorting for 3D Gaussian Splatting';
  }
  if (lower.includes('spatial') || lower.includes('gis') || lower.includes('gda94') || lower.includes('gda2020') || lower.includes('coordinate')) {
    return 'Local-First Spatial Querying & Coordinate Reprojections';
  }
  if (lower.includes('storage') || lower.includes('indexeddb') || lower.includes('offline') || lower.includes('sync')) {
    return 'Balancing Local-First Offline Storage with Cloud Persistence';
  }
  
  const clean = p
    .replace(/^(can you|could you|tell me|what is|how do|how would|what's|please explain|what do you think about|how to)\s+/i, '')
    .replace(/[?.!]+$/, '')
    .trim();

  if (!clean) return 'System Architecture & Data Pipelines';
  return clean.length > 70 ? clean.slice(0, 67) + '...' : clean.charAt(0).toUpperCase() + clean.slice(1);
}

export function calculateTargetWords(durationSec: number): { targetWordCount: number; minWords: number; maxWords: number; maxTokens: number } {
  if (durationSec <= 20) return { targetWordCount: 45, minWords: 40, maxWords: 55, maxTokens: 180 };
  if (durationSec <= 35) return { targetWordCount: 85, minWords: 75, maxWords: 100, maxTokens: 300 };
  if (durationSec <= 50) return { targetWordCount: 130, minWords: 115, maxWords: 150, maxTokens: 450 };
  if (durationSec <= 75) return { targetWordCount: 175, minWords: 160, maxWords: 200, maxTokens: 600 };
  if (durationSec <= 105) return { targetWordCount: 260, minWords: 235, maxWords: 290, maxTokens: 850 };
  return { targetWordCount: 350, minWords: 315, maxWords: 390, maxTokens: 1100 };
}

export function calculateClientAlignmentScore(responseText: string, persona: PersonaProfile, targetDurationSec: number = 45): number {
  if (!responseText || responseText.includes('[API KEY REQUIRED]') || responseText.includes('[API ERROR]')) return 0;
  const textLower = responseText.toLowerCase();
  let matchedCount = 0;
  if (persona.keyTraits && Array.isArray(persona.keyTraits)) {
    for (const trait of persona.keyTraits) {
      const words = trait.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      if (words.some(w => textLower.includes(w))) matchedCount++;
    }
  }
  const { targetWordCount, minWords } = calculateTargetWords(targetDurationSec);
  const actualWords = responseText.split(/\s+/).filter(Boolean).length;
  let lengthRatio = 1.0;
  if (actualWords < minWords) {
    lengthRatio = actualWords / minWords;
  } else if (actualWords > targetWordCount * 1.25) {
    lengthRatio = (targetWordCount * 1.25) / actualWords;
  }
  const lengthScore = Math.round(lengthRatio * 40);
  const totalTraits = persona.keyTraits?.length || 1;
  const traitScore = Math.min((matchedCount / totalTraits) * 40, 40);
  const relevanceScore = textLower.length > 50 ? 20 : 10;
  return Math.max(Math.min(Math.round(lengthScore + traitScore + relevanceScore), 99), 60);
}

/**
 * Helper to parse core_question strictly from JSON output returned by LLM.
 */
export function parseCoreQuestionFromJsonResponse(rawJsonText: string): string | null {
  if (!rawJsonText) return null;
  const cleaned = rawJsonText.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed.core_question === 'string' && parsed.core_question.trim()) {
      return parsed.core_question.trim();
    }
  } catch {
    const match = cleaned.match(/"core_question"\s*:\s*"([^"]+)"/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // Direct text fallback if model responded with plain question text
  if (cleaned && !cleaned.startsWith('{') && cleaned.length > 5) {
    return cleaned.replace(/^["']|["']$/g, '').trim();
  }

  return null;
}

/**
 * LLM Call 1: Intelligently extract and synthesize the single most important
 * core question driving the provided raw audio transcript text using an AI call.
 */
export async function extractQuestionViaLLM(
  rawTranscript: string,
  _personaName: string,
  _personaRole: string,
  selectedModel: string = 'google/gemini-2.0-flash-lite-preview-02-05:free'
): Promise<{ extractedQuestion: string; llmCallTrace: LlmCallTrace }> {
  const startTime = Date.now();
  const userApiKey = getUserApiKey();
  const selectedProvider = localStorage.getItem('LPC_API_PROVIDER') || (userApiKey.startsWith('AIza') ? 'gemini' : 'openrouter');

  const promptText = `Extract the single most important core question driving the provided text. Return the result strictly in valid JSON format using the schema below, without any markdown formatting, preamble, or commentary.

JSON Schema:
{
  "core_question": "string"
}

Text:
${rawTranscript}`;

  let extractedQuestion = '';

  const isOpenRouterKey = userApiKey.startsWith('sk-or-');
  const isGeminiKey = userApiKey.startsWith('AIza');
  const isGeminiProvider = isGeminiKey || (selectedProvider === 'gemini' && !isOpenRouterKey);

  try {
    if (isGeminiProvider) {
      let chosenModel = selectedModel.replace(/^(google\/|models\/)/i, '').trim();
      if (!chosenModel || chosenModel.includes('/')) chosenModel = 'gemini-1.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${chosenModel}:generateContent?key=${userApiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 150,
            responseMimeType: 'application/json'
          }
        })
      });
      if (response.ok) {
        const data = await response.json();
        const rawJsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        extractedQuestion = parseCoreQuestionFromJsonResponse(rawJsonText) || '';
      } else {
        const errBody = await response.text().catch(() => '');
        console.warn(`Gemini Question Extraction API call failed (${response.status}):`, errBody);
      }
    } else {
      const openRouterModelId = getOpenRouterModelId(selectedModel);
      let response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userApiKey}`,
          'HTTP-Referer': 'https://meetpersona.ai',
          'X-Title': 'MeetPersona AI',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: openRouterModelId,
          messages: [
            { role: 'user', content: promptText }
          ],
          max_tokens: 150,
          temperature: 0.1
        })
      });

      // Automatic fallback retry if selected model on OpenRouter is rate-limited (429) or returns error
      if (!response.ok && openRouterModelId !== 'google/gemini-2.0-flash-lite-preview-02-05:free') {
        const errBody = await response.text().catch(() => '');
        console.warn(`[MeetPersona AI] OpenRouter notice for ${openRouterModelId} (${response.status}): ${errBody}. Retrying question extraction with google/gemini-2.0-flash-lite-preview-02-05:free...`);
        response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userApiKey}`,
            'HTTP-Referer': 'https://meetpersona.ai',
            'X-Title': 'MeetPersona AI',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'google/gemini-2.0-flash-lite-preview-02-05:free',
            messages: [
              { role: 'user', content: promptText }
            ],
            max_tokens: 150,
            temperature: 0.1
          })
        });
      }

      if (response.ok) {
        const data = await response.json();
        const rawJsonText = data?.choices?.[0]?.message?.content?.trim() || '';
        extractedQuestion = parseCoreQuestionFromJsonResponse(rawJsonText) || '';
      } else {
        const errBody = await response.text().catch(() => '');
        console.warn(`OpenRouter Question Extraction API call failed (${response.status}):`, errBody);
      }
    }
  } catch (e) {
    console.warn('Question extraction LLM call exception:', e);
  }

  // Fallback to local heuristic question parser ONLY if LLM returns empty/failed
  if (!extractedQuestion) {
    extractedQuestion = parseQuestionFromTranscript(rawTranscript);
  }

  const llmCallTrace: LlmCallTrace = {
    traceId: `trace-qe-${Date.now()}`,
    type: 'QUESTION_EXTRACTION',
    model: selectedModel,
    systemPrompt: promptText,
    userMessage: rawTranscript,
    rawResponse: extractedQuestion,
    latencyMs: Date.now() - startTime,
    timestamp: new Date().toISOString()
  };

  return { extractedQuestion, llmCallTrace };
}

export function buildSystemPrompt(
  persona: PersonaProfile, 
  recentTranscripts: TranscriptEntry[],
  targetDurationSec: number = 45,
  fullCombinedContext?: string
): string {
  const quotesStr = persona.sampleQuotes ? persona.sampleQuotes.map(q => `"${q}"`).join('\n- ') : '';
  const traitsStr = persona.keyTraits ? persona.keyTraits.join(', ') : '';
  const { targetWordCount, minWords, maxWords } = calculateTargetWords(targetDurationSec);

  const dialogueHistory = recentTranscripts && recentTranscripts.length > 0
    ? recentTranscripts.map(t => `[${t.speakerRole.toUpperCase()}] ${t.speaker}: ${t.text}`).join('\n')
    : 'No prior dialogue.';

  return `SYSTEM DIRECTIVE: You are GetBack2Basics, a pragmatic Geospatial AI, Local-First Systems, and Text/Language Engineering Developer engaged in a live technical debate.

=== PERSONA PROFILE & TECHNICAL EXPERIENCE ===
Name: ${persona.name}
Role: ${persona.role}
Background: ${persona.background}
Core Technical Experience:
- Local-first architecture, offline IndexedDB persistence, R-Tree spatial indexing.
- Local AI text processing engines, vector embeddings, RAG indexing on theological/literary corpora (BibleStudy-Crafter).
- Multi-model orchestration, training domain-isolated AI models, comparative literature analysis.
- 3D Gaussian Splatting rendering, WebGL & WebGPU depth sorting offloaded to workers.
- Enterprise spatial metadata discovery, CRS reprojections (GDA94 to GDA2020).

Tone: ${persona.tone}
Speech Pattern: ${persona.speechPattern}
Key Traits: ${traitsStr}
System Directive: ${persona.systemPrompt}

=== CHARACTERISTIC QUOTES ===
- ${quotesStr}

=== FULL RECENT SPOKEN AUDIO TRANSCRIPT HISTORY ===
${fullCombinedContext || dialogueHistory}

=== MANDATORY INSTRUCTIONS FOR DEBATE RESPONSE ===
1. READ THE ENTIRE SPOKEN AUDIO TRANSCRIPT HISTORY AND PERSONA DETAILS CAREFULLY AND RESPOND DIRECTLY TO THE SPECIFIC SUBJECT BEING DEBATED.
2. Ground your response ONLY in general real factual information combined with ${persona.name}'s authentic technical profile, traits, and background. Do not fabricate unverified or fake facts.
3. DO NOT repeat or echo the user's question or prompt as filler text. Start directly with your technical position.
4. DO NOT use rigid headers, section labels, or template tags. Speak naturally in authentic first person.
5. DO NOT output specific project repository names UNLESS the user explicitly asks about those projects by name in their prompt.
6. CRITICAL LENGTH RULE: Provide a response strictly between ${minWords} and ${maxWords} words (~${targetDurationSec} seconds of spoken vocal delivery). Do NOT exceed ${maxWords} words under any circumstances. Stop as soon as you complete ~${targetWordCount} words.`;
}

export function getOpenRouterModelId(selectedModel: string): string {
  if (!selectedModel) return 'google/gemini-2.0-flash-lite-preview-02-05:free';
  if (selectedModel.includes('/')) return selectedModel;
  
  // Legacy fallbacks and model mappings
  switch (selectedModel) {
    case 'deepseek-r1-free': return 'deepseek/deepseek-r1:free';
    case 'llama-3.3-70b-free': return 'meta-llama/llama-3.3-70b-instruct:free';
    case 'qwen-2.5-72b-free': return 'qwen/qwen-2.5-72b-instruct:free';
    case 'deepseek-chat': return 'deepseek/deepseek-chat';
    case 'qwen-2.5-72b': return 'qwen/qwen-2.5-72b-instruct';
    case 'claude-3.5-sonnet': return 'anthropic/claude-3.5-sonnet';
    case 'gpt-4o': return 'openai/gpt-4o';
    case 'gemma-2-9b-free': return 'google/gemma-2-9b-it:free';
    case 'gemini-2.5-flash': return 'google/gemini-2.5-flash';
    case 'gemini-2.0-flash': return 'google/gemini-2.0-flash-lite-preview-02-05:free';
    case 'gemini-1.5-flash': return 'google/gemini-flash-1.5';
    case 'gemini-1.5-pro': return 'google/gemini-pro-1.5';
    default:
      if (selectedModel.includes('gemini-2.5')) return 'google/gemini-2.5-flash';
      if (selectedModel.includes('gemini-2.0')) return 'google/gemini-2.0-flash-lite-preview-02-05:free';
      if (selectedModel.includes('gemini')) return 'google/gemini-flash-1.5';
      return 'google/gemma-2-9b-it:free';
  }
}

export class StorageProxy {
  public static loadInitialState(): EngineState {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (
          parsed && 
          parsed.session && 
          parsed.personas && 
          Array.isArray(parsed.personas) &&
          parsed.personas.some((p: any) => p.name === 'GetBack2Basics')
        ) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('LocalStorage state parse failed, reinitializing defaults.', e);
    }

    const defaultState: EngineState = {
      session: INITIAL_SESSION,
      personas: INITIAL_PERSONAS,
      activePersona: INITIAL_PERSONAS[0],
      transcripts: INITIAL_TRANSCRIPTS,
      botResponses: INITIAL_BOT_RESPONSES,
      feedbacks: INITIAL_FEEDBACKS,
      stats: {
        totalInteractions: INITIAL_BOT_RESPONSES.length,
        avgAlignmentScore: 5.0,
        transcriptsProcessed: INITIAL_TRANSCRIPTS.length,
        activeSessionDurationSec: 3600,
        lastResponseLatencyMs: 380,
        openRouterStatus: 'ONLINE'
      },
      isListening: false,
      isSimulating: false
    };

    StorageProxy.saveState(defaultState);
    return defaultState;
  }

  public static saveState(state: EngineState): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save engine state to localStorage:', e);
    }
  }

  public static async queryBackendHealth(): Promise<{ status: string; geminiConfigured: boolean; openRouterConfigured: boolean }> {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      return {
        status: data.status,
        geminiConfigured: Boolean(data.geminiConfigured),
        openRouterConfigured: Boolean(data.openRouterConfigured)
      };
    } catch {
      return { status: 'OFFLINE', geminiConfigured: false, openRouterConfigured: false };
    }
  }

  public static async generatePersonaResponse(
    persona: PersonaProfile,
    contextPrompt: string,
    recentTranscripts: TranscriptEntry[],
    selectedModel: string = 'google/gemma-2-9b-it:free',
    targetDurationSec: number = 45
  ): Promise<{ responseText: string; topicAddressed: string; alignmentConfidence: number; modelUsed?: string; latencyMs: number; llmCallTrace: LlmCallTrace }> {
    const startTime = Date.now();
    const userApiKey = getUserApiKey();

    if (!userApiKey || !isApiKeyVerifiedLocally()) {
      const noKeyTrace: LlmCallTrace = {
        traceId: `trace-nokey-${Date.now()}`,
        type: 'PERSONA_RESPONSE',
        model: selectedModel,
        systemPrompt: '(No API key — call not made)',
        userMessage: contextPrompt,
        rawResponse: '[REAL API KEY REQUIRED]',
        latencyMs: 0,
        timestamp: new Date().toISOString()
      };
      return {
        responseText: `[REAL API KEY REQUIRED]\n\nPlease enter a valid Gemini API Key or OpenRouter Key (starting with 'sk-or-...') in the top header and click 'Verify Key' to unlock live AI persona responses.`,
        topicAddressed: 'API Key Verification Required',
        alignmentConfidence: 0,
        modelUsed: 'API Key Required',
        latencyMs: Date.now() - startTime,
        llmCallTrace: noKeyTrace
      };
    }

    if (!contextPrompt || !contextPrompt.trim()) {
      const noInputTrace: LlmCallTrace = {
        traceId: `trace-noinput-${Date.now()}`,
        type: 'PERSONA_RESPONSE',
        model: selectedModel,
        systemPrompt: '(No input — call not made)',
        userMessage: '',
        rawResponse: '[NO INPUT DETECTED]',
        latencyMs: 0,
        timestamp: new Date().toISOString()
      };
      return {
        responseText: "[NO INPUT DETECTED] No spoken microphone transcript or text prompt was provided. Please speak into the microphone or enter a prompt before asking.",
        topicAddressed: 'No Input Detected',
        alignmentConfidence: 0,
        modelUsed: 'No Input',
        latencyMs: Date.now() - startTime,
        llmCallTrace: noInputTrace
      };
    }

    const combinedContextText = buildCombinedTranscriptContext(contextPrompt, recentTranscripts);
    const topicAddressed = extractTopicFromPrompt(combinedContextText);
    const systemPrompt = buildSystemPrompt(persona, recentTranscripts, targetDurationSec, combinedContextText);
    const { targetWordCount, minWords, maxWords, maxTokens } = calculateTargetWords(targetDurationSec);

    const selectedProvider = localStorage.getItem('LPC_API_PROVIDER') || (userApiKey.startsWith('AIza') ? 'gemini' : 'openrouter');
    const isOpenRouterKey = userApiKey.startsWith('sk-or-');
    const isGeminiKey = userApiKey.startsWith('AIza');
    const isGeminiProvider = isGeminiKey || (selectedProvider === 'gemini' && !isOpenRouterKey);

    const promptText = `=== CORE QUESTION TO ANSWER & DEBATE ===\n<user_input>\n${contextPrompt}\n</user_input>\n\n=== SPOKEN AUDIO TRANSCRIPT HISTORY ===\n${combinedContextText}\n\n=== PERSONA RESPONSE DIRECTIVE ===\nAs ${persona.name} (${persona.role}), provide a direct ${targetDurationSec} second (${minWords}–${maxWords} words, target: ~${targetWordCount} words) technical response answering the question above in your authentic persona voice. Do NOT exceed ${maxWords} words. Start directly with your position without repeating the question.`;

    let responseText = '';
    let modelUsed = selectedModel;

    console.info(`[MeetPersona AI] Generating persona response via ${isGeminiProvider ? 'Gemini API' : 'OpenRouter API'} using model "${selectedModel}"...`);

    try {
      if (isGeminiProvider) {
        let chosenModel = selectedModel.replace(/^(google\/|models\/)/i, '').trim();
        if (!chosenModel || chosenModel.includes('/') || chosenModel.includes(':')) {
          chosenModel = 'gemini-1.5-flash';
        }
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${chosenModel}:generateContent?key=${userApiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\n${promptText}` }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text) {
            responseText = text;
            modelUsed = `Gemini (${chosenModel})`;
            console.info(`[MeetPersona AI] Gemini API response generation succeeded (${text.split(/\s+/).length} words).`);
          }
        } else {
          const errBody = await response.text().catch(() => '');
          console.warn(`[MeetPersona AI] Gemini API returned error (${response.status}):`, errBody);
        }
      } else {
        const openRouterModelId = getOpenRouterModelId(selectedModel);
        const headers = {
          'Authorization': `Bearer ${userApiKey}`,
          'HTTP-Referer': 'https://meetpersona.ai',
          'X-Title': 'MeetPersona AI',
          'Content-Type': 'application/json'
        };

        const tryOpenRouterCall = async (modelId: string) => {
          try {
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers,
              body: JSON.stringify({
                model: modelId,
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: promptText }
                ],
                max_tokens: maxTokens,
                temperature: 0.7
              })
            });
            if (res.ok) {
              const data = await res.json();
              const text = data?.choices?.[0]?.message?.content?.trim();
              if (text) return { text, modelId };
            } else {
              const errBody = await res.text().catch(() => '');
              console.warn(`[MeetPersona AI] OpenRouter model ${modelId} failed (HTTP ${res.status}): ${errBody}`);
            }
          } catch (err) {
            console.warn(`[MeetPersona AI] OpenRouter model ${modelId} fetch exception:`, err);
          }
          return null;
        };

        let callResult = await tryOpenRouterCall(openRouterModelId);

        const FALLBACK_MODELS = [
          'google/gemini-2.0-flash-lite-preview-02-05:free',
          'meta-llama/llama-3.3-70b-instruct:free',
          'google/gemma-2-9b-it:free',
          'qwen/qwen-2.5-72b-instruct:free',
          'google/gemini-2.0-flash-lite-preview-02-05',
          'meta-llama/llama-3.3-70b-instruct'
        ];

        for (const fallbackId of FALLBACK_MODELS) {
          if (callResult) break;
          if (openRouterModelId !== fallbackId) {
            console.info(`[MeetPersona AI] Retrying with fallback model ${fallbackId}...`);
            callResult = await tryOpenRouterCall(fallbackId);
          }
        }

        if (!callResult && userApiKey.startsWith('AIza')) {
          console.info('[MeetPersona AI] OpenRouter fallbacks exhausted. Retrying via direct Gemini API (gemini-1.5-flash)...');
          try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${userApiKey}`;
            const gemRes = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: `${systemPrompt}\n\n${promptText}` }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens }
              })
            });
            if (gemRes.ok) {
              const gemData = await gemRes.json();
              const gemText = gemData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
              if (gemText) {
                callResult = { text: gemText, modelId: 'Gemini (gemini-1.5-flash)' };
              }
            }
          } catch (gemErr) {
            console.warn('[MeetPersona AI] Gemini API fallback notice:', gemErr);
          }
        }

        if (callResult) {
          responseText = callResult.text;
          modelUsed = callResult.modelId.startsWith('Gemini') ? callResult.modelId : `OpenRouter (${callResult.modelId})`;
          console.info(`[MeetPersona AI] Response generation succeeded via ${modelUsed} (${callResult.text.split(/\s+/).length} words).`);
        } else {
          responseText = `[API ERROR] The selected model "${selectedModel}" returned an error from OpenRouter. Please select "Google Gemini 2.0 Flash Lite [Free]" or "Gemini 1.5 Flash" from the model dropdown and verify your API key is active.`;
        }
      }

      // Auto-expansion check: if responseText is shorter than minWords (at least 90% of target), run expansion pass
      if (responseText && !responseText.startsWith('[API') && responseText.split(/\s+/).filter(Boolean).length < minWords) {
        const currentWordCount = responseText.split(/\s+/).filter(Boolean).length;
        console.info(`[MeetPersona AI] Response length (${currentWordCount} words) is below min bound (${minWords} words) for ${targetDurationSec}s target. Requesting expansion...`);
        
        const expansionPrompt = `Your initial response was ${currentWordCount} words, but the target speech duration of ${targetDurationSec} seconds REQUIRES a minimum of ${minWords} words (~${targetWordCount} words).

=== YOUR INITIAL RESPONSE ===
${responseText}

=== EXPANSION DIRECTIVE ===
As ${persona.name} (${persona.role}), expand your response to be between ${minWords} and ${maxWords} words. Provide additional technical depth, architectural trade-offs, implementation details, and pragmatic engineering examples. Keep your authentic voice and output ONLY the complete, expanded response (${minWords}–${maxWords} words):`;

        if (isGeminiProvider) {
          let chosenModel = selectedModel.replace(/^(google\/|models\/)/i, '').trim();
          if (!chosenModel || chosenModel.includes('/') || chosenModel.includes(':')) chosenModel = 'gemini-1.5-flash';
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${chosenModel}:generateContent?key=${userApiKey}`;
          const expRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${systemPrompt}\n\n${expansionPrompt}` }] }],
              generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens }
            })
          });
          if (expRes.ok) {
            const data = await expRes.json();
            const expText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (expText && expText.split(/\s+/).filter(Boolean).length > currentWordCount) {
              responseText = expText;
              console.info(`[MeetPersona AI] Response successfully expanded to ${expText.split(/\s+/).filter(Boolean).length} words.`);
            }
          }
        } else {
          const headers = {
            'Authorization': `Bearer ${userApiKey}`,
            'HTTP-Referer': 'https://meetpersona.ai',
            'X-Title': 'MeetPersona AI',
            'Content-Type': 'application/json'
          };
          const openRouterModelId = getOpenRouterModelId(selectedModel);
          const expRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: openRouterModelId,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: expansionPrompt }
              ],
              max_tokens: maxTokens,
              temperature: 0.7
            })
          });
          if (expRes.ok) {
            const data = await expRes.json();
            const expText = data?.choices?.[0]?.message?.content?.trim();
            if (expText && expText.split(/\s+/).filter(Boolean).length > currentWordCount) {
              responseText = expText;
              console.info(`[MeetPersona AI] Response successfully expanded to ${expText.split(/\s+/).filter(Boolean).length} words.`);
            }
          }
        }
      }
    } catch (e: any) {
      console.warn('[MeetPersona AI] Persona response direct LLM call exception:', e);
    }

    if (!responseText) {
      responseText = `[API ERROR] Unable to generate response for target duration ${targetDurationSec}s. Please verify your OpenRouter or Gemini API key.`;
    }

    const alignmentConfidence = calculateClientAlignmentScore(responseText, persona, targetDurationSec);
    const latencyMs = Date.now() - startTime;

    const llmCallTrace: LlmCallTrace = {
      traceId: `trace-pr-${Date.now()}`,
      type: 'PERSONA_RESPONSE',
      model: modelUsed,
      systemPrompt,
      userMessage: promptText,
      rawResponse: responseText,
      latencyMs,
      timestamp: new Date().toISOString()
    };

    return {
      responseText,
      topicAddressed,
      alignmentConfidence,
      modelUsed,
      latencyMs,
      llmCallTrace
    };
  }

  public static async generatePersonaFromProfile(profileText: string, selectedModel: string = 'google/gemma-2-9b-it:free'): Promise<PersonaProfile> {
    const userApiKey = getUserApiKey();
    if (!userApiKey) {
      throw new Error('API Key required to generate persona. Please enter it in the top header and click Verify.');
    }

    const cleanProfile = (profileText || '').trim();
    if (!cleanProfile || cleanProfile.length < 20 || cleanProfile.split(/\s+/).length < 4) {
      throw new Error('Insufficient profile details. Please provide a detailed bio, CV, or LinkedIn text (at least 20 characters and multiple words) to generate a persona profile.');
    }

    // 1. Try Express backend API first
    try {
      const res = await fetch('/api/persona/generate-from-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileText: cleanProfile, userApiKey })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.persona) return data.persona;
      }
    } catch (e) {
      console.warn('Backend proxy persona generation error, attempting direct client fetch:', e);
    }

    // 2. Client-side fallback for Vite dev mode (prevents 502 Bad Gateway)
    const selectedProvider = localStorage.getItem('LPC_API_PROVIDER') || (userApiKey.startsWith('AIza') ? 'gemini' : 'openrouter');
    
    const systemPrompt = `You are an expert HR analyst and Persona Crafter. Your job is to read a user's pasted CV, LinkedIn profile text, or bio, and extract a rich persona profile from it. You MUST output ONLY valid JSON matching this TypeScript interface exactly, with no markdown formatting around it (no \`\`\`json):
{
  "id": "string (generate a unique lowercase dash-separated id)",
  "name": "string (person's name)",
  "role": "string (their primary job title or role)",
  "avatarUrl": "string (use a placeholder like https://api.dicebear.com/7.x/avataaars/svg?seed=Name)",
  "background": "string (1-2 sentences summarizing their background)",
  "tone": "string (e.g. professional, enthusiastic, analytical)",
  "speechPattern": "string (e.g. uses industry jargon, concise, eloquent)",
  "sampleQuotes": ["string", "string"],
  "keyTraits": ["string", "string"],
  "systemPrompt": "string (A detailed system prompt instructing an LLM on how to act as this person, including their biases, knowledge areas, and personality.)"
}

CRITICAL REQUIREMENT: If the provided profile text is too brief, trivial, nonsensical, or lacks sufficient background details to extract a specific persona, DO NOT invent a fictional persona named 'John Doe' or default software engineer. Instead, output ONLY a JSON object with an error key:
{ "error": "Insufficient details provided in profile text to generate a persona profile. Please provide a detailed bio, CV, or role description." }`;

    let jsonText = '';

    // Path A: Gemini API Direct
    if (selectedProvider === 'gemini') {
      const chosenModel = selectedModel.includes('pro') ? 'gemini-1.5-pro' : 'gemini-1.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${chosenModel}:generateContent?key=${userApiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { parts: [{ text: `${systemPrompt}\n\nPROFILE TEXT:\n${profileText}` }] }
          ],
          generationConfig: { temperature: 0.2 }
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData?.error?.message || `HTTP ${response.status} ${response.statusText}`;
        throw new Error(`Gemini persona generation failed: ${errMsg}`);
      }

      const data = await response.json();
      jsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{}';
    }

    // Path B: OpenRouter API Direct
    if (selectedProvider === 'openrouter') {
      const openRouterModelId = getOpenRouterModelId(selectedModel);
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userApiKey}`,
          'HTTP-Referer': 'https://meetpersona.ai',
          'X-Title': 'MeetPersona AI',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: openRouterModelId,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `PROFILE TEXT:\n${profileText}` }
          ],
          max_tokens: 1200,
          temperature: 0.2
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData?.error?.message || `HTTP ${response.status} ${response.statusText}`;
        throw new Error(`OpenRouter persona generation failed: ${errMsg}`);
      }

      const data = await response.json();
      jsonText = data?.choices?.[0]?.message?.content?.trim() || '{}';
    }

    if (!jsonText || jsonText === '{}') {
      throw new Error('Persona generation returned empty response. Please check your API key and try again.');
    }

    jsonText = jsonText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonText = jsonMatch[0];

    const parsed = JSON.parse(jsonText);
    if (parsed.error) {
      throw new Error(parsed.error);
    }
    if (!parsed.name || (parsed.name.toLowerCase().includes('john doe') && !cleanProfile.toLowerCase().includes('john doe'))) {
      throw new Error('The profile text did not contain enough details to extract a specific persona. Please provide a more detailed bio or CV.');
    }
    parsed.createdAt = new Date().toISOString();
    return parsed as PersonaProfile;
  }
}
