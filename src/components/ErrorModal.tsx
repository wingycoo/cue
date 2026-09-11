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
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title" style={{ color: '#fb7185' }}>
            <ShieldAlert size={22} className="shrink-0" style={{ color: '#fb7185' }} />
            <span>{title}</span>
          </div>
          <button type="button" className="icon-btn shrink-0" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="error-box">
            {message}
          </div>

          {isPermissionError && (
            <div className="help-box">
              <h4 className="help-box-title">
                💡 해결 방법 (체크박스 확인)
              </h4>
              <ol className="help-box-list">
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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', marginTop: '20px' }}>
          <button type="button" className="glass-btn" onClick={onClose}>
            닫기
          </button>
          <button
            type="button"
            className="glass-btn btn-delete"
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
