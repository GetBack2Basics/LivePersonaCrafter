import type { EngineState, PersonaProfile, TranscriptEntry } from '../types';
import { INITIAL_PERSONAS, INITIAL_SESSION, INITIAL_TRANSCRIPTS, INITIAL_BOT_RESPONSES, INITIAL_FEEDBACKS } from '../data/initialData';

const LOCAL_STORAGE_KEY = 'MEET_PERSONA_AI_STATE_V15';
const USER_API_KEY_STORAGE_KEY = 'MEET_PERSONA_USER_API_KEY';
const KEY_VERIFIED_STORAGE_KEY = 'MEET_PERSONA_KEY_VERIFIED_V1';

export function getUserApiKey(): string {
  try {
    return (localStorage.getItem(USER_API_KEY_STORAGE_KEY) || '').trim();
  } catch {
    return '';
  }
}

export function isApiKeyVerifiedLocally(): boolean {
  try {
    return localStorage.getItem(KEY_VERIFIED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setUserApiKey(key: string, isVerified: boolean = false): void {
  try {
    const clean = key.trim();
    localStorage.setItem(USER_API_KEY_STORAGE_KEY, clean);
    localStorage.setItem(KEY_VERIFIED_STORAGE_KEY, isVerified ? 'true' : 'false');
  } catch (e) {
    console.error('Failed to save user API Key:', e);
  }
}

/**
 * Real API Key verification test against official Gemini or OpenRouter endpoints.
 * Rejects pseudo-keys, strings without 'AIza' or 'sk-or-', and failing HTTP pings.
 */
export async function validateApiKey(key: string): Promise<{ isValid: boolean; provider: string; message: string }> {
  const clean = key.trim();
  if (!clean) {
    setUserApiKey('', false);
    return { isValid: false, provider: 'None', message: 'API Key is empty. Please enter your Gemini (AIza...) or OpenRouter (sk-or-...) Key.' };
  }

  // 1. Strict Format Validation
  const isGeminiKey = clean.startsWith('AIza');
  const isOpenRouterKey = clean.startsWith('sk-or-');

  if (!isGeminiKey && !isOpenRouterKey) {
    setUserApiKey(clean, false);
    return { 
      isValid: false, 
      provider: 'Invalid Format', 
      message: 'Invalid API key format. Gemini keys must start with "AIza..." and OpenRouter keys must start with "sk-or-...".' 
    };
  }

  // 2. Real Gemini API Ping Test
  if (isGeminiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${clean}`;
      const res = await fetch(url);
      if (res.ok) {
        setUserApiKey(clean, true);
        return { isValid: true, provider: 'Gemini API', message: 'Gemini API Key Verified & Active (HTTP 200 OK)!' };
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
  if (isOpenRouterKey) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { Authorization: `Bearer ${clean}` }
      });
      if (res.ok) {
        const data = await res.json();
        const label = data?.data?.label ? ` (${data.data.label})` : '';
        setUserApiKey(clean, true);
        return { isValid: true, provider: 'OpenRouter API', message: `OpenRouter Key Verified & Active${label} (HTTP 200 OK)!` };
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

export function calculateTargetWords(durationSec: number): { targetWordCount: number; maxTokens: number } {
  if (durationSec <= 30) return { targetWordCount: 85, maxTokens: 400 };
  if (durationSec <= 45) return { targetWordCount: 140, maxTokens: 650 };
  if (durationSec <= 60) return { targetWordCount: 200, maxTokens: 850 };
  if (durationSec <= 90) return { targetWordCount: 300, maxTokens: 1200 };
  return { targetWordCount: 420, maxTokens: 1700 };
}

export function buildSystemPrompt(
  persona: PersonaProfile, 
  recentTranscripts: TranscriptEntry[],
  targetDurationSec: number = 45,
  fullCombinedContext?: string
): string {
  const quotesStr = persona.sampleQuotes ? persona.sampleQuotes.map(q => `"${q}"`).join('\n- ') : '';
  const traitsStr = persona.keyTraits ? persona.keyTraits.join(', ') : '';
  const { targetWordCount } = calculateTargetWords(targetDurationSec);

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
1. READ THE ENTIRE SPOKEN AUDIO TRANSCRIPT HISTORY CAREFULLY AND RESPOND DIRECTLY TO THE SPECIFIC SUBJECT BEING DEBATED (e.g. if the transcript discusses training separate models on Quran vs Bible vs theological literature, address THAT exact debate topic directly!).
2. DO NOT repeat or echo the user's question or prompt as filler text. Start directly with your technical position.
3. DO NOT use rigid headers, section labels, or template tags. Speak naturally in authentic first person.
4. DO NOT output specific project repository names UNLESS the user explicitly asks about those projects by name in their prompt.
5. TARGET LENGTH: Provide a detailed response designed for exactly ${targetDurationSec} seconds of spoken vocal delivery (${targetWordCount}+ words).`;
}

export function getOpenRouterModelId(selectedModel: string): string {
  switch (selectedModel) {
    case 'deepseek-r1-free': return 'deepseek/deepseek-r1:free';
    case 'llama-3.3-70b-free': return 'meta-llama/llama-3.3-70b-instruct:free';
    case 'qwen-2.5-72b-free': return 'qwen/qwen-2.5-72b-instruct:free';
    case 'deepseek-chat': return 'deepseek/deepseek-chat';
    case 'qwen-2.5-72b': return 'qwen/qwen-2.5-72b-instruct';
    case 'claude-3.5-sonnet': return 'anthropic/claude-3.5-sonnet';
    case 'gpt-4o': return 'openai/gpt-4o';
    default: return 'google/gemma-2-9b-it:free';
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
    selectedModel: string = 'gemini-1.5-flash',
    targetDurationSec: number = 45
  ): Promise<{ responseText: string; topicAddressed: string; alignmentConfidence: number; modelUsed?: string; latencyMs: number }> {
    const startTime = Date.now();
    const userApiKey = getUserApiKey();

    if (!userApiKey || (!userApiKey.startsWith('AIza') && !userApiKey.startsWith('sk-or-'))) {
      return {
        responseText: `[REAL API KEY REQUIRED]\n\nPlease enter a valid Gemini API Key (starting with 'AIza...') or OpenRouter Key (starting with 'sk-or-...') in the top header and click 'Verify Key' to unlock live AI persona responses.`,
        topicAddressed: 'API Key Verification Required',
        alignmentConfidence: 0,
        modelUsed: 'API Key Required',
        latencyMs: Date.now() - startTime
      };
    }

    const combinedContextText = buildCombinedTranscriptContext(contextPrompt, recentTranscripts);
    const topicAddressed = extractTopicFromPrompt(combinedContextText);

    // 1. Try Express backend API first
    try {
      const res = await fetch('/api/persona/response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          persona, 
          contextPrompt: combinedContextText, 
          recentTranscripts, 
          selectedModel, 
          targetDurationSec,
          userApiKey 
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.responseText && !data.responseText.includes('[API KEY REQUIRED]') && !data.responseText.includes('[REAL API KEY REQUIRED]')) {
          return {
            responseText: data.responseText,
            topicAddressed: data.topicAddressed || topicAddressed,
            alignmentConfidence: data.alignmentConfidence || 97,
            modelUsed: data.modelUsed || selectedModel,
            latencyMs: data.latencyMs || (Date.now() - startTime)
          };
        }
      }
    } catch (e) {
      console.warn('Backend proxy fetch error, falling back to client fetch:', e);
    }

    const systemPrompt = buildSystemPrompt(persona, recentTranscripts, targetDurationSec, combinedContextText);
    const { targetWordCount, maxTokens } = calculateTargetWords(targetDurationSec);

    // 2. Direct Browser Fetch: Gemini API
    if (userApiKey.startsWith('AIza') || selectedModel.startsWith('gemini')) {
      try {
        const chosenModel = selectedModel.includes('pro') ? 'gemini-1.5-pro' : 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${chosenModel}:generateContent?key=${userApiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: `${systemPrompt}\n\nSPOKEN AUDIO TRANSCRIPT HISTORY:\n${combinedContextText}\n\nPROVIDE A DIRECT ${targetDurationSec} SECOND (${targetWordCount}+ WORD) TECHNICAL RESPONSE (DO NOT REPEAT THE QUESTION):` }
                ]
              }
            ],
            generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text) {
            return {
              responseText: text,
              topicAddressed,
              alignmentConfidence: 96,
              modelUsed: `Gemini (${chosenModel})`,
              latencyMs: Date.now() - startTime
            };
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData?.error?.message || `HTTP ${response.status} Unauthorized`;
          return {
            responseText: `[GEMINI API ERROR] ${errMsg}\n\nPlease check your Gemini API key in the top header.`,
            topicAddressed,
            alignmentConfidence: 0,
            modelUsed: 'Gemini Error',
            latencyMs: Date.now() - startTime
          };
        }
      } catch (err: any) {
        console.warn('Direct Gemini fetch exception:', err);
      }
    }

    // 3. Direct Browser Fetch: OpenRouter API
    const openRouterModelId = getOpenRouterModelId(selectedModel);
    try {
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
            { role: 'user', content: `SPOKEN AUDIO TRANSCRIPT:\n${combinedContextText}\n\nProvide a ${targetDurationSec}s (${targetWordCount}+ word) technical response without repeating the question.` }
          ],
          max_tokens: maxTokens
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content?.trim();
        if (text) {
          return {
            responseText: text,
            topicAddressed,
            alignmentConfidence: 95,
            modelUsed: `OpenRouter (${openRouterModelId})`,
            latencyMs: Date.now() - startTime
          };
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData?.error?.message || `HTTP ${response.status} Unauthorized`;
        return {
          responseText: `[OPENROUTER API ERROR] ${errMsg}\n\nPlease check your OpenRouter API Key in the top header.`,
          topicAddressed,
          alignmentConfidence: 0,
          modelUsed: `${openRouterModelId} (API Error)`,
          latencyMs: Date.now() - startTime
        };
      }
    } catch (err: any) {
      console.warn('OpenRouter fetch exception:', err);
    }

    return {
      responseText: `[INVALID API KEY]\n\nThe API key provided was rejected by Google Gemini and OpenRouter. Keys must start with 'AIza...' (Gemini) or 'sk-or-...' (OpenRouter).`,
      topicAddressed,
      alignmentConfidence: 0,
      modelUsed: 'Invalid Key',
      latencyMs: Date.now() - startTime
    };
  }
}
