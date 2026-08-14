# Firebase Auth & User Administration — Complete Setup Guide

## What This System Implements

A full user authentication lifecycle and Firestore database system for **LivePersonaCrafter** (Vite + React + TypeScript + Firebase):

- Email/password registration with email verification
- Google OAuth (redirect flow — avoids COOP/COEP isolation blocking)
- User account documents in Firestore (`userAccounts` collection) with status tracking (`pending`, `approved`, `deactivated`)
- Admin console — approve, deactivate, reactivate, grant/revoke admin, send password reset
- Password change from within the app (re-authenticates first)
- Login tracking — `firstLoginAt`, `lastLoginAt`, `totalLogins`, `activityCount`
- Bootstrap admin — hardcoded email self-creates with admin + approved status on first sign-in
- **Full Firestore Cloud Sync**:
  - `sessions` — Meeting session state and telemetry
  - `transcripts` — Spoken microphone transcripts
  - `personas` — Persona profiles
  - `bot_responses` — AI persona debate answers
  - `feedbacks` — Human alignment ratings
  - `llm_traces` — Two-stage LLM call traces (Question Extraction + Persona Response)

---

## Step 1 — Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Create a new project (e.g. `meet-persona-ai`).
3. **Authentication → Sign-in method → Enable**:
   - Email/Password
   - Google
4. **Authentication → Settings → Authorized domains**:
   - Add `localhost` and your production deployment domain.
5. **Firestore Database**:
   - Click **Create database**.
   - Select production mode and your preferred geographic location.
6. **Project Settings → Your apps**:
   - Register Web app (`LivePersonaCrafter`).
   - Copy Firebase configuration keys for your `.env` file.

---

## Step 2 — Dependencies

```bash
npm install firebase
```

---

## Step 3 — Environment Variables (Vite)

Create `.env` in your project root:

```env
VITE_FIREBASE_API_KEY=AIzaSyYourActualApiKeyHere
VITE_FIREBASE_AUTH_DOMAIN=meet-persona-ai.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=meet-persona-ai
VITE_FIREBASE_STORAGE_BUCKET=meet-persona-ai.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1029384756
VITE_FIREBASE_APP_ID=1:1029384756:web:abcd1234efgh5678
```

> **Note**: Vite requires client-accessible environment variables to begin with `VITE_`.

---

## Step 4 — Firebase & Firestore Initialization

File: `src/db/firebaseConfig.ts`

```ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
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
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export class FirebaseStore {
  public static isConfigured(): boolean {
    return Boolean(db);
  }

  // Save session to Firestore
  public static async saveSession(session: MeetingSession): Promise<boolean> {
    try {
      await setDoc(doc(db, 'sessions', session.sessionId), { ...session, updatedAt: new Date().toISOString() });
      return true;
    } catch (e) {
      console.warn('Firestore saveSession notice:', e);
      return false;
    }
  }

  // Save transcript entry to Firestore
  public static async saveTranscript(entry: TranscriptEntry): Promise<boolean> {
    try {
      await setDoc(doc(db, 'transcripts', entry.transcriptId), { ...entry, updatedAt: new Date().toISOString() });
      return true;
    } catch (e) {
      console.warn('Firestore saveTranscript notice:', e);
      return false;
    }
  }

  // Save persona to Firestore
  public static async savePersona(persona: PersonaProfile): Promise<boolean> {
    try {
      await setDoc(doc(db, 'personas', persona.id), { ...persona, updatedAt: new Date().toISOString() });
      return true;
    } catch (e) {
      console.warn('Firestore savePersona notice:', e);
      return false;
    }
  }

  // Save bot response to Firestore
  public static async saveBotResponse(response: BotResponse): Promise<boolean> {
    try {
      await setDoc(doc(db, 'bot_responses', response.responseId), { ...response, updatedAt: new Date().toISOString() });
      return true;
    } catch (e) {
      console.warn('Firestore saveBotResponse notice:', e);
      return false;
    }
  }

  // Save participant feedback to Firestore
  public static async saveFeedback(feedback: ParticipantFeedback): Promise<boolean> {
    try {
      await setDoc(doc(db, 'feedbacks', feedback.feedbackId), { ...feedback, updatedAt: new Date().toISOString() });
      return true;
    } catch (e) {
      console.warn('Firestore saveFeedback notice:', e);
      return false;
    }
  }

  // Save LLM trace (Question Extraction or Persona Response) to Firestore
  public static async saveLlmTrace(trace: LlmCallTrace): Promise<boolean> {
    try {
      await setDoc(doc(db, 'llm_traces', trace.traceId), { ...trace, updatedAt: new Date().toISOString() });
      return true;
    } catch (e) {
      console.warn('Firestore saveLlmTrace notice:', e);
      return false;
    }
  }

  // Hydrate all data from Firestore collections on startup
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
}
```

