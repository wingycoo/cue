import React, { useState } from 'react';
import { X, Save, Database, Key } from 'lucide-react';
import type { AppSettings } from '../types';

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
  const [googleClientId, setGoogleClientId] = useState(settings.googleClientId);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...settings,
      gcsBucket: gcsBucket.trim(),
      googleClientId: googleClientId.trim(),
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2 text-white">
            <Database size={20} className="text-indigo-400" />
            <span>GCS & 구글 로그인 설정</span>
          </h2>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label flex items-center gap-1.5">
              <Database size={14} className="text-indigo-400" />
              <span>GCS 버킷 이름 (Google Cloud Storage Bucket)</span>
            </label>
            <input
              type="text"
              className="glass-input"
              placeholder="예: my-personal-notes-bucket"
              value={gcsBucket}
              onChange={(e) => setGcsBucket(e.target.value)}
              required
            />
            <p className="text-xs text-slate-400">
              노트 JSON 파일 및 첨부 이미지가 직접 저장되는 GCP Storage 버킷 이름입니다.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label flex items-center gap-1.5">
              <Key size={14} className="text-indigo-400" />
              <span>Google OAuth 2.0 Client ID</span>
            </label>
            <input
              type="text"
              className="glass-input"
              placeholder="예: 1234567890-xxx.apps.googleusercontent.com"
              value={googleClientId}
              onChange={(e) => setGoogleClientId(e.target.value)}
              required
            />
            <p className="text-xs text-slate-400">
              GCP Console에서 웹 애플리케이션용으로 발급받은 OAuth 2.0 Client ID입니다.
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
