import React from 'react';
import {
  Cloud,
  CloudAlert,
  RefreshCw,
  Settings,
  HelpCircle,
  LogOut,
  LogIn,
  CheckCircle2,
  Bookmark,
} from 'lucide-react';
import type { UserProfile, SyncStatus } from '../types';

interface HeaderProps {
  userProfile?: UserProfile;
  accessToken: string | null;
  syncStatus: SyncStatus;
  notesCount: number;
  onLogin: () => void;
  onLogout: () => void;
  onOpenSettings: () => void;
  onOpenGuide: () => void;
  onSyncNow: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userProfile,
  accessToken,
  syncStatus,
  notesCount,
  onLogin,
  onLogout,
  onOpenSettings,
  onOpenGuide,
  onSyncNow,
}) => {
  const getSyncIcon = () => {
    switch (syncStatus.state) {
      case 'syncing':
        return <RefreshCw className="animate-spin text-amber-400 shrink-0" size={14} />;
      case 'synced':
        return <CheckCircle2 className="text-emerald-400 shrink-0" size={14} />;
      case 'error':
        return <CloudAlert className="text-rose-400 shrink-0" size={14} />;
      default:
        return <Cloud className="text-slate-400 shrink-0" size={14} />;
    }
  };

  const getSyncText = () => {
    switch (syncStatus.state) {
      case 'syncing':
        return 'GCS 동기화 중...';
      case 'synced':
        return '동기화 완료';
      case 'error':
        return syncStatus.errorMessage || '동기화 오류';
      default:
        return accessToken ? 'GCS 연동' : '로컬 전용';
    }
  };

  return (
    <header className="app-header glass-panel">
      <div className="brand-section">
        <div className="logo-badge">C</div>
        <div>
          <h1 className="brand-title">Cue Notes</h1>
        </div>
      </div>

      <div className="header-right">
        {/* PWA App Icon Badge count indicator */}
        <div className="badge-pill" title="PWA 앱 아이콘 노트 알림 숫자">
          <Bookmark size={13} />
          <span>{notesCount}개</span>
        </div>

        {/* Sync status pill */}
        <div
          className="status-pill cursor-pointer hover:opacity-80 transition"
          onClick={onSyncNow}
          title="클릭하여 GCS와 수동 동기화"
        >
          {getSyncIcon()}
          <span className="btn-label-desktop">{getSyncText()}</span>
        </div>

        {/* Guide button */}
        <button
          className="glass-btn icon-only-mobile"
          onClick={onOpenGuide}
          title="GCP OAuth & GCS 버킷 가이드"
        >
          <HelpCircle size={16} />
          <span className="btn-label-desktop">가이드</span>
        </button>

        {/* Settings button */}
        <button
          className="glass-btn icon-only-mobile"
          onClick={onOpenSettings}
          title="GCS 버킷 및 Client ID 설정"
        >
          <Settings size={16} />
          <span className="btn-label-desktop">설정</span>
        </button>

        {/* User Auth Profile / Login Button */}
        {accessToken && userProfile ? (
          <div className="user-profile-section">
            <img
              src={userProfile.picture}
              alt={userProfile.name}
              className="user-avatar"
              title={userProfile.email}
            />
            <button
              type="button"
              className="glass-btn logout-btn"
              onClick={onLogout}
              title="구글 로그아웃"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button className="glass-btn btn-primary" onClick={onLogin} title="구글 로그인">
            <LogIn size={15} />
            <span className="btn-label-desktop">로그인</span>
          </button>
        )}
      </div>
    </header>
  );
};
