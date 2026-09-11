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
        <div className="p-8 rounded-3xl bg-indigo-500/10 border border-indigo-500/25 max-w-md mx-4 text-center shadow-2xl backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 mx-auto mb-4 flex items-center justify-center shadow-lg shadow-indigo-500/15">
            <Lock size={32} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Google 로그인 후 작성 가능</h2>
          <p className="text-sm text-slate-300 mb-6 leading-relaxed">
            동기화 오류를 방지하고 안전한 GCS 클라우드 실시간 저장을 위해 Google 로그인 후 노트를 작성하실 수 있습니다.
          </p>
          <button
            type="button"
            className="glass-btn btn-primary w-full justify-center py-3 text-base shadow-lg"
            onClick={onLogin}
          >
            <LogIn size={18} />
            <span>Google 계정으로 로그인</span>
          </button>
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
        <div className="p-6 rounded-full bg-indigo-500/10 text-indigo-400 mb-2">
          <ImageIcon size={48} />
        </div>
        <h2 className="text-xl font-semibold text-slate-200">선택된 노트가 없습니다</h2>
        <p className="text-sm text-slate-400 max-w-sm">
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
        <div className="p-3 mx-4 mt-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium">
            <Lock size={13} className="shrink-0" />
            <span>읽기 전용 모드입니다. 노트를 편집하거나 새로 작성하려면 Google 로그인이 필요합니다.</span>
          </span>
          <button
            type="button"
            className="glass-btn btn-primary text-xs py-1 px-3 ml-2 shrink-0"
            onClick={onLogin}
          >
            <LogIn size={13} />
            <span>로그인하기</span>
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
          <span className="text-xs text-slate-400 font-medium">
            마지막 수정: {formatDate(note.updatedAt)}
          </span>
        </div>

        <div className="editor-header-actions">
          <button
            type="button"
            className={`glass-btn ${copied ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' : ''}`}
            onClick={handleCopyContent}
            title="노트 전체 텍스트 복사"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            <span className="btn-label-desktop">{copied ? '복사됨' : '복사'}</span>
          </button>
          <button
            type="button"
            className={`glass-btn ${note.pinned ? 'text-indigo-400 border-indigo-500/40 bg-indigo-500/10' : ''}`}
            onClick={() => onTogglePin(note.id)}
            title={note.pinned ? '고정 해제' : '상단 고정'}
          >
            <Pin size={15} />
            <span className="btn-label-desktop">{note.pinned ? '고정됨' : '고정'}</span>
          </button>
          <button
            type="button"
            className="glass-btn hover:text-rose-400 hover:border-rose-500/40"
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
            className={`icon-btn ${editor.isActive('bold') ? 'text-indigo-400 bg-white/10' : ''}`}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="굵게"
          >
            <Bold size={16} />
          </button>
          <button
            type="button"
            className={`icon-btn ${editor.isActive('italic') ? 'text-indigo-400 bg-white/10' : ''}`}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="기울임"
          >
            <Italic size={16} />
          </button>
          <button
            type="button"
            className={`icon-btn ${editor.isActive('strike') ? 'text-indigo-400 bg-white/10' : ''}`}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="취소선"
          >
            <Strikethrough size={16} />
          </button>
          <button
            type="button"
            className={`icon-btn ${editor.isActive('code') ? 'text-indigo-400 bg-white/10' : ''}`}
            onClick={() => editor.chain().focus().toggleCode().run()}
            title="인라인 코드"
          >
            <Code size={16} />
          </button>

          <div className="toolbar-divider" />

          <button
            type="button"
            className={`icon-btn ${editor.isActive('heading', { level: 1 }) ? 'text-indigo-400 bg-white/10' : ''}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="제목 1"
          >
            <Heading1 size={16} />
          </button>
          <button
            type="button"
            className={`icon-btn ${editor.isActive('heading', { level: 2 }) ? 'text-indigo-400 bg-white/10' : ''}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="제목 2"
          >
            <Heading2 size={16} />
          </button>

          <div className="toolbar-divider" />

          <button
            type="button"
            className={`icon-btn ${editor.isActive('bulletList') ? 'text-indigo-400 bg-white/10' : ''}`}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="글머리 기호 목록"
          >
            <List size={16} />
          </button>
          <button
            type="button"
            className={`icon-btn ${editor.isActive('orderedList') ? 'text-indigo-400 bg-white/10' : ''}`}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="번호 매기기 목록"
          >
            <ListOrdered size={16} />
          </button>
          <button
            type="button"
            className={`icon-btn ${editor.isActive('codeBlock') ? 'text-indigo-400 bg-white/10' : ''}`}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="코드 블록"
          >
            <FileCode size={16} />
          </button>
          <button
            type="button"
            className={`icon-btn ${editor.isActive('blockquote') ? 'text-indigo-400 bg-white/10' : ''}`}
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
            className="icon-btn text-indigo-400 hover:bg-indigo-500/20 shrink-0"
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
