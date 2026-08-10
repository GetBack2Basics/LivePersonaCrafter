import { useState, useEffect, useRef, useCallback } from 'react';
import type { TranscriptEntry } from '../types';

interface UseLiveSpeechRecognitionProps {
  sessionId: string;
  onTranscriptAdded: (entry: TranscriptEntry) => void;
  onAutoTrigger?: (spokenText: string) => void;
}

export function useLiveSpeechRecognition({ 
  sessionId, 
  onTranscriptAdded,
  onAutoTrigger 
}: UseLiveSpeechRecognitionProps) {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [latestSpokenText, setLatestSpokenText] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const isStartedRef = useRef<boolean>(false);
  const shouldContinueRef = useRef<boolean>(false);
  const restartTimerRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Stable refs for callbacks so parent re-renders NEVER cause useEffect teardowns
  const sessionIdRef = useRef(sessionId);
  const onTranscriptAddedRef = useRef(onTranscriptAdded);
  const onAutoTriggerRef = useRef(onAutoTrigger);

  // Synchronously update refs on render without triggering effect cleanups
  sessionIdRef.current = sessionId;
  onTranscriptAddedRef.current = onTranscriptAdded;
  onAutoTriggerRef.current = onAutoTrigger;

  // Request browser microphone stream permission safely
  const requestMicAccess = useCallback(async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        return true;
      } catch (err) {
        console.warn('Device microphone access denied:', err);
        return false;
      }
    }
    return false;
  }, []);

  const startTranscription = useCallback(async () => {
    shouldContinueRef.current = true;
    setIsTranscribing(true);

    await requestMicAccess();

    if (recognitionRef.current && !isStartedRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn('Speech recognition start notice:', e);
      }
    }
  }, [requestMicAccess]);

  const stopTranscription = useCallback(() => {
    shouldContinueRef.current = false;
    isStartedRef.current = false;
    setIsTranscribing(false);
    setInterimText('');

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  // Initialize Web Speech API ONCE on mount with EMPTY dependency array []
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isStartedRef.current = true;
      setIsTranscribing(true);
    };

    recognition.onresult = (event: any) => {
      let currentInterim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          const finalClean = transcript.trim();
          if (finalClean) {
            setLatestSpokenText(finalClean);
            setInterimText('');

            const entry: TranscriptEntry = {
              transcriptId: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              sessionId: sessionIdRef.current,
              speaker: 'Device Microphone User',
              speakerRole: 'human',
              text: finalClean,
              timestamp: new Date().toISOString(),
              sentiment: 'neutral'
            };

            if (onTranscriptAddedRef.current) {
              onTranscriptAddedRef.current(entry);
            }

            if (onAutoTriggerRef.current && finalClean.length > 3) {
              onAutoTriggerRef.current(finalClean);
            }
          }
        } else {
          currentInterim += transcript;
        }
      }
      if (currentInterim) {
        setInterimText(currentInterim);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition notice:', event.error);
      if (event.error === 'no-speech' || event.error === 'audio-capture' || event.error === 'aborted') {
        return;
      }
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setSpeechSupported(false);
        shouldContinueRef.current = false;
        isStartedRef.current = false;
        setIsTranscribing(false);
      }
    };

    recognition.onend = () => {
      isStartedRef.current = false;

      // Restarts continuously if user has mic active
      if (shouldContinueRef.current) {
        setIsTranscribing(true);
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          if (shouldContinueRef.current && !isStartedRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch {
              // ignore start race condition
            }
          }
        }, 300);
      } else {
        setIsTranscribing(false);
        setInterimText('');
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldContinueRef.current = false;
      isStartedRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ignore */ }
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []); // ALWAYS EMPTY DEPENDENCY ARRAY - Never teardown on parent re-renders!

  return {
    isTranscribing,
    interimText,
    latestSpokenText,
    speechSupported,
    startTranscription,
    stopTranscription
  };
}
