import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Note, AppSettings } from '../types';

interface CueDBSchema extends DBSchema {
  notes: {
    key: string;
    value: Note;
    indexes: {
      'by-updatedAt': number;
      'by-pinned': number;
    };
  };
  settings: {
    key: string;
    value: AppSettings;
  };
}

const DB_NAME = 'cue_notes_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<CueDBSchema>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<CueDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
        noteStore.createIndex('by-updatedAt', 'updatedAt');
        noteStore.createIndex('by-pinned', 'pinned');

        db.createObjectStore('settings');
      },
    });
  }
  return dbPromise;
}

// --- Note DB Operations ---

export async function getAllLocalNotes(): Promise<Note[]> {
  const db = await getDB();
  const notes = await db.getAllFromIndex('notes', 'by-updatedAt');
  // Return non-deleted notes sorted newest first
  return notes
    .filter(n => !n.isDeleted)
    .reverse();
}

export async function getLocalNote(id: string): Promise<Note | undefined> {
  const db = await getDB();
  return db.get('notes', id);
}

export async function saveLocalNote(note: Note): Promise<void> {
  const db = await getDB();
  await db.put('notes', note);
}

export async function deleteLocalNote(id: string): Promise<void> {
  const db = await getDB();
  const existing = await db.get('notes', id);
  if (existing) {
    // Mark as deleted for sync tracking
    existing.isDeleted = true;
    existing.updatedAt = Date.now();
    await db.put('notes', existing);
  } else {
    await db.delete('notes', id);
  }
}

export async function hardDeleteLocalNote(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('notes', id);
}

// --- Settings Operations ---

const DEFAULT_SETTINGS: AppSettings = {
  gcsBucket: localStorage.getItem('cue_gcs_bucket') || 'wingycoo-cue',
  googleClientId:
    localStorage.getItem('cue_google_client_id') ||
    '387585564320-gadbr3nss1o91p9lrmjrnppqimrc6rje.apps.googleusercontent.com',
  autoSync: true,
};

export async function getAppSettings(): Promise<AppSettings> {
  const db = await getDB();
  const settings = await db.get('settings', 'app_config');
  if (settings) {
    return {
      gcsBucket: settings.gcsBucket || DEFAULT_SETTINGS.gcsBucket,
      googleClientId: settings.googleClientId || DEFAULT_SETTINGS.googleClientId,
      autoSync: settings.autoSync ?? true,
    };
  }
  return DEFAULT_SETTINGS;
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  const db = await getDB();
  await db.put('settings', settings, 'app_config');
  localStorage.setItem('cue_gcs_bucket', settings.gcsBucket);
  if (settings.googleClientId) {
    localStorage.setItem('cue_google_client_id', settings.googleClientId);
  } else {
    localStorage.removeItem('cue_google_client_id');
  }
}
