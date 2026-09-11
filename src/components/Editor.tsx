import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Image as ImageIcon,
  Pin,
  Trash2,
  FileCode,
  Quote,
  ChevronLeft,
  Copy,
  Check,
  Lock,
  LogIn,
} from 'lucide-react';
import type { Note } from '../types';

interface EditorProps {
  note: Note | null;
  isLoggedIn: boolean;
  onLogin: () => void;
  onUpdateNote: (fields: Partial<Note> & { id: string }) => void;
  onDeleteNote: (id: string) => void;
  onTogglePin: (id: string) => void;
  onUploadImage: (file: File) => Promise<string>;
  onBackToList?: () => void;
}

export const Editor: React.FC<EditorProps> = ({
  note,
  isLoggedIn,
  onLogin,
  onUpdateNote,
  onDeleteNote,
  onTogglePin,
  onUploadImage,
  onBackToList,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  const editor = useEditor({
    editable: isLoggedIn,
    extensions: [
      StarterKit,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Placeholder.configure({
        placeholder: isLoggedIn
          ? '이곳에 자유롭게 업무 노트를 작성하세요... (이미지를 끌어다 놓거나 붙여넣으실 수 있습니다)'
          : 'Google 계정으로 로그인 후 편집할 수 있습니다.',
      }),
    ],
    content: note?.content || '',
    onUpdate: ({ editor }) => {
      if (note && isLoggedIn) {
        onUpdateNote({
          id: note.id,
          content: editor.getHTML(),
        });
      }
    },
    editorProps: {
      handleDrop: (view, event, _slice, moved) => {
        if (!isLoggedIn) return false;
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            onUploadImage(file)
              .then((url) => {
                const { schema } = view.state;
                const node = schema.nodes.image.create({ src: url });
                const transaction = view.state.tr.insert(view.state.selection.from, node);
                view.dispatch(transaction);
              })
              .catch(console.error);
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        if (!isLoggedIn) return false;
        const items = event.clipboardData?.items;
        if (items) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.indexOf('image') === 0) {
              const file = item.getAsFile();
              if (file) {
                event.preventDefault();
                onUploadImage(file)
                  .then((url) => {
                    const { schema } = view.state;
                    const node = schema.nodes.image.create({ src: url });
                    const transaction = view.state.tr.insert(view.state.selection.from, node);
                    view.dispatch(transaction);
                  })
                  .catch(console.error);
                return true;
              }
            }
          }
        }
        return false;
      },
    },
  });

  // Keep editable in sync
  useEffect(() => {
    if (editor) {
      editor.setEditable(isLoggedIn);
    }
  }, [editor, isLoggedIn]);

  // Keep editor content in sync when selected note changes
  useEffect(() => {
    if (editor && note) {
      if (editor.getHTML() !== note.content) {
        editor.commands.setContent(note.content);
      }
    }
  }, [note?.id, editor]);

  // 1. Not logged in AND no note selected: Show Login Required Landing Card
  if (!isLoggedIn && !note) {
    return (
      <div className="editor-workspace empty-state">
        <div className="login-hero-card glass-panel">
          <div className="login-hero-icon">
            <Lock size={30} />
          </div>
          <h2 className="login-hero-title">Google 로그인 후 시작하기</h2>
          <p className="login-hero-desc">
            노트가 Google Cloud Storage에 안전하게 보관되고 모든 기기에서 실시간으로 동기화됩니다.
          </p>
          <button
            type="button"
            className="glass-btn btn-primary login-hero-btn"
            onClick={onLogin}
          >
            <LogIn size={18} />
            <span>Google 계정으로 로그인</span>
          </button>
          <div className="login-hero-badges">
            <span className="login-badge">☁️ GCS 개인 버킷 저장</span>
            <span className="login-badge">⚡ 실시간 자동 동기화</span>
            <span className="login-badge">📱 모바일 PWA 지원</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Logged in AND no note selected: Show Empty Selection Prompt
  if (!note) {
    return (
      <div className="editor-workspace empty-state">
        {onBackToList && (
          <button className="glass-btn mobile-back-btn mb-4" onClick={onBackToList}>
            <ChevronLeft size={16} />
            <span>목록</span>
          </button>
        )}
        <div className="login-hero-icon">
          <ImageIcon size={30} />
        </div>
        <h2 className="login-hero-title">선택된 노트가 없습니다</h2>
        <p className="login-hero-desc">
          목록에서 노트를 선택하거나 [새 노트 작성] 버튼을 클릭하여 작성을 시작하세요.
        </p>
      </div>
    );
  }

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isLoggedIn) {
      onLogin();
      return;
    }
    if (e.target.files && e.target.files[0] && editor) {
      const file = e.target.files[0];
      try {
        const url = await onUploadImage(file);
        editor.chain().focus().setImage({ src: url }).run();
      } catch (err) {
        console.error('Image upload failed:', err);
        alert('이미지 업로드에 실패했습니다. GCS 로그인 상태 및 버킷 설정을 확인해 주세요.');
      }
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCopyContent = async () => {
    if (!note) return;
    try {
      let textToCopy = '';
      if (editor) {
        textToCopy = editor.getText();
      }
      if (!textToCopy && note.content) {
        const tmp = document.createElement('div');
        tmp.innerHTML = note.content;
        tmp.querySelectorAll('p, div, h1, h2, h3, li, pre, blockquote, br').forEach((el) => {
          el.after('\n');
        });
        textToCopy = (tmp.textContent || tmp.innerText || '').trim();
      }

      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy note text:', err);
    }
  };

  return (
    <div className="editor-workspace">
      {/* Read-only login banner if viewing note without login */}
      {!isLoggedIn && (
        <div className="auth-notice-bar">
          <div className="auth-notice-text">
            <Lock size={14} className="shrink-0" />
            <span>읽기 전용 모드입니다. 노트를 편집하려면 Google 로그인이 필요합니다.</span>
          </div>
          <button
            type="button"
            className="glass-btn btn-primary btn-sm shrink-0"
            onClick={onLogin}
          >
            <LogIn size={13} />
            <span>로그인</span>
          </button>
        </div>
      )}

      {/* Editor Header: Back Button + Date Info + Actions */}
      <div className="editor-header">
        <div className="editor-header-left">
          {onBackToList && (
            <button
              type="button"
              className="glass-btn mobile-back-btn"
              onClick={onBackToList}
              title="노트 목록으로 돌아가기"
            >
              <ChevronLeft size={16} />
              <span>목록</span>
            </button>
          )}
          <span className="note-date-text">
            마지막 수정: {formatDate(note.updatedAt)}
          </span>
        </div>

        <div className="editor-header-actions">
          {!isLoggedIn && (
            <button
              type="button"
              className="glass-btn btn-primary btn-sm"
              onClick={onLogin}
              title="Google 로그인하여 편집"
            >
              <LogIn size={14} />
              <span className="btn-label-desktop">로그인</span>
            </button>
          )}
          <button
            type="button"
            className={`glass-btn ${copied ? 'btn-copied' : ''}`}
            onClick={handleCopyContent}
            title="노트 전체 텍스트 복사"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            <span className="btn-label-desktop">{copied ? '복사됨' : '복사'}</span>
          </button>
          <button
            type="button"
            className={`glass-btn ${note.pinned ? 'btn-pinned' : ''}`}
            onClick={() => onTogglePin(note.id)}
            title={note.pinned ? '고정 해제' : '상단 고정'}
          >
            <Pin size={15} />
            <span className="btn-label-desktop">{note.pinned ? '고정됨' : '고정'}</span>
          </button>
          <button
            type="button"
            className="glass-btn btn-delete"
            onClick={() => onDeleteNote(note.id)}
            title="노트 삭제"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Toolbar (Only shown when logged in) */}
      {isLoggedIn && editor && (
        <div className="editor-toolbar">
          <button
            type="button"
            className={`icon-btn ${editor.isActive('bold') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="굵게"
          >
            <Bold size={16} />
          </button>
          <button
            type="button"
            className={`icon-btn ${editor.isActive('italic') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="기울임"
          >
            <Italic size={16} />
          </button>
          <button
            type="button"
            className={`icon-btn ${editor.isActive('strike') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="취소선"
          >
            <Strikethrough size={16} />
          </button>
          <button
            type="button"
            className={`icon-btn ${editor.isActive('code') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleCode().run()}
            title="인라인 코드"
          >
            <Code size={16} />
          </button>

          <div className="toolbar-divider" />

          <button
            type="button"
            className={`icon-btn ${editor.isActive('heading', { level: 1 }) ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="제목 1"
          >
            <Heading1 size={16} />
          </button>
          <button
            type="button"
            className={`icon-btn ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="제목 2"
          >
            <Heading2 size={16} />
          </button>

          <div className="toolbar-divider" />

          <button
            type="button"
            className={`icon-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="글머리 기호 목록"
          >
            <List size={16} />
          </button>
          <button
            type="button"
            className={`icon-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="번호 매기기 목록"
          >
            <ListOrdered size={16} />
          </button>
          <button
            type="button"
            className={`icon-btn ${editor.isActive('codeBlock') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="코드 블록"
          >
            <FileCode size={16} />
          </button>
          <button
            type="button"
            className={`icon-btn ${editor.isActive('blockquote') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="인용구"
          >
            <Quote size={16} />
          </button>

          <div className="toolbar-divider" />

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/*"
            onChange={handleImageFileSelect}
          />
          <button
            type="button"
            className="icon-btn"
            style={{ color: '#818cf8' }}
            onClick={() => fileInputRef.current?.click()}
            title="이미지 파일 첨부"
          >
            <ImageIcon size={16} />
          </button>
        </div>
      )}

      {/* Editor Main Content Area */}
      <div className="editor-content-area">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
