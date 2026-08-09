import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import type { DatabaseSnapshot } from './schema';

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
    const key = env.VITE_FIREBASE_API_KEY;
    return Boolean(key && !key.includes('DemoKey'));
  }

  public static async syncSnapshotToCloud(snapshot: Partial<DatabaseSnapshot>): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const timestamp = new Date().toISOString();
      if (snapshot.sessions && snapshot.sessions.length > 0) {
        const session = snapshot.sessions[0];
        await setDoc(doc(db, 'sessions', session.sessionId), { ...session, lastSyncedAt: timestamp });
      }
      if (snapshot.feedbacks && snapshot.feedbacks.length > 0) {
        for (const fb of snapshot.feedbacks) {
          await setDoc(doc(db, 'feedbacks', fb.feedbackId), { ...fb, syncedAt: timestamp });
        }
      }
      return true;
    } catch (e) {
      console.warn('Firebase Cloud sync notice (operating in local offline-first mode):', e);
      return false;
    }
  }

  public static async fetchCloudFeedbacks() {
    if (!this.isConfigured()) return [];
    try {
      const q = query(collection(db, 'feedbacks'), orderBy('submittedAt', 'desc'), limit(20));
      const querySnapshot = await getDocs(q);
      const docs: any[] = [];
      querySnapshot.forEach((doc) => docs.push(doc.data()));
      return docs;
    } catch {
      return [];
    }
  }
}
