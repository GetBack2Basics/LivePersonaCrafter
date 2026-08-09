import { useState, useEffect } from 'react';
import type { MeetingSession } from '../types';

export function useMeetingSession(initialSession: MeetingSession) {
  const [session, setSession] = useState<MeetingSession>(initialSession);
  const [elapsedSeconds, setElapsedSeconds] = useState(3600);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const updateParticipantCount = (delta: number) => {
    setSession((prev) => ({
      ...prev,
      participantCount: Math.max(1, prev.participantCount + delta)
    }));
  };

  const setStatus = (status: MeetingSession['status']) => {
    setSession((prev) => ({ ...prev, status }));
  };

  const formattedDuration = () => {
    const hrs = Math.floor(elapsedSeconds / 3600);
    const mins = Math.floor((elapsedSeconds % 3600) / 60);
    const secs = elapsedSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    session,
    elapsedSeconds,
    formattedDuration: formattedDuration(),
    updateParticipantCount,
    setStatus
  };
}
