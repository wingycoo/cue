import { registerPlugin } from '@capacitor/core';
import type { Note } from '../types';

interface CueWidgetPluginType {
  updateWidget(options: {
    title: string;
    snippet: string;
    date: string;
    noteId: string;
  }): Promise<void>;
}

// Register native CueWidget plugin if available
const CueWidget = registerPlugin<CueWidgetPluginType>('CueWidget');

function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').trim();
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Updates the Android home screen widget with the latest or pinned note data
 */
export async function updateNativeWidget(note: Note | null): Promise<void> {
  try {
    if (!note) {
      await CueWidget.updateWidget({
        title: '작성된 노트가 없습니다',
        snippet: '+ 새 노트 버튼을 눌러 작성을 시작하세요.',
        date: '',
        noteId: '',
      });
      return;
    }

    const plain = stripHtml(note.content);
    const firstLine = plain.split('\n')[0] || '';
    const title = firstLine
      ? (firstLine.length > 28 ? firstLine.substring(0, 28) + '...' : firstLine)
      : '새 업무 노트';
    const snippet = plain ? plain.substring(0, 120) : '작성된 내용이 없습니다.';

    await CueWidget.updateWidget({
      title,
      snippet,
      date: formatDate(note.updatedAt),
      noteId: note.id,
    });
  } catch {
    // Graceful fallback when running in a normal web browser
  }
}

/**
 * Listen for widget interactions (e.g. tapping "+ 새 노트" on home screen)
 */
export function initWidgetActionListeners(
  onNewNote: () => void,
  onOpenNote: (noteId: string) => void
): () => void {
  const handleEvent = (event: any) => {
    const detail = event?.detail;
    if (!detail) return;

    if (detail.action === 'new_note') {
      onNewNote();
    } else if (detail.action === 'open_note' && detail.noteId) {
      onOpenNote(detail.noteId);
    }
  };

  // 1. Custom native event from MainActivity
  window.addEventListener('cueWidgetAction', handleEvent);

  // 2. URL search params check (e.g. ?action=new_note)
  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get('action');
  const noteId = urlParams.get('note_id');

  if (action === 'new_note') {
    setTimeout(onNewNote, 300);
    window.history.replaceState({}, '', window.location.pathname);
  } else if (action === 'open_note' && noteId) {
    setTimeout(() => onOpenNote(noteId), 300);
    window.history.replaceState({}, '', window.location.pathname);
  }

  return () => {
    window.removeEventListener('cueWidgetAction', handleEvent);
  };
}
