import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import type { DatabaseSnapshot } from './schema';
import type { MeetingSession, TranscriptEntry, PersonaProfile, BotResponse, ParticipantFeedback, LlmCallTrace } from '../types';

const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyDemoKeyForMeetPersonaAIExecution",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "meet-persona-ai.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "meet-persona-ai",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "meet-persona-ai.appspot.com",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1029384756",
  appId: env.VITE_FIREBASE_APP_ID || "1:1029384756:web:abcd1234efgh5678"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export class FirebaseStore {
  public static isConfigured(): boolean {
    return Boolean(db);
  }

  public static async saveSession(session: MeetingSession): Promise<boolean> {
    try {
      await setDoc(doc(db, 'sessions', session.sessionId), { ...session, updatedAt: new Date().toISOString() });
      return true;
    } catch (e) {
      console.warn('Firestore saveSession notice:', e);
      return false;
    }
  }

  public static async saveTranscript(entry: TranscriptEntry): Promise<boolean> {
    try {
      await setDoc(doc(db, 'transcripts', entry.transcriptId), { ...entry, updatedAt: new Date().toISOString() });
      return true;
    } catch (e) {
      console.warn('Firestore saveTranscript notice:', e);
      return false;
    }
  }

  public static async savePersona(persona: PersonaProfile): Promise<boolean> {
    try {
      await setDoc(doc(db, 'personas', persona.id), { ...persona, updatedAt: new Date().toISOString() });
      return true;
    } catch (e) {
      console.warn('Firestore savePersona notice:', e);
      return false;
    }
  }

  public static async saveBotResponse(response: BotResponse): Promise<boolean> {
    try {
      await setDoc(doc(db, 'bot_responses', response.responseId), { ...response, updatedAt: new Date().toISOString() });
      return true;
    } catch (e) {
      console.warn('Firestore saveBotResponse notice:', e);
      return false;
    }
  }

  public static async saveFeedback(feedback: ParticipantFeedback): Promise<boolean> {
    try {
      await setDoc(doc(db, 'feedbacks', feedback.feedbackId), { ...feedback, updatedAt: new Date().toISOString() });
      return true;
    } catch (e) {
      console.warn('Firestore saveFeedback notice:', e);
      return false;
    }
  }

  public static async saveLlmTrace(trace: LlmCallTrace): Promise<boolean> {
    try {
      await setDoc(doc(db, 'llm_traces', trace.traceId), { ...trace, updatedAt: new Date().toISOString() });
      return true;
    } catch (e) {
      console.warn('Firestore saveLlmTrace notice:', e);
      return false;
    }
  }

  public static async syncSnapshotToCloud(snapshot: Partial<DatabaseSnapshot>): Promise<boolean> {
    try {
      const timestamp = new Date().toISOString();
      if (snapshot.sessions && snapshot.sessions.length > 0) {
        for (const session of snapshot.sessions) {
          await setDoc(doc(db, 'sessions', session.sessionId), { ...session, lastSyncedAt: timestamp });
        }
      }
      if (snapshot.transcripts && snapshot.transcripts.length > 0) {
        for (const tr of snapshot.transcripts) {
          await setDoc(doc(db, 'transcripts', tr.transcriptId), { ...tr, lastSyncedAt: timestamp });
        }
      }
      if (snapshot.personas && snapshot.personas.length > 0) {
        for (const p of snapshot.personas) {
          await setDoc(doc(db, 'personas', p.id), { ...p, lastSyncedAt: timestamp });
        }
      }
      if (snapshot.botResponses && snapshot.botResponses.length > 0) {
        for (const r of snapshot.botResponses) {
          await setDoc(doc(db, 'bot_responses', r.responseId), { ...r, lastSyncedAt: timestamp });
        }
      }
      if (snapshot.feedbacks && snapshot.feedbacks.length > 0) {
        for (const fb of snapshot.feedbacks) {
          await setDoc(doc(db, 'feedbacks', fb.feedbackId), { ...fb, lastSyncedAt: timestamp });
        }
      }
      return true;
    } catch (e) {
      console.warn('Firestore Cloud sync notice:', e);
      return false;
    }
  }

  public static async fetchAllCloudData(): Promise<Partial<DatabaseSnapshot>> {
    try {
      const transcriptsSnap = await getDocs(collection(db, 'transcripts'));
      const transcripts: TranscriptEntry[] = [];
      transcriptsSnap.forEach((d) => transcripts.push(d.data() as TranscriptEntry));

      const personasSnap = await getDocs(collection(db, 'personas'));
      const personas: PersonaProfile[] = [];
      personasSnap.forEach((d) => personas.push(d.data() as PersonaProfile));

      const responsesSnap = await getDocs(collection(db, 'bot_responses'));
      const botResponses: BotResponse[] = [];
      responsesSnap.forEach((d) => botResponses.push(d.data() as BotResponse));

      const feedbacksSnap = await getDocs(collection(db, 'feedbacks'));
      const feedbacks: ParticipantFeedback[] = [];
      feedbacksSnap.forEach((d) => feedbacks.push(d.data() as ParticipantFeedback));

      return { transcripts, personas, botResponses, feedbacks };
    } catch (e) {
      console.warn('Firestore fetchAllCloudData notice:', e);
      return {};
    }
  }

  public static async fetchCloudFeedbacks(): Promise<ParticipantFeedback[]> {
    try {
      const q = query(collection(db, 'feedbacks'), orderBy('submittedAt', 'desc'), limit(20));
      const querySnapshot = await getDocs(q);
      const docs: ParticipantFeedback[] = [];
      querySnapshot.forEach((doc) => docs.push(doc.data() as ParticipantFeedback));
      return docs;
    } catch {
      return [];
    }
  }
}

