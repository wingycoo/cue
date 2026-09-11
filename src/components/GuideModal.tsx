import React, { useState } from 'react';
import { X, ShieldCheck, Copy, Check, ExternalLink } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  const [copiedCors, setCopiedCors] = useState(false);

  if (!isOpen) return null;

  const corsJson = `[
  {
    "origin": ["*"],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
    "responseHeader": ["Content-Type", "Authorization", "x-goog-resumable"],
    "maxAgeSeconds": 3600
  }
]`;

  const copyCors = () => {
    navigator.clipboard.writeText(corsJson);
    setCopiedCors(true);
    setTimeout(() => setCopiedCors(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <ShieldCheck size={20} className="shrink-0" style={{ color: '#34d399' }} />
            <span>Google Cloud (GCS & OAuth) 연동 안내</span>
          </div>
          <button type="button" className="icon-btn shrink-0" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {/* Step 1 */}
          <div>
            <h3 style={{ fontWeight: 600, color: '#818cf8', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
              1. GCP OAuth 2.0 Client ID 생성하기
            </h3>
            <ol style={{ listStyle: 'decimal inside', lineHeight: '1.6', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#818cf8', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  Google Cloud Console (API &amp; 서비스 &gt; 사용자 인증 정보) <ExternalLink size={12} />
                </a>
                로 이동합니다.
              </li>
              <li>[사용자 인증 정보 만들기] &gt; [OAuth 클라이언트 ID]를 선택합니다.</li>
              <li>애플리케이션 유형으로 <strong>웹 애플리케이션</strong>을 선택합니다.</li>
              <li>
                [승인된 자바스크립트 원본]에 배포된 사이트 주소 (<code>https://wingycoo.github.io</code>)를 추가합니다.
              </li>
              <li>발급된 Client ID를 앱 [설정] 창에 입력합니다.</li>
            </ol>
          </div>

          {/* Step 2 */}
          <div>
            <h3 style={{ fontWeight: 600, color: '#818cf8', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
              2. Google Cloud Storage (GCS) 버킷 CORS 설정
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
              브라우저에서 GCS로 노트를 직접 업로드/조회하려면 버킷에 CORS 설정이 필요합니다.
            </p>
            <div className="code-block-wrapper">
              <button
                type="button"
                className="glass-btn btn-sm"
                style={{ position: 'absolute', top: '8px', right: '8px' }}
                onClick={copyCors}
              >
                {copiedCors ? <Check size={13} style={{ color: '#34d399' }} /> : <Copy size={13} />}
                <span>{copiedCors ? '복사됨' : 'CORS JSON 복사'}</span>
              </button>
              <pre style={{ overflowX: 'auto', margin: 0 }}>{corsJson}</pre>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              Cloud Shell 또는 터미널에서 다음 명령어로 적용할 수 있습니다:
              <br />
              <code className="code-inline" style={{ marginTop: '4px', display: 'inline-block' }}>
                gsutil cors set cors.json gs://YOUR_BUCKET_NAME
              </code>
            </p>
          </div>

          {/* Step 3 */}
          <div>
            <h3 style={{ fontWeight: 600, color: '#818cf8', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
              3. PWA 알림 숫자 (App Icon Badge) 안내
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              본 앱은 <strong>PWA (Progressive Web App)</strong> 지원 앱입니다. 브라우저의 [설치] 버튼이나 [홈 화면에 추가]를 클릭하여 PWA로 설치하면, 작성된 노트 수만큼 <strong>앱 아이콘 위에 숫자가 표기(Badge API)</strong>됩니다.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--border-color)', marginTop: '20px' }}>
          <button type="button" className="glass-btn btn-primary" onClick={onClose}>
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
