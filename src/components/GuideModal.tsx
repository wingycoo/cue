import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, ShieldCheck } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  const [copiedCors, setCopiedCors] = useState(false);

  if (!isOpen) return null;

  const corsJson = JSON.stringify(
    [
      {
        origin: ['*'],
        method: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        responseHeader: ['Content-Type', 'Authorization'],
        maxAgeSeconds: 3600,
      },
    ],
    null,
    2
  );

  const copyCors = () => {
    navigator.clipboard.writeText(corsJson);
    setCopiedCors(true);
    setTimeout(() => setCopiedCors(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <ShieldCheck size={20} className="text-emerald-400 shrink-0" />
            <span>Google Cloud (GCS & OAuth) 연동 안내</span>
          </div>
          <button type="button" className="icon-btn shrink-0" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6 text-sm text-slate-300">
          {/* Step 1 */}
          <div>
            <h3 className="font-semibold text-indigo-400 mb-1 flex items-center gap-2">
              1. GCP OAuth 2.0 Client ID 생성하기
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 text-xs leading-relaxed">
              <li>
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 underline inline-flex items-center gap-1"
                >
                  Google Cloud Console (API & 서비스 &gt; 사용자 인증 정보) <ExternalLink size={12} />
                </a>
                로 이동합니다.
              </li>
              <li>[사용자 인증 정보 만들기] &gt; [OAuth 클라이언트 ID]를 선택합니다.</li>
              <li>애플리케이션 유형으로 <strong>웹 애플리케이션</strong>을 선택합니다.</li>
              <li>
                [승인된 자바스크립트 원본]에 현재 주소 (<code>http://localhost:5173</code> 또는 배포된 웹 URL)를 추가합니다.
              </li>
              <li>발급된 Client ID를 앱 [설정] 창에 입력합니다.</li>
            </ol>
          </div>

          {/* Step 2 */}
          <div>
            <h3 className="font-semibold text-indigo-400 mb-1 flex items-center gap-2">
              2. Google Cloud Storage (GCS) 버킷 CORS 설정
            </h3>
            <p className="text-xs text-slate-400 mb-2">
              브라우저에서 GCS로 노트를 직접 업로드/조회하려면 버킷에 CORS 설정이 필요합니다.
            </p>
            <div className="relative bg-slate-950 p-3 rounded-lg border border-white/10 font-mono text-xs text-slate-300">
              <button
                type="button"
                className="glass-btn text-xs absolute top-2 right-2 py-1 px-2"
                onClick={copyCors}
              >
                {copiedCors ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copiedCors ? '복사됨' : 'CORS JSON 복사'}</span>
              </button>
              <pre className="overflow-x-auto">{corsJson}</pre>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Cloud Shell 또는 로컬 터미널에서 다음 명령어로 적용할 수 있습니다:
              <br />
              <code className="text-indigo-300 bg-slate-900 px-1 py-0.5 rounded">
                gsutil cors set cors.json gs://YOUR_BUCKET_NAME
              </code>
            </p>
          </div>

          {/* Step 3 */}
          <div>
            <h3 className="font-semibold text-indigo-400 mb-1 flex items-center gap-2">
              3. PWA 알림 숫자 (App Icon Badge) 안내
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              본 앱은 **PWA (Progressive Web App)** 지원 앱입니다. 브라우저 주소창의 [설치] 버튼이나 [홈 화면에 추가]를 클릭하여 PWA로 설치하면, 작성된 노트 수만큼 **앱 아이콘 위에 숫자가 표기(Badge API)**됩니다.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-white/10 mt-6">
          <button type="button" className="glass-btn btn-primary" onClick={onClose}>
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
