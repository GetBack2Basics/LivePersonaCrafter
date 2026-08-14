import { useState, useEffect, useCallback } from 'react';
import type { EngineState, PersonaProfile, TranscriptEntry, BotResponse, ParticipantFeedback, LlmCallTrace } from '../types';
import { StorageProxy, extractQuestionViaLLM } from '../engine/storageProxy';
import { IndexedDBStore } from '../db/indexedDBStore';
import { FirebaseStore } from '../db/firebaseConfig';
import { INITIAL_PERSONAS, INITIAL_SESSION, INITIAL_TRANSCRIPTS, INITIAL_BOT_RESPONSES, INITIAL_FEEDBACKS } from '../data/initialData';

export function usePersonaEngine() {
  const [state, setState] = useState<EngineState>(() => {
    const loaded = StorageProxy.loadInitialState();
    return {
      ...loaded,
      isListening: false
    };
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<'LOCAL_ONLY' | 'INDEXEDDB' | 'CLOUD_SYNCED'>('INDEXEDDB');
  const [selectedModel, setSelectedModel] = useState<string>('google/gemini-2.0-flash-lite-preview-02-05:free');

  // LLM call traces — shown as expandable cards in the UI
  const [lastLlmCalls, setLastLlmCalls] = useState<LlmCallTrace[]>([]);
  // AI Transcript — the LLM-processed/refined question extracted from raw speech
  const [aiTranscript, setAiTranscript] = useState<string>('');

  // Hydrate state from Firestore on initial mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const cloudData = await FirebaseStore.fetchAllCloudData();
        if (isMounted && cloudData) {
          setState((prev) => ({
            ...prev,
            transcripts: cloudData.transcripts && cloudData.transcripts.length > 0 ? cloudData.transcripts : prev.transcripts,
            personas: cloudData.personas && cloudData.personas.length > 0 ? cloudData.personas : prev.personas,
            botResponses: cloudData.botResponses && cloudData.botResponses.length > 0 ? cloudData.botResponses : prev.botResponses,
            feedbacks: cloudData.feedbacks && cloudData.feedbacks.length > 0 ? cloudData.feedbacks : prev.feedbacks
          }));
        }
      } catch (e) {
        console.warn('Firestore initial hydration notice:', e);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // Sync state changes to Firestore asynchronously
  const persistState = useCallback(async (newState: EngineState) => {
    StorageProxy.saveState(newState);
    setIsSyncing(true);

    try {
      const cloudOk = await FirebaseStore.syncSnapshotToCloud({
        sessions: [newState.session],
        transcripts: newState.transcripts,
        personas: newState.personas,
        botResponses: newState.botResponses,
        feedbacks: newState.feedbacks
      });

      await IndexedDBStore.saveSnapshot({
        sessions: [newState.session],
        transcripts: newState.transcripts,
        personas: newState.personas,
        botResponses: newState.botResponses,
        feedbacks: newState.feedbacks
      }).catch(() => {});

      setLastSyncStatus(cloudOk ? 'CLOUD_SYNCED' : 'LOCAL_ONLY');
    } catch (e) {
      console.warn('Firestore sync notice:', e);
    } finally {
      setTimeout(() => setIsSyncing(false), 300);
    }
  }, []);

  const addTranscriptEntry = useCallback((entry: TranscriptEntry) => {
    FirebaseStore.saveTranscript(entry);
    setState((prev) => {
      const updatedTranscripts = [...prev.transcripts, entry];
      const next: EngineState = {
        ...prev,
        transcripts: updatedTranscripts,
        stats: {
          ...prev.stats,
          transcriptsProcessed: updatedTranscripts.length
        }
      };
      persistState(next);
      return next;
    });
  }, [persistState]);

  const addPersona = useCallback((persona: PersonaProfile) => {
    FirebaseStore.savePersona(persona);
    setState((prev) => {
      const next = { ...prev, personas: [...prev.personas, persona], activePersona: persona };
      persistState(next);
      return next;
    });
  }, [persistState]);

  const updatePersona = useCallback((updatedPersona: PersonaProfile) => {
    setState((prev) => {
      const updatedPersonas = prev.personas.map((p) => p.id === updatedPersona.id ? updatedPersona : p);
      const next = { 
        ...prev, 
        personas: updatedPersonas,
        activePersona: prev.activePersona.id === updatedPersona.id ? updatedPersona : prev.activePersona
      };
      persistState(next);
      return next;
    });
  }, [persistState]);

  const switchActivePersona = useCallback((persona: PersonaProfile) => {
    setState((prev) => {
      const next = { ...prev, activePersona: persona };
      persistState(next);
      return next;
    });
  }, [persistState]);

  const triggerPersonaResponse = useCallback(async (
    prompt: string, 
    overrideModel?: string,
    targetDurationSec: number = 45
  ) => {
    const activePersona = state.activePersona;
    const modelToUse = overrideModel || selectedModel;

    // === STAGE 1: LLM Question Extraction Call ===
    // Use the LLM to intelligently extract/refine the question from raw audio transcript
    const { extractedQuestion, llmCallTrace: questionTrace } = await extractQuestionViaLLM(
      prompt,
      activePersona.name,
      activePersona.role,
      modelToUse
    );

    // Update AI Transcript with the LLM-refined question
    setAiTranscript(extractedQuestion);

    // Record the raw spoken transcript entry (unchanged)
    const userTranscript: TranscriptEntry = {
      transcriptId: `tr-${Date.now()}`,
      sessionId: state.session.sessionId,
      speaker: 'Device Microphone User',
      speakerRole: 'human',
      text: prompt,
      timestamp: new Date().toISOString(),
      isBotTrigger: true,
      sentiment: 'curious'
    };

    // === STAGE 2: Persona Response Generation Call ===
    // Use the AI-refined question as the actual prompt for the persona
    const { responseText, topicAddressed, alignmentConfidence, latencyMs, llmCallTrace: responseTrace } = await StorageProxy.generatePersonaResponse(
      activePersona,
      extractedQuestion,  // Use the AI-extracted question, not raw transcript
      state.transcripts.slice(-5),
      modelToUse,
      targetDurationSec
    );

    // Track both LLM call traces for UI display & save to Firestore
    setLastLlmCalls([questionTrace, responseTrace]);
    FirebaseStore.saveLlmTrace(questionTrace);
    FirebaseStore.saveLlmTrace(responseTrace);

    const botTranscript: TranscriptEntry = {
      transcriptId: `tr-${Date.now() + 1}`,
      sessionId: state.session.sessionId,
      speaker: `${activePersona.name} (${activePersona.role})`,
      speakerRole: 'bot',
      text: responseText,
      timestamp: new Date().toISOString(),
      sentiment: 'neutral'
    };

    FirebaseStore.saveTranscript(userTranscript);
    FirebaseStore.saveTranscript(botTranscript);

    const newResponse: BotResponse = {
      responseId: `resp-${Date.now()}`,
      transcriptId: userTranscript.transcriptId,
      sessionId: state.session.sessionId,
      personaId: activePersona.id,
      promptContext: prompt,
      responseText,
      topicAddressed,
      alignmentConfidence,
      latencyMs,
      modelUsed: modelToUse,
      createdAt: new Date().toISOString(),
      feedbackSubmitted: false
    };

    FirebaseStore.saveBotResponse(newResponse);

    setState((prev) => {
      const updatedTranscripts = [...prev.transcripts, userTranscript, botTranscript];
      const updatedResponses = [newResponse, ...prev.botResponses];
      const updatedTotal = prev.stats.totalInteractions + 1;

      const next: EngineState = {
        ...prev,
        transcripts: updatedTranscripts,
        botResponses: updatedResponses,
        stats: {
          ...prev.stats,
          totalInteractions: updatedTotal,
          transcriptsProcessed: updatedTranscripts.length,
          lastResponseLatencyMs: latencyMs
        }
      };

      persistState(next);
      return next;
    });

    return newResponse;
  }, [state.activePersona, state.session.sessionId, state.transcripts, selectedModel, persistState]);

  const submitFeedback = useCallback((
    responseId: string,
    evaluatorName: string,
    alignmentScore: number,
    comments: string
  ) => {
    const feedback: ParticipantFeedback = {
      feedbackId: `fb-${Date.now()}`,
      responseId,
      sessionId: state.session.sessionId,
      personaId: state.activePersona.id,
      evaluatorName: evaluatorName || 'Anonymous Evaluator',
      evaluatorRole: 'Persona Benchmark Subject',
      alignmentScore,
      isPersonaMatch: alignmentScore >= 4,
      comments,
      submittedAt: new Date().toISOString()
    };

    FirebaseStore.saveFeedback(feedback);

    setState((prev) => {
      const updatedFeedbacks = [feedback, ...prev.feedbacks];
      const sum = updatedFeedbacks.reduce((acc, f) => acc + f.alignmentScore, 0);
      const avg = Number((sum / updatedFeedbacks.length).toFixed(2));

      const updatedResponses = prev.botResponses.map((r) =>
        r.responseId === responseId ? { ...r, feedbackSubmitted: true } : r
      );

      const next: EngineState = {
        ...prev,
        feedbacks: updatedFeedbacks,
        botResponses: updatedResponses,
        stats: {
          ...prev.stats,
          avgAlignmentScore: avg
        }
      };

      persistState(next);
      return next;
    });

    return feedback;
  }, [state.session.sessionId, state.activePersona.id, persistState]);

  const toggleListening = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, isListening: !prev.isListening };
      persistState(next);
      return next;
    });
  }, [persistState]);

  const resetEngineState = useCallback(() => {
    // Preserve user API key credentials during reset to default
    const apiKey = localStorage.getItem('LPC_API_KEY');
    const apiProvider = localStorage.getItem('LPC_API_PROVIDER');
    const apiVerified = localStorage.getItem('LPC_VERIFIED_KEY');

    localStorage.clear();

    if (apiKey) localStorage.setItem('LPC_API_KEY', apiKey);
    if (apiProvider) localStorage.setItem('LPC_API_PROVIDER', apiProvider);
    if (apiVerified) localStorage.setItem('LPC_VERIFIED_KEY', apiVerified);

    IndexedDBStore.clearDatabase();
    const cleanState: EngineState = {
      session: INITIAL_SESSION,
      personas: INITIAL_PERSONAS,
      activePersona: INITIAL_PERSONAS[0],
      transcripts: INITIAL_TRANSCRIPTS,
      botResponses: INITIAL_BOT_RESPONSES,
      feedbacks: INITIAL_FEEDBACKS,
      stats: {
        totalInteractions: 0,
        avgAlignmentScore: 5.0,
        transcriptsProcessed: 0,
        activeSessionDurationSec: 0,
        lastResponseLatencyMs: 0,
        openRouterStatus: 'ONLINE'
      },
      isListening: false,
      isSimulating: false
    };
    setState(cleanState);
    persistState(cleanState);
  }, [persistState]);

  const updateTranscriptEntry = useCallback((transcriptId: string, updatedText: string) => {
    setState((prev) => {
      const updatedTranscripts = prev.transcripts.map((t) =>
        t.transcriptId === transcriptId ? { ...t, text: updatedText } : t
      );
      const next: EngineState = { ...prev, transcripts: updatedTranscripts };
      persistState(next);
      return next;
    });
  }, [persistState]);

  const handleSetSelectedModel = useCallback((model: string) => {
    setSelectedModel(model);
  }, []);

  return {
    state,
    setState,
    isSyncing,
    lastSyncStatus,
    selectedModel,
    setSelectedModel: handleSetSelectedModel,
    lastLlmCalls,
    aiTranscript,
    setAiTranscript,
    addTranscriptEntry,
    updateTranscriptEntry,
    switchActivePersona,
    addPersona,
    updatePersona,
    triggerPersonaResponse,
    submitFeedback,
    toggleListening,
    resetEngineState
  };
}
