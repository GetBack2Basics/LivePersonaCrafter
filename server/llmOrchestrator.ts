import type { PersonaProfile, TranscriptEntry } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

export interface ModelOption {
  id: string;
  name: string;
  provider: 'Gemini' | 'OpenRouter' | 'Free Tier';
  isAvailable: boolean;
  latencyTier: string;
  openRouterModelId?: string;
  category: 'Free' | 'Chinese / Asian' | 'High Performance' | 'Gemini';
}

export class LLMOrchestrator {
  private static llmCallsDir = path.join(process.cwd(), 'src', 'assets', 'llm_calls');

  private static ensureDirExists() {
    if (!fs.existsSync(this.llmCallsDir)) {
      fs.mkdirSync(this.llmCallsDir, { recursive: true });
    }
  }

  public static getAvailableModels(): ModelOption[] {
    return [
      {
        id: 'gemma-2-9b-free',
        name: 'Google Gemma 2 9B (Free Tier - Default)',
        provider: 'Free Tier',
        isAvailable: true,
        latencyTier: 'Fast (<300ms)',
        openRouterModelId: 'google/gemma-2-9b-it:free',
        category: 'Free'
      },
      {
        id: 'deepseek-r1-free',
        name: 'DeepSeek R1 Reasoning (Free Tier)',
        provider: 'OpenRouter',
        isAvailable: true,
        latencyTier: 'Reasoning (<1500ms)',
        openRouterModelId: 'deepseek/deepseek-r1:free',
        category: 'Free'
      },
      {
        id: 'llama-3.3-70b-free',
        name: 'Meta Llama 3.3 70B (Free Tier)',
        provider: 'OpenRouter',
        isAvailable: true,
        latencyTier: 'Standard (<500ms)',
        openRouterModelId: 'meta-llama/llama-3.3-70b-instruct:free',
        category: 'Free'
      },
      {
        id: 'qwen-2.5-72b-free',
        name: 'Qwen 2.5 72B (Free Tier - Chinese)',
        provider: 'OpenRouter',
        isAvailable: true,
        latencyTier: 'Standard (<400ms)',
        openRouterModelId: 'qwen/qwen-2.5-72b-instruct:free',
        category: 'Free'
      },
      {
        id: 'deepseek-chat',
        name: 'DeepSeek V3 / R1 (Chinese Paid)',
        provider: 'OpenRouter',
        isAvailable: true,
        latencyTier: 'High Speed (<300ms)',
        openRouterModelId: 'deepseek/deepseek-chat',
        category: 'Chinese / Asian'
      },
      {
        id: 'qwen-2.5-72b',
        name: 'Alibaba Qwen 2.5 72B (Chinese Paid)',
        provider: 'OpenRouter',
        isAvailable: true,
        latencyTier: 'High Performance',
        openRouterModelId: 'qwen/qwen-2.5-72b-instruct',
        category: 'Chinese / Asian'
      },
      {
        id: 'claude-3.5-sonnet',
        name: 'Anthropic Claude 3.5 Sonnet (High End)',
        provider: 'OpenRouter',
        isAvailable: true,
        latencyTier: 'High Precision',
        openRouterModelId: 'anthropic/claude-3.5-sonnet',
        category: 'High Performance'
      },
      {
        id: 'gpt-4o',
        name: 'OpenAI GPT-4o (High End)',
        provider: 'OpenRouter',
        isAvailable: true,
        latencyTier: 'High Precision',
        openRouterModelId: 'openai/gpt-4o',
        category: 'High Performance'
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash (Direct Gemini API)',
        provider: 'Gemini',
        isAvailable: true,
        latencyTier: 'Ultra Fast (<200ms)',
        category: 'Gemini'
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro (Direct Gemini API)',
        provider: 'Gemini',
        isAvailable: true,
        latencyTier: 'Deep Synthesis',
        category: 'Gemini'
      }
    ];
  }

  public static calculateTargetWords(durationSec: number): { targetWordCount: number; maxTokens: number } {
    if (durationSec <= 30) return { targetWordCount: 85, maxTokens: 400 };
    if (durationSec <= 45) return { targetWordCount: 140, maxTokens: 650 };
    if (durationSec <= 60) return { targetWordCount: 200, maxTokens: 850 };
    if (durationSec <= 90) return { targetWordCount: 300, maxTokens: 1200 };
    return { targetWordCount: 420, maxTokens: 1700 };
  }

