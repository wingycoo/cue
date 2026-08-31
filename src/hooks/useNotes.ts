import { useState, useEffect, useCallback, useRef } from 'react';
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
    gcsBucket: 'wingycoo-cue',
    googleClientId: '387585564320-gadbr3nss1o91p9lrmjrnppqimrc6rje.apps.googleusercontent.com',
    autoSync: true,
  });
  const [userProfile, setUserProfile] = useState<UserProfile | undefined>(
    getStoredUserProfile()
  );
  const [accessToken, setAccessToken] = useState<string | null>(getStoredAccessToken());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ state: 'idle' });
  const [searchQuery, setSearchQuery] = useState('');

  // Debounce timers ref for unthrottled GCS uploads
  const uploadTimers = useRef<{ [noteId: string]: number }>({});

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
            errorMessage: 'Google 로그인 또는 권한 오류',
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
        setSyncStatus({ state: 'offline', errorMessage: 'GCS 설정 필요' });
        return;
      }

      setSyncStatus({ state: 'syncing' });

      try {
        const bucket = settings.gcsBucket;
        const currentLocal = await getAllLocalNotes();

        // Step A: Fetch remote notes from GCS
        const remoteNotes = await listNotesFromGCS(bucket, token);

        // Step B: Merge local & remote
        const processMap = new Map<string, Note>();

        for (const localNote of currentLocal) {
          processMap.set(localNote.id, localNote);
        }

        for (const remoteNote of remoteNotes) {
          const localNote = processMap.get(remoteNote.id);
          if (!localNote) {
            await saveLocalNote(remoteNote);
            processMap.set(remoteNote.id, remoteNote);
          } else {
            if (remoteNote.updatedAt > localNote.updatedAt) {
              await saveLocalNote(remoteNote);
              processMap.set(remoteNote.id, remoteNote);
            } else if (localNote.updatedAt > remoteNote.updatedAt) {
              await uploadNoteToGCS(bucket, token, localNote);
            }
          }
        }

        const updatedList: Note[] = Array.from(processMap.values());
        updatedList.sort((a, b) => b.updatedAt - a.updatedAt);
        setNotes(updatedList);
        updateAppBadge(updatedList.length);

        setSyncStatus({ state: 'synced', lastSyncedAt: Date.now() });
      } catch (err: any) {
        console.error('Sync Error:', err);
        setSyncStatus({
          state: 'error',
          errorMessage: err?.message || 'GCS 동기화 실패',
        });
      }
    },
    [accessToken, settings.gcsBucket]
  );

  // Auto Sync trigger on initial login
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
      title: '',
      content: '',
      images: [],
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveLocalNote(newNote);
    setNotes((prev) => [newNote, ...prev]);
    setSelectedNoteId(newNote.id);

    if (accessToken && settings.gcsBucket) {
      uploadNoteToGCS(settings.gcsBucket, accessToken, newNote).catch(console.error);
    }
  };

  /**
   * Debounced note updater (Updates local state & IndexedDB immediately, delays GCS network upload)
   */
  const updateNote = useCallback(
    (updatedFields: Partial<Note> & { id: string }, immediateGCS = false) => {
      setNotes((prevNotes) => {
        const target = prevNotes.find((n) => n.id === updatedFields.id);
        if (!target) return prevNotes;

        const modifiedNote: Note = {
          ...target,
          ...updatedFields,
          updatedAt: Date.now(),
        };

        // 1. Instant local IndexedDB save (non-blocking)
        saveLocalNote(modifiedNote).catch(console.error);

        // 2. Debounced GCS network upload (1.2s delay after last keystroke)
        if (accessToken && settings.gcsBucket) {
          if (uploadTimers.current[modifiedNote.id]) {
            window.clearTimeout(uploadTimers.current[modifiedNote.id]);
          }

          const runUpload = () => {
            setSyncStatus({ state: 'syncing' });
            uploadNoteToGCS(settings.gcsBucket, accessToken, modifiedNote)
              .then(() => {
                setSyncStatus({ state: 'synced', lastSyncedAt: Date.now() });
              })
              .catch((err) => {
                console.error('GCS Upload Error:', err);
                setSyncStatus({ state: 'error', errorMessage: 'GCS 저장 오류' });
              });
          };

          if (immediateGCS) {
            runUpload();
          } else {
            uploadTimers.current[modifiedNote.id] = window.setTimeout(runUpload, 1200);
          }
        }

        return prevNotes.map((n) => (n.id === modifiedNote.id ? modifiedNote : n));
      });
    },
    [accessToken, settings.gcsBucket]
  );

  const deleteNote = async (id: string) => {
    if (uploadTimers.current[id]) {
      window.clearTimeout(uploadTimers.current[id]);
    }
    await deleteLocalNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));

    if (selectedNoteId === id) {
      setSelectedNoteId(null);
    }

    if (accessToken && settings.gcsBucket) {
      deleteNoteFromGCS(settings.gcsBucket, accessToken, id).catch(console.error);
    }
  };

  const togglePin = (id: string) => {
    const target = notes.find((n) => n.id === id);
    if (target) {
      updateNote({ id, pinned: !target.pinned }, true);
    }
  };

  const uploadImage = async (file: File | Blob) => {
    if (!accessToken || !settings.gcsBucket) {
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
