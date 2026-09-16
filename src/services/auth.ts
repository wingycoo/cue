import type { UserProfile, UserAccount, AuthSession } from '../types';

const STORAGE_USERS_KEY = 'cue_user_accounts';
const STORAGE_SESSION_KEY = 'cue_auth_session';
const STORAGE_ALLOWED_KEY = 'cue_allowed_usernames';

const DEFAULT_ALLOWED_USERNAMES = ['wingycoo'];

// --- Password Hashing with Web Crypto API ---

async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${password}`);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateSalt(): string {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// --- Whitelist Management ---

export function getAllowedUsernames(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_ALLOWED_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((u) => String(u).trim()).filter(Boolean);
      }
    }
  } catch {}
  return [...DEFAULT_ALLOWED_USERNAMES];
}

export function setAllowedUsernames(list: string[]): void {
  const cleanList = Array.from(
    new Set(list.map((u) => u.trim().toLowerCase()).filter(Boolean))
  );
  localStorage.setItem(STORAGE_ALLOWED_KEY, JSON.stringify(cleanList));
}

export function isUsernameAllowed(username: string): boolean {
  const clean = username.trim().toLowerCase();
  const allowed = getAllowedUsernames().map((u) => u.toLowerCase());
  return allowed.includes(clean);
}

// --- User Account Storage ---

export function getStoredAccounts(): Record<string, UserAccount> {
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return {};
}

function saveAccount(account: UserAccount): void {
  const accounts = getStoredAccounts();
  accounts[account.username.toLowerCase()] = account;
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(accounts));
}

// --- Session & Auto-Login Management ---

export function getStoredSession(): AuthSession | null {
  try {
    const localData = localStorage.getItem(STORAGE_SESSION_KEY);
    if (localData) {
      return JSON.parse(localData);
    }
    const sessionData = sessionStorage.getItem(STORAGE_SESSION_KEY);
    if (sessionData) {
      return JSON.parse(sessionData);
    }
  } catch {}
  return null;
}

export function saveSession(session: AuthSession): void {
  if (session.rememberMe) {
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
  } else {
    sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
  }
}

export function logoutUser(): void {
  localStorage.removeItem(STORAGE_SESSION_KEY);
  sessionStorage.removeItem(STORAGE_SESSION_KEY);
  // Clear any legacy Google auth items
  localStorage.removeItem('cue_access_token');
  localStorage.removeItem('cue_token_expires');
  localStorage.removeItem('cue_user_profile');
  localStorage.removeItem('cue_granted_scopes');
}

// --- Authentication Actions ---

export async function registerUser(
  usernameInput: string,
  passwordInput: string,
  nameInput?: string
): Promise<AuthSession> {
  const username = usernameInput.trim();
  const password = passwordInput;
  const name = nameInput?.trim() || username;

  if (!username) {
    throw new Error('아이디를 입력해 주세요.');
  }
  if (!password || password.length < 4) {
    throw new Error('비밀번호는 최소 4자리 이상이어야 합니다.');
  }

  // Whitelist check
  if (!isUsernameAllowed(username)) {
    const allowed = getAllowedUsernames();
    throw new Error(
      `가입이 제한된 아이디입니다.\n허용된 사용자 ID: ${allowed.join(', ')}`
    );
  }

  const accounts = getStoredAccounts();
  const normalizedKey = username.toLowerCase();
  if (accounts[normalizedKey]) {
    throw new Error('이미 등록된 아이디입니다. 로그인해 주세요.');
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);

  const newAccount: UserAccount = {
    id: normalizedKey,
    username: normalizedKey,
    name,
    passwordHash,
    salt,
    createdAt: Date.now(),
  };

  saveAccount(newAccount);

  const session: AuthSession = {
    user: {
      id: normalizedKey,
      name,
      email: `${normalizedKey}@cue.local`,
      picture: '',
    },
    token: `cue_session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    loggedInAt: Date.now(),
    rememberMe: true,
  };

  saveSession(session);
  return session;
}

export async function loginUser(
  usernameInput: string,
  passwordInput: string,
  rememberMe = true
): Promise<AuthSession> {
  const username = usernameInput.trim();
  const password = passwordInput;

  if (!username || !password) {
    throw new Error('아이디와 비밀번호를 모두 입력해 주세요.');
  }

  const accounts = getStoredAccounts();
  const normalizedKey = username.toLowerCase();
  const account = accounts[normalizedKey];

  if (!account) {
    throw new Error('존재하지 않는 아이디입니다. 먼저 회원가입을 진행해 주세요.');
  }

  const inputHash = await hashPassword(password, account.salt);
  if (inputHash !== account.passwordHash) {
    throw new Error('비밀번호가 올바르지 않습니다.');
  }

  const session: AuthSession = {
    user: {
      id: account.username,
      name: account.name || account.username,
      email: `${account.username}@cue.local`,
      picture: '',
    },
    token: `cue_session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    loggedInAt: Date.now(),
    rememberMe,
  };

  saveSession(session);
  return session;
}

// --- Backward Compatibility & Helper Exports ---

export function getStoredAccessToken(): string | null {
  const session = getStoredSession();
  return session ? session.token : null;
}

export function getStoredUserProfile(): UserProfile | undefined {
  const session = getStoredSession();
  return session ? session.user : undefined;
}

export function googleLogout(): void {
  logoutUser();
}
