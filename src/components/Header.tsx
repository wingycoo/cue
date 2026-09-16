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
import { requestNotificationPermission, updateAppBadge } from '../services/badge';

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
  onOpenErrorModal?: () => void;
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
  onOpenErrorModal,
}) => {
  const handleBadgeClick = async () => {
    const granted = await requestNotificationPermission();
    await updateAppBadge(notesCount);
    if (!granted) {
      alert('PWA 앱 아이콘에 숫자를 표기하려면 브라우저 알림 권한을 [허용]으로 선택해 주세요.');
    }
  };

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
        <div
          className="badge-pill cursor-pointer hover:opacity-80 transition"
          onClick={handleBadgeClick}
          title="클릭하여 PWA 앱 아이콘 알림 권한 활성화"
        >
          <Bookmark size={13} />
          <span>{notesCount}개</span>
        </div>

        {/* Sync status pill */}
        <div
          className="status-pill cursor-pointer hover:opacity-80 transition"
          onClick={() => {
            if (syncStatus.state === 'error' && onOpenErrorModal) {
              onOpenErrorModal();
            } else {
              onSyncNow();
            }
          }}
          title={syncStatus.state === 'error' ? '클릭하여 오류 상세 및 해결 방법 확인' : '클릭하여 GCS와 수동 동기화'}
        >
          {getSyncIcon()}
          <span className="btn-label-desktop">{getSyncText()}</span>
        </div>

        {/* Guide button */}
        <button
          type="button"
          className="glass-btn icon-only-mobile"
          onClick={onOpenGuide}
          title="GCP OAuth & GCS 버킷 가이드"
        >
          <HelpCircle size={16} />
          <span className="btn-label-desktop">가이드</span>
        </button>

        {/* Settings button */}
        <button
          type="button"
          className="glass-btn icon-only-mobile"
          onClick={onOpenSettings}
          title="GCS 버킷 및 Client ID 설정"
        >
          <Settings size={16} />
          <span className="btn-label-desktop">설정</span>
        </button>

        {/* User Auth Profile / Login Button */}
        {accessToken && userProfile ? (
          <div className="user-profile-section flex items-center gap-2">
            {userProfile.picture ? (
              <img
                src={userProfile.picture}
                alt={userProfile.name}
                className="user-avatar"
                title={userProfile.name}
              />
            ) : (
              <div
                className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow shrink-0"
                title={userProfile.name}
              >
                {userProfile.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="btn-label-desktop text-xs text-slate-300 font-medium max-w-[100px] truncate">
              {userProfile.name}
            </span>
            <button
              type="button"
              className="glass-btn logout-btn shrink-0"
              onClick={onLogout}
              title="로그아웃"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button className="glass-btn btn-primary" onClick={onLogin} title="로그인">
            <LogIn size={15} />
            <span className="btn-label-desktop">로그인</span>
          </button>
        )}
      </div>
    </header>
  );
};
