import { useState, useEffect, useCallback } from 'react';
import type { EngineState, PersonaProfile, TranscriptEntry, BotResponse, ParticipantFeedback } from '../types';
import { StorageProxy } from '../engine/storageProxy';
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
  const [selectedModel, setSelectedModel] = useState<string>('gemini-1.5-flash');

  // Hydrate state from IndexedDB on initial mount only if personas match GetBack2Basics
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const dbData = await IndexedDBStore.getAllData();
      const hasGetBack2Basics = dbData.personas.some((p) => p.name === 'GetBack2Basics');

      if (!hasGetBack2Basics) {
        // Purge legacy fake cached data from IndexedDB
        await IndexedDBStore.clearDatabase();
        return;
      }

      if (isMounted && dbData.transcripts.length > 0) {
        setState((prev) => ({
          ...prev,
          transcripts: dbData.transcripts.length >= prev.transcripts.length ? dbData.transcripts : prev.transcripts,
          botResponses: dbData.botResponses.length >= prev.botResponses.length ? dbData.botResponses : prev.botResponses,
          feedbacks: dbData.feedbacks.length >= prev.feedbacks.length ? dbData.feedbacks : prev.feedbacks
        }));
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // Sync state changes to LocalStorage, IndexedDB, and Firebase Cloud asynchronously
  const persistState = useCallback(async (newState: EngineState) => {
    StorageProxy.saveState(newState);
    setIsSyncing(true);

    try {
      const indexedDbOk = await IndexedDBStore.saveSnapshot({
        sessions: [newState.session],
        transcripts: newState.transcripts,
        personas: newState.personas,
        botResponses: newState.botResponses,
        feedbacks: newState.feedbacks
      });

      const cloudOk = await FirebaseStore.syncSnapshotToCloud({
        sessions: [newState.session],
        feedbacks: newState.feedbacks
      });

      setLastSyncStatus(cloudOk ? 'CLOUD_SYNCED' : indexedDbOk ? 'INDEXEDDB' : 'LOCAL_ONLY');
    } catch (e) {
      console.warn('Persistence sync notice:', e);
    } finally {
      setTimeout(() => setIsSyncing(false), 300);
    }
  }, []);

  const addTranscriptEntry = useCallback((entry: TranscriptEntry) => {
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

    const { responseText, topicAddressed, alignmentConfidence, latencyMs } = await StorageProxy.generatePersonaResponse(
      activePersona,
      prompt,
      state.transcripts.slice(-5),
      modelToUse,
      targetDurationSec
    );

    const botTranscript: TranscriptEntry = {
      transcriptId: `tr-${Date.now() + 1}`,
      sessionId: state.session.sessionId,
      speaker: `${activePersona.name} (${activePersona.role})`,
      speakerRole: 'bot',
      text: responseText,
      timestamp: new Date().toISOString(),
      sentiment: 'neutral'
    };

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
      createdAt: new Date().toISOString(),
      feedbackSubmitted: false
    };

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
    localStorage.clear();
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

  const handleSetSelectedModel = useCallback((model: string) => {
    setSelectedModel(model);
    setState((prev) => {
      const filteredResponses = prev.botResponses.filter(
        (r) =>
          !r.responseText.includes('[MODEL ACCESS NOTICE]') &&
          !r.responseText.includes('[API KEY REQUIRED]') &&
          !r.responseText.includes('[OPENROUTER API NOTICE]') &&
          !r.responseText.includes('Key Required')
      );
      if (filteredResponses.length !== prev.botResponses.length) {
        const next = { ...prev, botResponses: filteredResponses };
        persistState(next);
        return next;
      }
      return prev;
    });
  }, [persistState]);

  return {
    state,
    setState,
    isSyncing,
    lastSyncStatus,
    selectedModel,
    setSelectedModel: handleSetSelectedModel,
    addTranscriptEntry,
    switchActivePersona,
    triggerPersonaResponse,
    submitFeedback,
    toggleListening,
    resetEngineState
  };
}
