import { useState, useEffect } from 'react';
import { useNotes } from './hooks/useNotes';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { SettingsModal } from './components/SettingsModal';
import { GuideModal } from './components/GuideModal';

export function App() {
  const {
    notes,
    allNotesCount,
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
  } = useNotes();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'editor'>('list');

  // When a note is selected on mobile, auto switch to editor view
  const handleSelectNote = (id: string) => {
    setSelectedNoteId(id);
    setMobileView('editor');
  };

  const handleCreateNote = async () => {
    await createNewNote();
    setMobileView('editor');
  };

  // If selected note is deleted, fallback to list on mobile
  useEffect(() => {
    if (!selectedNote && mobileView === 'editor' && window.innerWidth < 768) {
      setMobileView('list');
    }
  }, [selectedNote, mobileView]);

  return (
    <div className="app-shell">
      <Header
        userProfile={userProfile}
        accessToken={accessToken}
        syncStatus={syncStatus}
        notesCount={allNotesCount}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onSyncNow={() => performSync()}
      />

      <div className={`app-container mobile-view-${mobileView}`}>
        <Sidebar
          notes={notes}
          selectedNoteId={selectedNoteId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelectNote={handleSelectNote}
          onCreateNote={handleCreateNote}
          onDeleteNote={deleteNote}
          onTogglePin={togglePin}
        />

        <Editor
          note={selectedNote}
          onUpdateNote={updateNote}
          onDeleteNote={deleteNote}
          onTogglePin={togglePin}
          onUploadImage={uploadImage}
          onBackToList={() => setMobileView('list')}
        />
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onSave={updateSettings}
        onClose={() => setIsSettingsOpen(false)}
      />

      <GuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}

export default App;
