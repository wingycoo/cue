import React from 'react';
import { X, ShieldAlert, LogOut, RefreshCw } from 'lucide-react';

interface ErrorModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  isPermissionError?: boolean;
  onClose: () => void;
  onRelogin: () => void;
  onLogout: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({
  isOpen,
  title,
  message,
  isPermissionError = true,
  onClose,
  onRelogin,
  onLogout,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title text-rose-400">
            <ShieldAlert size={22} className="text-rose-400 shrink-0" />
            <span>{title}</span>
          </div>
          <button type="button" className="icon-btn shrink-0" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 text-sm text-slate-300">
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-200 text-xs leading-relaxed whitespace-pre-line">
            {message}
          </div>

          {isPermissionError && (
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/10 space-y-2">
              <h4 className="font-semibold text-white text-xs flex items-center gap-1.5">
                💡 해결 방법 (체크박스 확인)
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-xs text-slate-300 leading-relaxed">
                <li>
                  아래 <strong>[로그아웃 후 다시 로그인]</strong> 버튼을 클릭합니다.
                </li>
                <li>
                  구글 로그인 팝업 창에서 <strong>&quot;Google Cloud Storage의 데이터 확인, 수정, 구성 및 삭제&quot;</strong> 권한 체크박스를 반드시 체크합니다.
                </li>
                <li><strong>[계속]</strong>을 누르면 정상적으로 동기화가 연결됩니다.</li>
              </ol>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/10 mt-6">
          <button type="button" className="glass-btn" onClick={onClose}>
            닫기
          </button>
          <button
            type="button"
            className="glass-btn text-slate-300 hover:text-rose-400"
            onClick={onLogout}
            title="로그아웃만 수행"
          >
            <LogOut size={15} />
            <span>로그아웃</span>
          </button>
          <button
            type="button"
            className="glass-btn btn-primary"
            onClick={onRelogin}
            title="로그아웃 후 즉시 다시 로그인"
          >
            <RefreshCw size={15} />
            <span>로그아웃 후 다시 로그인</span>
          </button>
        </div>
      </div>
    </div>
  );
};
