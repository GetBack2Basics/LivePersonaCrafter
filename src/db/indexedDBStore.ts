import { DB_CONFIG } from './schema';
import type { DatabaseSnapshot } from './schema';
import type { MeetingSession, TranscriptEntry, PersonaProfile, BotResponse, ParticipantFeedback } from '../types';

export class IndexedDBStore {
  private static dbPromise: Promise<IDBDatabase> | null = null;

  private static getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_CONFIG.dbName, DB_CONFIG.version);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'sessionId' });
        }
        if (!db.objectStoreNames.contains('transcripts')) {
          const store = db.createObjectStore('transcripts', { keyPath: 'transcriptId' });
          store.createIndex('sessionId', 'sessionId', { unique: false });
        }
        if (!db.objectStoreNames.contains('personas')) {
          db.createObjectStore('personas', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('responses')) {
          const store = db.createObjectStore('responses', { keyPath: 'responseId' });
          store.createIndex('sessionId', 'sessionId', { unique: false });
        }
        if (!db.objectStoreNames.contains('feedbacks')) {
          const store = db.createObjectStore('feedbacks', { keyPath: 'feedbackId' });
          store.createIndex('responseId', 'responseId', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  public static async saveSnapshot(snapshot: Partial<DatabaseSnapshot>): Promise<boolean> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(['sessions', 'transcripts', 'personas', 'responses', 'feedbacks'], 'readwrite');

      if (snapshot.sessions) {
        const store = tx.objectStore('sessions');
        for (const session of snapshot.sessions) store.put(session);
      }
      if (snapshot.transcripts) {
        const store = tx.objectStore('transcripts');
        for (const t of snapshot.transcripts) store.put(t);
      }
      if (snapshot.personas) {
        const store = tx.objectStore('personas');
        for (const p of snapshot.personas) store.put(p);
      }
      if (snapshot.botResponses) {
        const store = tx.objectStore('responses');
        for (const r of snapshot.botResponses) store.put(r);
      }
      if (snapshot.feedbacks) {
        const store = tx.objectStore('feedbacks');
        for (const f of snapshot.feedbacks) store.put(f);
      }

      return new Promise((resolve) => {
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch (e) {
      console.warn('IndexedDB write error:', e);
      return false;
    }
  }

  public static async getAllData(): Promise<{
    sessions: MeetingSession[];
    transcripts: TranscriptEntry[];
    personas: PersonaProfile[];
    botResponses: BotResponse[];
    feedbacks: ParticipantFeedback[];
  }> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(['sessions', 'transcripts', 'personas', 'responses', 'feedbacks'], 'readonly');

      const getAll = <T>(storeName: string): Promise<T[]> => {
        return new Promise((resolve) => {
          const req = tx.objectStore(storeName).getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        });
      };

      const [sessions, transcripts, personas, botResponses, feedbacks] = await Promise.all([
        getAll<MeetingSession>('sessions'),
        getAll<TranscriptEntry>('transcripts'),
        getAll<PersonaProfile>('personas'),
        getAll<BotResponse>('responses'),
        getAll<ParticipantFeedback>('feedbacks')
      ]);

      return { sessions, transcripts, personas, botResponses, feedbacks };
    } catch {
      return { sessions: [], transcripts: [], personas: [], botResponses: [], feedbacks: [] };
    }
  }

  public static async clearDatabase(): Promise<boolean> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(['sessions', 'transcripts', 'personas', 'responses', 'feedbacks'], 'readwrite');
      tx.objectStore('sessions').clear();
      tx.objectStore('transcripts').clear();
      tx.objectStore('personas').clear();
      tx.objectStore('responses').clear();
      tx.objectStore('feedbacks').clear();
      return true;
    } catch {
      return false;
    }
  }
}
