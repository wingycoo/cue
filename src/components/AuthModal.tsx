import React, { useState } from 'react';
import { X, Lock, User, KeyRound, AlertCircle, ShieldCheck } from 'lucide-react';
import { loginUser, registerUser, getAllowedUsernames } from '../services/auth';
import type { AuthSession } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (session: AuthSession) => void;
  initialMode?: 'login' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const allowedList = getAllowedUsernames();

  const handleModeChange = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const session = await loginUser(username, password, rememberMe);
        onSuccess(session);
        onClose();
      } else {
        if (password !== confirmPassword) {
          throw new Error('비밀번호가 일치하지 않습니다. 다시 확인해 주세요.');
        }
        const session = await registerUser(username, password, name);
        onSuccess(session);
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || '인증 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content glass-panel"
        style={{ maxWidth: '420px', width: '90%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title">
            <Lock size={20} className="text-indigo-400 shrink-0" />
            <span>{mode === 'login' ? 'Cue Notes 로그인' : '사용자 회원가입'}</span>
          </div>
          <button
            type="button"
            className="icon-btn shrink-0"
            onClick={onClose}
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-white/10 mb-5">
          <button
            type="button"
            className={`flex-1 py-2.5 text-center font-medium text-sm transition-colors border-b-2 ${
              mode === 'login'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => handleModeChange('login')}
          >
            로그인
          </button>
          <button
            type="button"
            className={`flex-1 py-2.5 text-center font-medium text-sm transition-colors border-b-2 ${
              mode === 'signup'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => handleModeChange('signup')}
          >
            회원가입
          </button>
        </div>

        {error && (
          <div className="auth-error-box mb-4 flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
            <span className="whitespace-pre-line leading-relaxed">{error}</span>
          </div>
        )}

        {mode === 'signup' && (
          <div className="mb-4 flex items-center gap-2 p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-200">
            <ShieldCheck size={16} className="shrink-0 text-indigo-400" />
            <span>승인된 ID({allowedList.join(', ')})만 가입할 수 있습니다.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label className="form-label flex items-center gap-1.5">
              <User size={14} className="text-indigo-400" />
              <span>아이디 (ID)</span>
            </label>
            <input
              type="text"
              className="glass-input"
              placeholder={mode === 'signup' ? '예: wingycoo' : '아이디 입력'}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="none"
              autoComplete="username"
              required
            />
          </div>

          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label flex items-center gap-1.5">
                <User size={14} className="text-indigo-400" />
                <span>이름 / 닉네임 (선택)</span>
              </label>
              <input
                type="text"
                className="glass-input"
                placeholder="표시될 이름 (생략 시 아이디 사용)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label flex items-center gap-1.5">
              <KeyRound size={14} className="text-indigo-400" />
              <span>비밀번호</span>
            </label>
            <input
              type="password"
              className="glass-input"
              placeholder="비밀번호 입력 (4자 이상)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </div>

          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label flex items-center gap-1.5">
                <KeyRound size={14} className="text-indigo-400" />
                <span>비밀번호 확인</span>
              </label>
              <input
                type="password"
                className="glass-input"
                placeholder="비밀번호 재입력"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
          )}

          {mode === 'login' && (
            <div className="flex items-center justify-between pt-1 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-white/20 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                />
                <span>로그인 상태 유지 (자동 로그인)</span>
              </label>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="glass-btn btn-primary w-full justify-center py-2.5 text-sm font-semibold"
            >
              {isLoading ? (
                <span>처리 중...</span>
              ) : mode === 'login' ? (
                <span>로그인</span>
              ) : (
                <span>가입하고 시작하기</span>
              )}
            </button>
          </div>

          {mode === 'login' ? (
            <p className="text-center text-xs text-slate-400 pt-2">
              아직 계정이 없으신가요?{' '}
              <button
                type="button"
                className="text-indigo-400 hover:underline font-medium"
                onClick={() => handleModeChange('signup')}
              >
                회원가입
              </button>
            </p>
          ) : (
            <p className="text-center text-xs text-slate-400 pt-2">
              이미 계정이 있으신가요?{' '}
              <button
                type="button"
                className="text-indigo-400 hover:underline font-medium"
                onClick={() => handleModeChange('login')}
              >
                로그인
              </button>
            </p>
          )}
        </form>
      </div>
    </div>
  );
};