---

## Step 5 — Firestore Data Model

### 1. `userAccounts` Collection (Document ID: Firebase Auth `uid`)

```json
{
  "uid": "string",
  "email": "user@example.com",
  "displayName": "Jane User",
  "isAdmin": false,
  "status": "approved",
  "emailVerified": true,
  "createdAt": "2026-08-14T00:00:00.000Z",
  "approvedAt": "2026-08-14T00:00:00.000Z",
  "approvedBy": "system",
  "firstLoginAt": "2026-08-14T00:00:00.000Z",
  "lastLoginAt": "2026-08-14T04:30:00.000Z",
  "totalLogins": 12,
  "activityCount": 45
}
```

**Status Values**:
- `pending`: Registered, awaiting admin approval
- `approved`: Can access protected engine features
- `deactivated`: Disabled by administrator

### 2. LivePersonaCrafter Collections

- **`sessions`** (`sessionId`): Active debate session metadata and target persona
- **`transcripts`** (`transcriptId`): Spoken microphone text entries (`speakerRole: 'human' | 'bot'`)
- **`personas`** (`id`): Persona profiles (`GetBack2Basics`, custom personas)
- **`bot_responses`** (`responseId`): Generated AI debate responses with model name, latency, and alignment score
- **`feedbacks`** (`feedbackId`): Participant evaluation scores (1–5 stars) and comments
- **`llm_traces`** (`traceId`): Plain-text LLM call logs (Stage 1 Question Extraction & Stage 2 Persona Response)

---

## Step 6 — Auth Lifecycle & Admin Approval

### 1. User Registration Flow
1. Create Firebase Auth account via `createUserWithEmailAndPassword(auth, email, password)`.
2. Send verification email via `sendEmailVerification(user)`.
3. Create corresponding document in `userAccounts` with `status: 'pending'` (unless email matches bootstrap admin email).

### 2. Google OAuth Redirect Flow
Use redirect flow to avoid cross-origin isolation blocking:

```ts
import { signInWithRedirect, getRedirectResult } from 'firebase/auth';

// Trigger redirect
await signInWithRedirect(auth, googleProvider);

// On return / mount
const result = await getRedirectResult(auth);
if (result?.user) {
  // Sync with userAccounts collection
}
```

### 3. Bootstrap Admin Rule
If the signing-in user's email matches the configured admin email (`VITE_ADMIN_EMAIL`):
- Auto-set `isAdmin: true` and `status: 'approved'`.

---

## Step 7 — Security Rules (`firestore.rules`)

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User Accounts
    match /userAccounts/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update, delete: if request.auth != null && 
        (request.auth.uid == userId || get(/databases/$(database)/documents/userAccounts/$(request.auth.uid)).data.isAdmin == true);
    }
    
    // LivePersonaCrafter Data Collections
    match /sessions/{document=**} { allow read, write: if true; }
    match /transcripts/{document=**} { allow read, write: if true; }
    match /personas/{document=**} { allow read, write: if true; }
    match /bot_responses/{document=**} { allow read, write: if true; }
    match /feedbacks/{document=**} { allow read, write: if true; }
    match /llm_traces/{document=**} { allow read, write: if true; }
  }
}
```

---

## Step 8 — Application Integration Check

Verify your setup:
1. Initialize app with valid `.env` credentials.
2. Voice recording & AI synthesis writes to `transcripts`, `bot_responses`, and `llm_traces` in Firestore.
3. Refreshing the browser automatically re-hydrates data from Firestore collections on startup via `FirebaseStore.fetchAllCloudData()`.
