import React from 'react';
import { Plus, Search, Pin, Trash2, FileText } from 'lucide-react';
import type { Note } from '../types';

interface SidebarProps {
  notes: Note[];
  selectedNoteId: string | null;
  searchQuery: string;
  isLoggedIn: boolean;
  onLogin: () => void;
  onSearchChange: (q: string) => void;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onDeleteNote: (id: string) => void;
  onTogglePin: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  notes,
  selectedNoteId,
  searchQuery,
  isLoggedIn,
  onLogin,
  onSearchChange,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onTogglePin,
}) => {
  const pinnedNotes = notes.filter((n) => n.pinned);
  const unpinnedNotes = notes.filter((n) => !n.pinned);

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const handleCreateClick = () => {
    if (!isLoggedIn) {
      onLogin();
    } else {
      onCreateNote();
    }
  };

  const renderCard = (note: Note) => {
    const isActive = note.id === selectedNoteId;
    const plainText = stripHtml(note.content).trim();

    // First line or snippet as main card title
    const firstLine = plainText.split('\n')[0] || '';
    const displayTitle = firstLine
      ? firstLine.length > 28
        ? firstLine.substring(0, 28) + '...'
        : firstLine
      : '새 업무 노트';
    const snippetText = plainText ? plainText : '작성된 내용이 없습니다.';

    return (
      <div
        key={note.id}
        className={`note-card ${isActive ? 'active' : ''}`}
        onClick={() => onSelectNote(note.id)}
      >
        <div className="note-card-title">
          <span className="truncate">{displayTitle}</span>
          {note.pinned && <Pin size={13} className="text-indigo-400 fill-indigo-400/20 shrink-0" />}
        </div>
        <div className="note-card-snippet">{snippetText}</div>
        <div className="note-card-meta">
          <span>{formatDate(note.updatedAt)}</span>
          <div className="card-actions" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={`icon-btn ${note.pinned ? 'text-indigo-400' : ''}`}
              onClick={() => onTogglePin(note.id)}
              title={note.pinned ? '고정 해제' : '상단 고정'}
            >
              <Pin size={13} />
            </button>
            <button
              type="button"
              className="icon-btn danger"
              onClick={() => onDeleteNote(note.id)}
              title="노트 삭제"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <aside className="app-sidebar">
      <div className="sidebar-header">
        <button
          type="button"
          className="glass-btn btn-primary w-full justify-center"
          onClick={handleCreateClick}
          title="새 노트 작성"
        >
          <Plus size={18} />
          <span>새 노트 작성</span>
        </button>

        <div className="relative">
          <input
            type="text"
            className="glass-input pl-9"
            placeholder="노트 본문 검색..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>
      </div>

      <div className="note-list-scroll">
        {notes.length === 0 ? (
          <div className="empty-state py-12">
            <FileText size={32} className="opacity-40" />
            <p className="text-sm">
              {isLoggedIn ? (
                <>
                  노트가 없습니다.
                  <br />새 노트를 추가해보세요!
                </>
              ) : (
                <>
                  로그인 후 노트를 작성하고
                  <br />GCS에 안전하게 동기화하세요.
                </>
              )}
            </p>
          </div>
        ) : (
          <>
            {pinnedNotes.length > 0 && (
              <>
                <div className="section-label">고정됨</div>
                {pinnedNotes.map(renderCard)}
              </>
            )}

            {unpinnedNotes.length > 0 && (
              <>
                <div className="section-label">
                  {pinnedNotes.length > 0 ? '모든 노트' : '노트 목록'}
                </div>
                {unpinnedNotes.map(renderCard)}
              </>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
