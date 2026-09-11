import type { UserProfile } from '../types';

declare global {
  interface Window {
    google?: any;
  }
}

const GCS_SCOPE = 'https://www.googleapis.com/auth/devstorage.read_write';
const USERINFO_SCOPE = 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

let tokenClient: any = null;
let currentAccessToken: string | null = localStorage.getItem('cue_access_token');
let tokenExpiresAt: number = Number(localStorage.getItem('cue_token_expires') || '0');

export function getStoredAccessToken(): string | null {
  const granted = localStorage.getItem('cue_granted_scopes');
  if (granted && !granted.includes('devstorage') && !granted.includes('cloud-platform')) {
    return null;
  }
  if (currentAccessToken && Date.now() < tokenExpiresAt) {
    return currentAccessToken;
  }
  return null;
}

export function loadGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
}

export async function initGoogleAuth(
  clientId: string,
  onSuccess: (token: string, user?: UserProfile) => void,
  onError?: (error: any) => void
): Promise<void> {
  await loadGsiScript();

  if (!clientId) return;

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: `${GCS_SCOPE} ${USERINFO_SCOPE}`,
    callback: async (response: any) => {
      if (response.error) {
        console.error('Google OAuth Error:', response);
        if (onError) onError(response);
        return;
      }

      const grantedScopes = response.scope || '';
      localStorage.setItem('cue_granted_scopes', grantedScopes);

      if (!grantedScopes.includes('devstorage') && !grantedScopes.includes('cloud-platform')) {
        currentAccessToken = null;
        tokenExpiresAt = 0;
        localStorage.removeItem('cue_access_token');
        localStorage.removeItem('cue_token_expires');
        if (onError) {
          onError({
            type: 'SCOPE_MISSING',
            message:
              'Google Cloud Storage 접근 권한이 선택되지 않았습니다.\n구글 로그인 화면에서 "Google Cloud Storage 데이터 확인, 수정, 구성 및 삭제" 권한 체크박스를 반드시 체크해 주세요.',
          });
        }
        return;
      }

      currentAccessToken = response.access_token;
      // Expires in response.expires_in seconds (default 3600s)
      const expiresIn = response.expires_in || 3600;
      tokenExpiresAt = Date.now() + (expiresIn - 300) * 1000; // buffer 5 mins

      localStorage.setItem('cue_access_token', response.access_token);
      localStorage.setItem('cue_token_expires', tokenExpiresAt.toString());

      // Fetch User Info
      try {
        const user = await fetchUserProfile(response.access_token);
        if (user) {
          localStorage.setItem('cue_user_profile', JSON.stringify(user));
        }
        onSuccess(response.access_token, user);
      } catch {
        onSuccess(response.access_token);
      }
    },
  });
}

export function requestGoogleLogin(forceConsent = false): void {
  if (!tokenClient) {
    throw new Error('Google OAuth client not initialized. Please set Google Client ID in settings.');
  }
  tokenClient.requestAccessToken(forceConsent ? { prompt: 'consent' } : { prompt: '' });
}

export function googleLogout(): void {
  if (currentAccessToken && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(currentAccessToken);
  }
  currentAccessToken = null;
  tokenExpiresAt = 0;
  localStorage.removeItem('cue_access_token');
  localStorage.removeItem('cue_token_expires');
  localStorage.removeItem('cue_user_profile');
  localStorage.removeItem('cue_granted_scopes');
}

export function getStoredUserProfile(): UserProfile | undefined {
  const data = localStorage.getItem('cue_user_profile');
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export async function fetchUserProfile(token: string): Promise<UserProfile> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch user profile');
  const data = await res.json();
  return {
    id: data.sub,
    name: data.name || data.email,
    email: data.email,
    picture: data.picture,
  };
}
