export interface Note {
  id: string;
  title: string;
  content: string; // Rich HTML/Markdown content
  images: string[]; // List of GCS image object keys or URLs
  pinned?: boolean;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  syncedAt?: number;
  isDeleted?: boolean;
}

export interface AppSettings {
  gcsBucket: string;
  googleClientId?: string;
  autoSync: boolean;
  allowedUsernames?: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  picture?: string;
}

export interface UserAccount {
  id: string;
  username: string;
  name: string;
  passwordHash: string;
  salt: string;
  createdAt: number;
}

export interface AuthSession {
  user: UserProfile;
  token: string;
  loggedInAt: number;
  rememberMe: boolean;
}

export interface SyncStatus {
  state: 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
  lastSyncedAt?: number;
  errorMessage?: string;
}

export interface ErrorModalInfo {
  title: string;
  message: string;
  isPermissionError?: boolean;
}
