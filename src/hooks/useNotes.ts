import { useState, useEffect, useCallback, useRef } from 'react';
import type { Note, AppSettings, UserProfile, SyncStatus, ErrorModalInfo, AuthSession } from '../types';
import {
  getAllLocalNotes,
  saveLocalNote,
  deleteLocalNote,
  getAppSettings,
  saveAppSettings as saveDbSettings,
} from '../services/db';
import { updateAppBadge } from '../services/badge';
import { updateNativeWidget } from '../services/widget';
import {
  getStoredSession,
  logoutUser,
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
    autoSync: true,
  });

  // Authentication State with Auto-Login from Local Storage
  const [session, setSession] = useState<AuthSession | null>(() => getStoredSession());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const userProfile: UserProfile | undefined = session?.user;
  const accessToken: string | null = session ? session.token : null;

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    state: session ? 'synced' : 'idle',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [errorModalInfo, setErrorModalInfo] = useState<ErrorModalInfo | null>(null);

  // Debounce timers ref for unthrottled GCS uploads
  const uploadTimers = useRef<{ [noteId: string]: number }>({});

  // 1. Initial Load from Local Storage & IndexedDB
  useEffect(() => {
    (async () => {
      const loadedSettings = await getAppSettings();
      setSettings(loadedSettings);

      const localNotes = await getAllLocalNotes();
      setNotes(localNotes);

      const hasAuth = getStoredSession() !== null;
      if (localNotes.length > 0 && !selectedNoteId && hasAuth) {
        setSelectedNoteId(localNotes[0].id);
      }
      updateAppBadge(localNotes.length);
    })();
  }, []);

  // Update badge & widget whenever notes list changes
  useEffect(() => {
    updateAppBadge(notes.length);
    const topNote = notes.find((n) => n.pinned) || notes[0] || null;
    updateNativeWidget(topNote);
  }, [notes]);

  // 2. Full GCS Sync Engine (if valid external token is available)
  const performSync = useCallback(
    async (tokenToUse?: string) => {
      const token = tokenToUse || accessToken;
      if (!token || !settings.gcsBucket || token.startsWith('cue_session_')) {
        setSyncStatus({ state: 'synced' });
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

        // Upload any local-only notes
        for (const localNote of currentLocal) {
          const remoteFound = remoteNotes.find((rn) => rn.id === localNote.id);
          if (!remoteFound && !localNote.isDeleted) {
            await uploadNoteToGCS(bucket, token, localNote);
          }
        }

        const freshLocal = await getAllLocalNotes();
        setNotes(freshLocal);
        setSyncStatus({ state: 'synced', lastSyncedAt: Date.now() });
      } catch (err: any) {
        console.error('GCS Sync Error:', err);
        setSyncStatus({
          state: 'error',
          errorMessage: err?.message || '동기화 중 오류 발생',
        });
      }
    },
    [accessToken, settings.gcsBucket]
  );

  // Actions
  const handleLogin = () => {
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = (newSession: AuthSession) => {
    setSession(newSession);
    setSyncStatus({ state: 'synced' });
    setNotes((currentNotes) => {
      if (currentNotes.length > 0 && !selectedNoteId) {
        setSelectedNoteId(currentNotes[0].id);
      }
      return currentNotes;
    });
  };

  const handleLogout = () => {
    logoutUser();
    setSession(null);
    setSyncStatus({ state: 'idle' });
  };

  const handleRelogin = () => {
    handleLogout();
    setErrorModalInfo(null);
    setIsAuthModalOpen(true);
  };

  const createNewNote = async () => {
    if (!accessToken) {
      handleLogin();
      return;
    }

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

    if (accessToken && settings.gcsBucket && !accessToken.startsWith('cue_session_')) {
      uploadNoteToGCS(settings.gcsBucket, accessToken, newNote).catch(console.error);
    }
  };

  /**
   * Debounced note updater (Updates local state & IndexedDB immediately, delays GCS network upload if configured)
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

        // 2. Debounced GCS network upload (if valid external token present)
        if (accessToken && settings.gcsBucket && !accessToken.startsWith('cue_session_')) {
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
                setSyncStatus({
                  state: 'error',
                  errorMessage: 'GCS 저장 오류',
                });
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

    if (accessToken && settings.gcsBucket && !accessToken.startsWith('cue_session_')) {
      deleteNoteFromGCS(settings.gcsBucket, accessToken, id).catch(console.error);
    }
  };

  const togglePin = (id: string) => {
    const target = notes.find((n) => n.id === id);
    if (target) {
      updateNote({ id, pinned: !target.pinned }, true);
    }
  };

  const uploadImage = async (file: File | Blob): Promise<string> => {
    if (accessToken && settings.gcsBucket && !accessToken.startsWith('cue_session_')) {
      const res = await uploadImageToGCS(settings.gcsBucket, accessToken, file);
      return res.publicUrl;
    }

    // Local-first: convert to Base64 data URL so it persists in IndexedDB across reloads
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
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
    handleRelogin,
    syncStatus,
    performSync,
    searchQuery,
    setSearchQuery,
    errorModalInfo,
    setErrorModalInfo,
    isAuthModalOpen,
    setIsAuthModalOpen,
    handleAuthSuccess,
  };
}
