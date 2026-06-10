import { invoke } from '@tauri-apps/api/core';

export interface AuthStatus {
  authenticated: boolean;
  email: string | null;
  expires_at: number | null;
}

export interface ChatMessage {
  role: string;
  text: string;
}

/** Open browser for Google OAuth sign-in via PKCE. */
export async function startOAuth(): Promise<AuthStatus> {
  return invoke<AuthStatus>('start_oauth');
}

/** Check current authentication state (auto-refreshes if expired). */
export async function getAuthStatus(): Promise<AuthStatus> {
  return invoke<AuthStatus>('get_auth_status');
}

/** Clear stored tokens. */
export async function logout(): Promise<void> {
  return invoke<void>('logout');
}

/** Send a message to Gemini 2.5 Pro via OAuth bearer token. */
export async function chatGemini(message: string, history: ChatMessage[]): Promise<string> {
  return invoke<string>('chat_gemini', { message, history });
}
