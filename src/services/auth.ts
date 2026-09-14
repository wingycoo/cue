import { Capacitor } from '@capacitor/core';
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
let currentClientId: string = '';
let pendingAuthError: any = null;
let redirectTokenReceived: string | null = null;

// Parse OAuth redirect parameters from window.location.hash synchronously on script execution
function processInitialRedirectHash(): void {
  try {
    const hash = window.location.hash;
    if (!hash || !hash.includes('=')) return;

    const cleanHash = hash.startsWith('#') ? hash.substring(1) : hash;
    const searchParams = new URLSearchParams(cleanHash);
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      console.error('OAuth redirect error:', error, errorDescription);
      pendingAuthError = {
        type: 'AUTH_ERROR',
        message: errorDescription || error || 'Google 로그인에 실패했습니다.',
      };
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      return;
    }

    const token = searchParams.get('access_token');
    if (token) {
      const scopeParam = searchParams.get('scope') || '';
      const grantedScopes = decodeURIComponent(scopeParam).replace(/\+/g, ' ');
      localStorage.setItem('cue_granted_scopes', grantedScopes);

      // Clean hash from address bar immediately
      window.history.replaceState(null, '', window.location.pathname + window.location.search);

      if (!grantedScopes.includes('devstorage') && !grantedScopes.includes('cloud-platform')) {
        currentAccessToken = null;
        tokenExpiresAt = 0;
        localStorage.removeItem('cue_access_token');
        localStorage.removeItem('cue_token_expires');
        pendingAuthError = {
          type: 'SCOPE_MISSING',
          message:
            'Google Cloud Storage 접근 권한이 선택되지 않았습니다.\n구글 로그인 화면에서 "Google Cloud Storage 데이터 확인, 수정, 구성 및 삭제" 권한 체크박스를 반드시 체크해 주세요.',
        };
        return;
      }

      currentAccessToken = token;
      const expiresIn = Number(searchParams.get('expires_in') || '3600');
      tokenExpiresAt = Date.now() + (expiresIn - 300) * 1000;

      localStorage.setItem('cue_access_token', token);
      localStorage.setItem('cue_token_expires', tokenExpiresAt.toString());
      redirectTokenReceived = token;
    }
  } catch (err) {
    console.error('Failed to parse OAuth redirect hash:', err);
  }
}

// Execute immediately when auth module is evaluated
processInitialRedirectHash();

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

export function getRedirectUri(): string {
  const url = new URL(window.location.href);
  let pathname = url.pathname;
  if (pathname.endsWith('index.html')) {
    pathname = pathname.slice(0, -'index.html'.length);
  }
  if (!pathname.endsWith('/')) {
    pathname += '/';
  }
  return `${url.origin}${pathname}`;
}

export function redirectToGoogleOAuth(clientId: string, forceConsent = false): void {
  const redirectUri = getRedirectUri();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'token',
    scope: `${GCS_SCOPE} ${USERINFO_SCOPE}`,
    include_granted_scopes: 'true',
    prompt: forceConsent ? 'consent select_account' : 'select_account',
  });

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function initGoogleAuth(
  clientId: string,
  onSuccess: (token: string, user?: UserProfile) => void,
  onError?: (error: any) => void
): Promise<void> {
  currentClientId = clientId;

  // 1. If an error occurred during redirect callback
  if (pendingAuthError) {
    const err = pendingAuthError;
    pendingAuthError = null;
    if (onError) onError(err);
    return;
  }

  // 2. If a token was received via redirect callback
  if (redirectTokenReceived) {
    const token = redirectTokenReceived;
    redirectTokenReceived = null;
    try {
      const user = await fetchUserProfile(token);
      if (user) {
        localStorage.setItem('cue_user_profile', JSON.stringify(user));
      }
      onSuccess(token, user);
    } catch {
      onSuccess(token);
    }
  }

  // 3. Setup Desktop GIS Token Client for popup UX (if not in mobile/native)
  const isMobileOrNative =
    Capacitor.isNativePlatform() ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (!isMobileOrNative) {
    try {
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
          const expiresIn = response.expires_in || 3600;
          tokenExpiresAt = Date.now() + (expiresIn - 300) * 1000;

          localStorage.setItem('cue_access_token', response.access_token);
          localStorage.setItem('cue_token_expires', tokenExpiresAt.toString());

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
    } catch (err) {
      console.warn('Google Identity Services load failed:', err);
    }
  }
}

export function requestGoogleLogin(forceConsent = false, clientId?: string): void {
  const targetClientId = clientId || currentClientId;
  const isMobileOrNative =
    Capacitor.isNativePlatform() ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobileOrNative || !tokenClient) {
    if (!targetClientId) {
      throw new Error('Google Client ID가 설정되지 않았습니다.');
    }
    redirectToGoogleOAuth(targetClientId, forceConsent);
    return;
  }

  try {
    tokenClient.requestAccessToken(forceConsent ? { prompt: 'consent' } : { prompt: '' });
  } catch (err) {
    console.warn('GIS requestAccessToken failed, falling back to redirect:', err);
    if (targetClientId) {
      redirectToGoogleOAuth(targetClientId, forceConsent);
    }
  }
}

export function googleLogout(): void {
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
