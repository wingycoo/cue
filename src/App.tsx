import { useState, useEffect } from 'react';
import { useNotes } from './hooks/useNotes';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { SettingsModal } from './components/SettingsModal';
import { GuideModal } from './components/GuideModal';
import { ErrorModal } from './components/ErrorModal';
import { AuthModal } from './components/AuthModal';
import { initWidgetActionListeners } from './services/widget';

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

  // Listen for native widget interactions (e.g. "+ 새 노트" quick add or card tap)
  useEffect(() => {
    return initWidgetActionListeners(
      () => {
        handleCreateNote();
      },
      (noteId) => {
        handleSelectNote(noteId);
      }
    );
  }, []);

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
        onOpenErrorModal={() => {
          if (syncStatus.errorMessage) {
            setErrorModalInfo({
              title: '동기화 오류 상세',
              message: syncStatus.errorMessage,
              isPermissionError:
                syncStatus.errorMessage.includes('403') ||
                syncStatus.errorMessage.includes('권한'),
            });
          }
        }}
      />

      <div className={`app-container mobile-view-${mobileView}`}>
        <Sidebar
          notes={notes}
          selectedNoteId={selectedNoteId}
          searchQuery={searchQuery}
          isLoggedIn={!!accessToken}
          onLogin={handleLogin}
          onSearchChange={setSearchQuery}
          onSelectNote={handleSelectNote}
          onCreateNote={handleCreateNote}
          onDeleteNote={deleteNote}
          onTogglePin={togglePin}
        />

        <Editor
          note={selectedNote}
          isLoggedIn={!!accessToken}
          onLogin={handleLogin}
          onUpdateNote={updateNote}
          onDeleteNote={deleteNote}
          onTogglePin={togglePin}
          onUploadImage={uploadImage}
          onBackToList={() => setMobileView('list')}
        />
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

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

      <ErrorModal
        isOpen={!!errorModalInfo}
        title={errorModalInfo?.title || ''}
        message={errorModalInfo?.message || ''}
        isPermissionError={errorModalInfo?.isPermissionError ?? true}
        onClose={() => setErrorModalInfo(null)}
        onRelogin={handleRelogin}
        onLogout={() => {
          handleLogout();
          setErrorModalInfo(null);
        }}
      />
    </div>
  );
}

export default App;
