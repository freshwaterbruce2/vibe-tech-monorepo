/** Client boundary for the production Tutor/Buddy API. Model selection stays on the server. */
import { API_CONFIG } from '@/config';
import { sessionStore } from '@/utils/electronStore';
import { Capacitor, CapacitorHttp, registerPlugin } from '@capacitor/core';

export interface DeepSeekMessage { role: 'system' | 'user' | 'assistant'; content: string; }
export interface ChatOptions { chatType: 'tutor' | 'friend'; }
export interface AllowancePeriod {
  used: number; limit: number; remaining: number; resetAt: string;
}
export interface Allowance { daily: AllowancePeriod; monthly: AllowancePeriod; }
export interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>; allowance?: Allowance;
}
export interface ReportMessagePayload {
  category: string; includeContent: boolean; content?: string;
}
interface IntegrityPlugin {
  prepare(): Promise<void>;
  request(options: { requestHash: string }): Promise<{ token: string }>;
}
const VibeTutorIntegrity = registerPlugin<IntegrityPlugin>('VibeTutorIntegrity');
const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 4000;
const CHAT_CONNECT_TIMEOUT_MS = 30000;
const CHAT_READ_TIMEOUT_MS = 90000;
const CHAT_TRANSIENT_ATTEMPTS = 3;
const sleep = async (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function base64Url(bytes: Uint8Array): string { let value = ''; for (const byte of bytes) value += String.fromCharCode(byte); return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''); }
function asResponseData(data: unknown): Record<string, unknown> | null {
  if (data && typeof data === 'object' && !Array.isArray(data)) return data as Record<string, unknown>;
  if (typeof data !== 'string' || !data.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(data);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}
function apiFailureMessage(data: unknown, status: number): string {
  const body = asResponseData(data);
  const code = typeof body?.code === 'string' ? body.code.trim() : '';
  if (code) return code;
  const error = typeof body?.error === 'string' ? body.error.trim() : '';
  if (error) return error;
  return `API error: ${status}`;
}
function isTransientChatFailure(status: number, data: unknown): boolean {
  if (status !== 503) return false;
  const body = asResponseData(data);
  const code = typeof body?.code === 'string' ? body.code : '';
  const error = typeof body?.error === 'string' ? body.error : '';
  return code === 'ai_unavailable'
    || /temporarily unavailable|quota-contention/i.test(`${code} ${error}`)
    || (!code && !error);
}
async function requestHash(installationId: string, requestedAt: number): Promise<string> {
  // This insertion order and numeric timestamp must exactly match the backend's
  // requestHash(installationId, requestedAt) verification contract.
  const canonical = JSON.stringify({ installationId, requestedAt });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  return base64Url(new Uint8Array(digest));
}
function isNative(): boolean { return typeof Capacitor.isNativePlatform === 'function' && Capacitor.isNativePlatform(); }

class SecureAPIClient {
  private sessionToken: string | null = null;
  private tokenExpiry = 0;
  private allowance: Allowance | null = null;

  private async initSession(): Promise<void> {
    const installationId = sessionStore.get<string>('vibetutor_installation_id') ?? crypto.randomUUID();
    sessionStore.set('vibetutor_installation_id', installationId);
    const requestedAt = Date.now();
    const hash = await requestHash(installationId, requestedAt);
    if (!isNative()) throw new Error('Play Integrity verification is unavailable.');
    await VibeTutorIntegrity.prepare();
    const integrityToken = (await VibeTutorIntegrity.request({ requestHash: hash })).token;
    if (!integrityToken) throw new Error('Play Integrity verification is unavailable.');
    const response = await CapacitorHttp.post({
      url: `${API_CONFIG.baseURL}${API_CONFIG.endpoints.initSession}`,
      headers: { 'Content-Type': 'application/json' },
      data: { installationId, requestedAt, requestHash: hash, integrityToken },
    });
    if (response.status < 200 || response.status >= 300 || !response.data?.token) {
      const detail = apiFailureMessage(response.data, response.status);
      throw new Error(`Session init failed (${response.status}): ${detail}`);
    }
    this.sessionToken = response.data.token;
    this.tokenExpiry = Date.now() + Number(response.data.expiresIn ?? 0) * 1000;
    this.allowance = response.data.allowance ?? null;
    sessionStore.set('vibetutor_session', this.sessionToken);
    sessionStore.set('vibetutor_expiry', String(this.tokenExpiry));
  }

  private async ensureSession(): Promise<void> {
    if (this.sessionToken && Date.now() < this.tokenExpiry) return;
    const token = sessionStore.get<string>('vibetutor_session');
    const expiry = Number(sessionStore.get<string>('vibetutor_expiry'));
    if (token && expiry > Date.now()) {
      this.sessionToken = token;
      this.tokenExpiry = expiry;
      return;
    }
    await this.initSession();
  }

  async chatCompletion(
    messages: DeepSeekMessage[], options: ChatOptions,
  ): Promise<ChatCompletionResponse> {
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) throw new Error('Invalid message count');
    const bounded = messages.map((message) => {
      if (
        !message ||
        (message.role !== 'user' && message.role !== 'assistant') ||
        typeof message.content !== 'string' ||
        !message.content.trim() ||
        message.content.length > MAX_MESSAGE_CHARS
      ) throw new Error('Invalid message content');
      return { role: message.role, content: message.content };
    });
    let authRetried = false;
    for (let attempt = 0; attempt < CHAT_TRANSIENT_ATTEMPTS; attempt += 1) {
      await this.ensureSession();
      const response = await CapacitorHttp.request({
        url: `${API_CONFIG.baseURL}${API_CONFIG.endpoints.chat}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.sessionToken}`,
        },
        data: { chatType: options.chatType, messages: bounded },
        connectTimeout: CHAT_CONNECT_TIMEOUT_MS,
        readTimeout: CHAT_READ_TIMEOUT_MS,
      });
      if (response.status === 401 && !authRetried) {
        authRetried = true;
        this.sessionToken = null;
        this.tokenExpiry = 0;
        attempt -= 1;
        continue;
      }
      if (
        isTransientChatFailure(response.status, response.data)
        && attempt + 1 < CHAT_TRANSIENT_ATTEMPTS
      ) {
        await sleep(400 * (2 ** attempt));
        continue;
      }
      if (response.status < 200 || response.status >= 300) {
        throw new Error(apiFailureMessage(response.data, response.status));
      }
      const body = asResponseData(response.data);
      this.allowance = (body?.allowance as Allowance | null | undefined) ?? this.allowance;
      return {
        choices: typeof body?.message === 'string'
          ? [{ message: { content: body.message } }]
          : undefined,
        allowance: this.allowance ?? undefined,
      };
    }
    throw new Error('Session refresh failed');
  }

  async getAllowance(): Promise<Allowance | null> {
    await this.ensureSession();
    const response = await CapacitorHttp.get({
      url: `${API_CONFIG.baseURL}/api/allowance`,
      headers: { Authorization: `Bearer ${this.sessionToken}` },
    });
    if (response.status >= 200 && response.status < 300) {
      this.allowance = response.data?.allowance ?? null;
    }
    return this.allowance;
  }
  getCachedAllowance(): Allowance | null { return this.allowance; }
  async reportMessage(payload: ReportMessagePayload): Promise<void> {
    await this.ensureSession();
    const post = async () => CapacitorHttp.post({
      url: `${API_CONFIG.baseURL}/api/reports`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.sessionToken}`,
      },
      data: payload,
    });
    let response = await post();
    if (response.status === 401) {
      this.sessionToken = null;
      await this.ensureSession();
      response = await post();
    }
    if (response.status < 200 || response.status >= 300) throw new Error(`Report failed: ${response.status}`);
  }
  async classifySafety(message: string): Promise<string | null> {
    if (!message.trim() || message.length > MAX_MESSAGE_CHARS) return null;
    await this.ensureSession();
    const response = await CapacitorHttp.post({
      url: `${API_CONFIG.baseURL}/api/safety/classify`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.sessionToken}`,
      },
      data: { text: message },
    });
    return response.status >= 200 && response.status < 300
      ? response.data?.classification ?? null
      : null;
  }
  async healthCheck(): Promise<boolean> {
    try {
      const response = await CapacitorHttp.get({
        url: `${API_CONFIG.baseURL}${API_CONFIG.endpoints.health}`,
      });
      return response.status === 200 && response.data?.status === 'ready' && response.data?.ready === true;
    } catch {
      return false;
    }
  }
}
export const secureClient = new SecureAPIClient();
export async function createChatCompletion(
  messages: DeepSeekMessage[], options: ChatOptions,
): Promise<string> {
  const content = (
    await secureClient.chatCompletion(messages, options)
  ).choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('AI response was unavailable.');
  }
  return content;
}
export { secureClient as deepseekClient };
