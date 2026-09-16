import React, { useState } from 'react';
import { X, Save, Database, ShieldCheck } from 'lucide-react';
import type { AppSettings } from '../types';
import { getAllowedUsernames, setAllowedUsernames } from '../services/auth';

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onSave,
  onClose,
}) => {
  const [gcsBucket, setGcsBucket] = useState(settings.gcsBucket);
  const [allowedIds, setAllowedIds] = useState(() =>
    getAllowedUsernames().join(', ')
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Save whitelist to auth service
    const idList = allowedIds
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    if (idList.length > 0) {
      setAllowedUsernames(idList);
    }

    onSave({
      ...settings,
      gcsBucket: gcsBucket.trim(),
      allowedUsernames: idList,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Database size={20} className="text-indigo-400 shrink-0" />
            <span>앱 환경 설정</span>
          </div>
          <button type="button" className="icon-btn shrink-0" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label className="form-label flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-indigo-400" />
              <span>가입 허용 아이디 (Whitelist)</span>
            </label>
            <input
              type="text"
              className="glass-input"
              placeholder="예: wingycoo, admin"
              value={allowedIds}
              onChange={(e) => setAllowedIds(e.target.value)}
              required
            />
            <p className="text-xs text-slate-400">
              회원가입을 허용할 아이디 목록입니다. 쉼표(,)로 구분하여 입력하세요. (기본: wingycoo)
            </p>
          </div>

          <div className="form-group">
            <label className="form-label flex items-center gap-1.5">
              <Database size={14} className="text-indigo-400" />
              <span>GCS 버킷 이름 (선택 사항)</span>
            </label>
            <input
              type="text"
              className="glass-input"
              placeholder="예: wingycoo-cue"
              value={gcsBucket}
              onChange={(e) => setGcsBucket(e.target.value)}
            />
            <p className="text-xs text-slate-400">
              클라우드 백업/동기화에 사용할 GCP Storage 버킷 이름입니다.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10 mt-6">
            <button type="button" className="glass-btn" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="glass-btn btn-primary">
              <Save size={16} />
              <span>설정 저장</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
