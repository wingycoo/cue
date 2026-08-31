import { useState, useEffect, useCallback } from 'react';
import type { Note, AppSettings, UserProfile, SyncStatus } from '../types';
import {
  getAllLocalNotes,
  saveLocalNote,
  deleteLocalNote,
  getAppSettings,
  saveAppSettings as saveDbSettings,
} from '../services/db';
import { updateAppBadge } from '../services/badge';
import {
  getStoredAccessToken,
  getStoredUserProfile,
  initGoogleAuth,
  googleLogout,
  requestGoogleLogin,
} from '../services/auth';
import {
  uploadNoteToGCS,
  deleteNoteFromGCS,
  listNotesFromGCS,
  uploadImageToGCS,
} from '../services/gcs';

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>({
    gcsBucket: '',
    googleClientId: '',
    autoSync: true,
  });
  const [userProfile, setUserProfile] = useState<UserProfile | undefined>(
    getStoredUserProfile()
  );
  const [accessToken, setAccessToken] = useState<string | null>(getStoredAccessToken());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ state: 'idle' });
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Initial Load from Local Storage & IndexedDB
  useEffect(() => {
    (async () => {
      const loadedSettings = await getAppSettings();
      setSettings(loadedSettings);

      const localNotes = await getAllLocalNotes();
      setNotes(localNotes);
      if (localNotes.length > 0 && !selectedNoteId) {
        setSelectedNoteId(localNotes[0].id);
      }
      updateAppBadge(localNotes.length);
    })();
  }, []);

  // Update badge whenever notes list changes
  useEffect(() => {
    updateAppBadge(notes.length);
  }, [notes.length]);

  // 2. Initialize Google Auth Client
  useEffect(() => {
    if (settings.googleClientId) {
      initGoogleAuth(
        settings.googleClientId,
        (token, user) => {
          setAccessToken(token);
          if (user) setUserProfile(user);
        },
        (_err) => {
          setSyncStatus({
            state: 'error',
            errorMessage: 'Google login failed or scope denied.',
          });
        }
      ).catch(console.error);
    }
  }, [settings.googleClientId]);

  // 3. Full GCS Sync Engine
  const performSync = useCallback(
    async (tokenToUse?: string) => {
      const token = tokenToUse || accessToken;
      if (!token || !settings.gcsBucket) {
        setSyncStatus({ state: 'offline', errorMessage: 'GCS or Login missing' });
        return;
      }

      setSyncStatus({ state: 'syncing' });

      try {
        const bucket = settings.gcsBucket;
        const currentLocal = await getAllLocalNotes();

        // Step A: Fetch remote notes from GCS
        const remoteNotes = await listNotesFromGCS(bucket, token);
        const remoteMap = new Map(remoteNotes.map((n) => [n.id, n]));

        // Step B: Merge local & remote
        const updatedList: Note[] = [];
        const processMap = new Map<string, Note>();

        for (const localNote of currentLocal) {
          processMap.set(localNote.id, localNote);
        }

        for (const remoteNote of remoteNotes) {
          const localNote = processMap.get(remoteNote.id);
          if (!localNote) {
            // New from remote
            await saveLocalNote(remoteNote);
            processMap.set(remoteNote.id, remoteNote);
          } else {
            // Conflict resolution by updatedAt timestamp
            if (remoteNote.updatedAt > localNote.updatedAt) {
              await saveLocalNote(remoteNote);
              processMap.set(remoteNote.id, remoteNote);
            } else if (localNote.updatedAt > remoteNote.updatedAt) {
              // Upload local newer version to GCS
              await uploadNoteToGCS(bucket, token, localNote);
            }
          }
        }

        // Step C: Push any local notes not on remote to GCS
        for (const localNote of processMap.values()) {
          if (!remoteMap.has(localNote.id)) {
            await uploadNoteToGCS(bucket, token, localNote);
          }
          updatedList.push(localNote);
        }

        // Re-sort
        updatedList.sort((a, b) => b.updatedAt - a.updatedAt);
        setNotes(updatedList);
        updateAppBadge(updatedList.length);

        setSyncStatus({ state: 'synced', lastSyncedAt: Date.now() });
      } catch (err: any) {
        console.error('Sync Error:', err);
        setSyncStatus({
          state: 'error',
          errorMessage: err?.message || 'Sync failed',
        });
      }
    },
    [accessToken, settings.gcsBucket]
  );

  // Auto Sync trigger on login or interval
  useEffect(() => {
    if (accessToken && settings.gcsBucket) {
      performSync();
    }
  }, [accessToken, settings.gcsBucket, performSync]);

  // Actions
  const handleLogin = () => {
    if (!settings.googleClientId) {
      alert('Google Client ID를 설정 페이지에서 먼저 입력해 주세요.');
      return;
    }
    requestGoogleLogin();
  };

  const handleLogout = () => {
    googleLogout();
    setAccessToken(null);
    setUserProfile(undefined);
    setSyncStatus({ state: 'idle' });
  };

  const createNewNote = async () => {
    const newNote: Note = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: '새 업무 노트',
      content: '<p>자유롭게 내용을 작성하거나 이미지를 붙여넣으세요...</p>',
      images: [],
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveLocalNote(newNote);
    const updated = [newNote, ...notes];
    setNotes(updated);
    setSelectedNoteId(newNote.id);
    updateAppBadge(updated.length);

    if (accessToken && settings.gcsBucket) {
      uploadNoteToGCS(settings.gcsBucket, accessToken, newNote).catch(console.error);
    }
  };

  const updateNote = async (updatedFields: Partial<Note> & { id: string }) => {
    const target = notes.find((n) => n.id === updatedFields.id);
    if (!target) return;

    const modifiedNote: Note = {
      ...target,
      ...updatedFields,
      updatedAt: Date.now(),
    };

    await saveLocalNote(modifiedNote);

    const newNotes = notes.map((n) => (n.id === modifiedNote.id ? modifiedNote : n));
    setNotes(newNotes);

    if (accessToken && settings.gcsBucket) {
      uploadNoteToGCS(settings.gcsBucket, accessToken, modifiedNote).catch(
        console.error
      );
    }
  };

  const deleteNote = async (id: string) => {
    await deleteLocalNote(id);
    const remaining = notes.filter((n) => n.id !== id);
    setNotes(remaining);
    updateAppBadge(remaining.length);

    if (selectedNoteId === id) {
      setSelectedNoteId(remaining.length > 0 ? remaining[0].id : null);
    }

    if (accessToken && settings.gcsBucket) {
      deleteNoteFromGCS(settings.gcsBucket, accessToken, id).catch(console.error);
    }
  };

  const togglePin = async (id: string) => {
    const target = notes.find((n) => n.id === id);
    if (target) {
      await updateNote({ id, pinned: !target.pinned });
    }
  };

  const uploadImage = async (file: File | Blob) => {
    if (!accessToken || !settings.gcsBucket) {
      // Return local Object URL fallback if offline
      return URL.createObjectURL(file);
    }
    const res = await uploadImageToGCS(settings.gcsBucket, accessToken, file);
    return res.publicUrl;
  };

  const updateSettings = async (newSettings: AppSettings) => {
    await saveDbSettings(newSettings);
    setSettings(newSettings);
  };

  // Filtered Notes
  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedNote = notes.find((n) => n.id === selectedNoteId) || null;

  return {
    notes: filteredNotes,
    allNotesCount: notes.length,
    selectedNote,
    selectedNoteId,
    setSelectedNoteId,
    createNewNote,
    updateNote,
    deleteNote,
    togglePin,
    uploadImage,
    settings,
    updateSettings,
    userProfile,
    accessToken,
    handleLogin,
    handleLogout,
    syncStatus,
    performSync,
    searchQuery,
    setSearchQuery,
  };
}