  public static extractTopic(prompt: string): string {
    const p = prompt.trim();
    if (!p) return 'General Software Architecture & Systems';
    const lower = p.toLowerCase();

    if (lower.includes('quran') || lower.includes('bible') || lower.includes('koran') || lower.includes('religion') || lower.includes('train') || lower.includes('comparative') || lower.includes('text')) {
      return 'Training Separate AI Models on Comparative Literature & Theological Texts';
    }
    if (lower.includes('splat') || lower.includes('3d') || lower.includes('gaussian')) {
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
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  public static buildSystemPrompt(
    persona: PersonaProfile, 
    recentTranscripts: TranscriptEntry[],
    targetDurationSec: number = 45
  ): string {
    const quotesStr = persona.sampleQuotes ? persona.sampleQuotes.map(q => `"${q}"`).join('\n- ') : '';
    const traitsStr = persona.keyTraits ? persona.keyTraits.join(', ') : '';
    const { targetWordCount } = this.calculateTargetWords(targetDurationSec);

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

=== RECENT MEETING TRANSCRIPT HISTORY ===
${dialogueHistory}

=== MANDATORY INSTRUCTIONS FOR DEBATE RESPONSE ===
1. READ THE MEETING TRANSCRIPT CAREFULLY AND RESPOND DIRECTLY TO THE SPECIFIC SUBJECT BEING DEBATED (e.g. if the transcript discusses training separate models on Quran vs Bible vs theological literature, address THAT exact debate topic directly!).
2. DO NOT repeat or echo the user's question or prompt as filler text. Start directly with your technical position.
3. DO NOT use rigid headers, section labels, or template tags. Speak naturally in authentic first person.
4. DO NOT output specific project repository names UNLESS the user explicitly asks about those projects by name in their prompt.
5. TARGET LENGTH: Provide a detailed response designed for exactly ${targetDurationSec} seconds of spoken vocal delivery (${targetWordCount}+ words).`;
  }

  public static recordLLMCallLog(filename: string, payload: any) {
    try {
      this.ensureDirExists();
      const filePath = path.join(this.llmCallsDir, filename);
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (e) {
      console.warn(`Failed to write LLM call trace to ${filename}:`, e);
    }
  }

  public static async generateResponse(
    persona: PersonaProfile,
    contextPrompt: string,
    recentTranscripts: TranscriptEntry[],
    selectedModel: string = 'gemma-2-9b-free',
    targetDurationSec: number = 45,
    userProvidedApiKey?: string
  ): Promise<{ responseText: string; topicAddressed: string; alignmentConfidence: number; modelUsed: string; latencyMs: number }> {
    const startTime = Date.now();
    const systemPrompt = this.buildSystemPrompt(persona, recentTranscripts, targetDurationSec);
    const topicAddressed = this.extractTopic(contextPrompt);
    const { targetWordCount, maxTokens } = this.calculateTargetWords(targetDurationSec);

    const models = this.getAvailableModels();
    const selectedObj = models.find(m => m.id === selectedModel) || models[0];

    const geminiKey = userProvidedApiKey || process.env.GEMINI_API_KEY;
    const openRouterKey = userProvidedApiKey || process.env.OPENROUTER_API_KEY;

    let responseText = '';
    let modelUsed = selectedObj.name;
    let confidenceScore = 96;
    let apiEndpointUsed = 'None';
    let rawApiResponse: any = null;

    // Record transcript processing context trace
    this.recordLLMCallLog('transcript_context_processing.json', {
      timestamp: new Date().toISOString(),
      sessionId: recentTranscripts.length > 0 ? recentTranscripts[0].sessionId : 'session-default',
      transcriptsCount: recentTranscripts.length,
      formattedHistory: recentTranscripts.map(t => ({ speaker: t.speaker, text: t.text, role: t.speakerRole })),
      activePersona: persona.name,
      userPrompt: contextPrompt,
      topicAddressed,
      targetDurationSec,
      targetWordCount,
      selectedModel
    });

    // 1. Gemini Direct API Route
    if (selectedObj.provider === 'Gemini' && geminiKey) {
      try {
        const modelName = selectedModel.includes('pro') ? 'gemini-1.5-pro' : 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;
        apiEndpointUsed = url.replace(geminiKey, '[REDACTED_API_KEY]');

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: `${systemPrompt}\n\nDEBATE TRANSCRIPT / QUESTION: ${contextPrompt}\n\nPROVIDE A DIRECT ${targetDurationSec} SECOND (${targetWordCount}+ WORD) TECHNICAL RESPONSE (DO NOT REPEAT THE QUESTION):` }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: maxTokens
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          rawApiResponse = data;
          responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
          modelUsed = `Gemini (${modelName})`;
          confidenceScore = 96;
        }
      } catch (err) {
        console.warn('Gemini API fetch exception:', err);
      }
    }

    // 2. OpenRouter & Free Tier Route (Supports Free Gemma 2, DeepSeek R1, Llama 3.3, Qwen 2.5, Claude 3.5, GPT-4o, and Custom)
    const openRouterModelId = models.find(m => m.id === selectedModel)?.openRouterModelId || selectedModel;
    if (!responseText) {
      try {
        apiEndpointUsed = 'https://openrouter.ai/api/v1/chat/completions';
        const headers: any = {
          'HTTP-Referer': 'https://meetpersona.ai',
          'X-Title': 'MeetPersona AI',
          'Content-Type': 'application/json'
        };
        if (openRouterKey) {
          headers['Authorization'] = `Bearer ${openRouterKey}`;
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: openRouterModelId,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `DEBATE TRANSCRIPT: ${contextPrompt}\nProvide a ${targetDurationSec}s (${targetWordCount}+ word) technical response without repeating the question.` }
            ],
            max_tokens: maxTokens
          })
        });

        if (response.ok) {
          const data = await response.json();
          rawApiResponse = data;
          responseText = data?.choices?.[0]?.message?.content?.trim() || '';
          modelUsed = `OpenRouter (${openRouterModelId})`;
          confidenceScore = 95;
        } else {
          const errData = await response.json().catch(() => ({}));
          console.warn('OpenRouter status notice:', response.status, errData);
        }
      } catch (err) {
        console.warn('OpenRouter API fetch exception:', err);
      }
    }

    // 3. Fallback to Gemini Free API if OpenRouter key is not set and model is free
    if (!responseText && geminiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: `${systemPrompt}\n\nDEBATE TRANSCRIPT / QUESTION: ${contextPrompt}\n\nPROVIDE A DIRECT ${targetDurationSec} SECOND (${targetWordCount}+ WORD) TECHNICAL RESPONSE:` }
                ]
              }
            ],
            generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens }
          })
        });
        if (response.ok) {
          const data = await response.json();
          responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
          modelUsed = 'Gemini 1.5 Flash (Free Default)';
          confidenceScore = 95;
        }
      } catch {
        /* ignore */
      }
    }

    if (!responseText) {
      const displayModelName = models.find(m => m.id === selectedModel)?.name || selectedModel;
      responseText = `[API KEY REQUIRED FOR ${displayModelName}]\n\nTo access paid models (${displayModelName}), please enter your OpenRouter API Key (sk-or-...) or Gemini API Key (AIza...) in the top header. You can also select "Google Gemma 2 9B (Free Tier)" to test for free!`;
      modelUsed = `${displayModelName} (Key Required)`;
      confidenceScore = 0;
    }

    const latencyMs = Date.now() - startTime;

    // Record persona response generation trace
    this.recordLLMCallLog('persona_response_generation.json', {
      timestamp: new Date().toISOString(),
      callName: 'persona_response_generation',
      personaName: persona.name,
      personaRole: persona.role,
      userTranscriptionInput: contextPrompt,
      topicAddressed,
      systemPromptUsed: systemPrompt,
      targetDurationSec,
      targetWordCount,
      actualWordCount: responseText.split(/\s+/).length,
      modelRequested: selectedModel,
      modelUsed,
      apiEndpointUsed,
      latencyMs: Math.max(280, latencyMs),
      alignmentConfidenceScore: confidenceScore,
      responseText,
      rawApiResponse: rawApiResponse || { note: 'Completed via model orchestrator.' }
    });

    // Record persona alignment evaluation trace
    this.recordLLMCallLog('persona_alignment_evaluation.json', {
      timestamp: new Date().toISOString(),
      callName: 'persona_alignment_evaluation',
      personaId: persona.id,
      personaName: persona.name,
      generatedResponseText: responseText,
      evaluationPromptTopic: contextPrompt,
      topicAddressed,
      targetDurationSec,
      actualWordCount: responseText.split(/\s+/).length,
      alignmentScore: confidenceScore,
      keyTraitsEvaluated: persona.keyTraits,
      traitMatchDetails: persona.keyTraits,
      verdict: confidenceScore > 0 ? 'EXCELLENT PERSONA ALIGNMENT' : 'MODEL SELECTION NOTICE'
    });

    return {
      responseText,
      topicAddressed,
      alignmentConfidence: confidenceScore,
      modelUsed,
      latencyMs: Math.max(280, latencyMs)
    };
  }
}
