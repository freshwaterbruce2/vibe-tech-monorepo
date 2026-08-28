import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Store mock ────────────────────────────────────────────────────────────────
const mockStore: Record<string, string> = {};

vi.mock('../../../utils/electronStore', () => ({
  appStore: {
    get: (key: string) => mockStore[key] ?? null,
    set: (key: string, value: string) => {
      mockStore[key] = value;
    },
    delete: (key: string) => {
      Reflect.deleteProperty(mockStore, key);
    },
    remove: (key: string) => {
      Reflect.deleteProperty(mockStore, key);
    },
  },
  default: {
    get: (key: string) => mockStore[key] ?? null,
    set: (key: string, value: string) => {
      mockStore[key] = value;
    },
    delete: (key: string) => {
      Reflect.deleteProperty(mockStore, key);
    },
    remove: (key: string) => {
      Reflect.deleteProperty(mockStore, key);
    },
  },
}));

import SecurePinLock from '../SecurePinLock';

// ── Helpers ───────────────────────────────────────────────────────────────────
const TEST_PIN = '1234';
const TEST_SALT = 'aabbccdd'.repeat(4); // 32-char hex string (matches 16-byte salt format)

/** Matches the PBKDF2 hash used by SecurePinLock (310,000 iterations, SHA-256, 256-bit) */
async function pbkdf2hex(pin: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 310_000, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  return Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const pinInput = () => document.querySelector('#pin-entry') as HTMLInputElement;
const confirmInput = () => document.querySelector('#pin-confirm') as HTMLInputElement;
const currentPinInput = () => document.querySelector('#current-pin') as HTMLInputElement;

describe('SecurePinLock', () => {
  const onUnlock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockStore).forEach((k) => {
      Reflect.deleteProperty(mockStore, k);
    });
  });

  // ── Setup mode ──────────────────────────────────────────────────────────────
  describe('Setup mode (no PIN stored)', () => {
    it('renders the setup form when no PIN is stored', () => {
      render(<SecurePinLock onUnlock={onUnlock} />);
      expect(screen.getByText('Set Up Parent PIN')).toBeInTheDocument();
      expect(pinInput()).toBeInTheDocument();
      expect(confirmInput()).toBeInTheDocument();
    });

    it('shows error when PIN is fewer than 4 digits', async () => {
      render(<SecurePinLock onUnlock={onUnlock} />);
      fireEvent.change(pinInput(), { target: { value: '123' } });
      fireEvent.change(confirmInput(), { target: { value: '123' } });
      // Button is disabled at pin.length < 4 — submit form directly to exercise
      // the defensive check inside handleSetupSubmit
      fireEvent.submit(document.querySelector('form')!);
      expect(await screen.findByText('PIN must be 4-6 digits.')).toBeInTheDocument();
      expect(onUnlock).not.toHaveBeenCalled();
    });

    it('shows error when PINs do not match', async () => {
      render(<SecurePinLock onUnlock={onUnlock} />);
      fireEvent.change(pinInput(), { target: { value: '1234' } });
      fireEvent.change(confirmInput(), { target: { value: '5678' } });
      // Button is disabled when pins mismatch — submit form directly
      fireEvent.submit(document.querySelector('form')!);
      expect(await screen.findByText('PINs do not match.')).toBeInTheDocument();
      expect(onUnlock).not.toHaveBeenCalled();
    });

    it('calls onUnlock and persists hash+salt after valid PIN setup', async () => {
      render(<SecurePinLock onUnlock={onUnlock} />);
      fireEvent.change(pinInput(), { target: { value: '1234' } });
      fireEvent.change(confirmInput(), { target: { value: '1234' } });
      fireEvent.click(screen.getByRole('button', { name: /set pin/i }));
      await waitFor(() => expect(onUnlock).toHaveBeenCalledTimes(1));
      expect(mockStore['parentPinHash']).toBeTruthy();
      expect(mockStore['parentPinSalt']).toBeTruthy();
    });

    it('disables Set PIN button when PIN is too short', () => {
      render(<SecurePinLock onUnlock={onUnlock} />);
      fireEvent.change(pinInput(), { target: { value: '12' } });
      const btn = screen.getByRole('button', { name: /set pin/i }) as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it('disables Set PIN button when PINs do not match', () => {
      render(<SecurePinLock onUnlock={onUnlock} />);
      fireEvent.change(pinInput(), { target: { value: '1234' } });
      fireEvent.change(confirmInput(), { target: { value: '5678' } });
      const btn = screen.getByRole('button', { name: /set pin/i }) as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it('ignores non-numeric input', () => {
      render(<SecurePinLock onUnlock={onUnlock} />);
      fireEvent.change(pinInput(), { target: { value: 'abc' } });
      expect(pinInput().value).toBe('');
    });

    it('ignores PIN longer than 6 digits', () => {
      render(<SecurePinLock onUnlock={onUnlock} />);
      fireEvent.change(pinInput(), { target: { value: '1234567' } });
      expect(pinInput().value).toBe('');
    });
  });

  // ── Login mode ──────────────────────────────────────────────────────────────
  describe('Login mode (PIN stored)', () => {
    beforeEach(async () => {
      const correctHash = await pbkdf2hex(TEST_PIN, TEST_SALT);
      mockStore['parentPinHash'] = correctHash;
      mockStore['parentPinSalt'] = TEST_SALT;
      mockStore['parentPinHashVersion'] = 'pbkdf2';
    });

    it('renders the login form when PIN is stored', () => {
      render(<SecurePinLock onUnlock={onUnlock} />);
      expect(screen.getByText('Parent Zone')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /unlock/i })).toBeInTheDocument();
    });

    it('calls onUnlock when the correct PIN is entered', async () => {
      render(<SecurePinLock onUnlock={onUnlock} />);
      fireEvent.change(currentPinInput(), { target: { value: TEST_PIN } });
      fireEvent.click(screen.getByRole('button', { name: /unlock/i }));
      await waitFor(() => expect(onUnlock).toHaveBeenCalledTimes(1));
    });

    it('clears PIN from the input after submission', async () => {
      render(<SecurePinLock onUnlock={onUnlock} />);
      fireEvent.change(currentPinInput(), { target: { value: TEST_PIN } });
      fireEvent.click(screen.getByRole('button', { name: /unlock/i }));
      await waitFor(() => expect(currentPinInput().value).toBe(''));
    });

    it('shows error on wrong PIN with remaining attempts', async () => {
      render(<SecurePinLock onUnlock={onUnlock} />);
      fireEvent.change(currentPinInput(), { target: { value: '9999' } });
      fireEvent.click(screen.getByRole('button', { name: /unlock/i }));
      await waitFor(() =>
        expect(screen.getByText('Incorrect PIN. 2 attempts remaining.')).toBeInTheDocument(),
      );
      expect(onUnlock).not.toHaveBeenCalled();
    });

    it('decrements remaining attempts on each wrong PIN', async () => {
      render(<SecurePinLock onUnlock={onUnlock} />);

      // 1st wrong attempt
      fireEvent.change(currentPinInput(), { target: { value: '9999' } });
      fireEvent.click(screen.getByRole('button', { name: /unlock/i }));
      await waitFor(() => screen.getByText('Incorrect PIN. 2 attempts remaining.'));

      // 2nd wrong attempt
      fireEvent.change(currentPinInput(), { target: { value: '9999' } });
      fireEvent.click(screen.getByRole('button', { name: /unlock/i }));
      await waitFor(() =>
        expect(screen.getByText('Incorrect PIN. 1 attempts remaining.')).toBeInTheDocument(),
      );
    });

    it('locks after 3 wrong attempts with 30-second lockout', async () => {
      render(<SecurePinLock onUnlock={onUnlock} />);

      for (let i = 0; i < 2; i++) {
        fireEvent.change(currentPinInput(), { target: { value: '9999' } });
        fireEvent.click(screen.getByRole('button', { name: /unlock/i }));
        await waitFor(() =>
          screen.getByText(new RegExp(`${2 - i} attempts remaining`)),
        );
      }

      // 3rd wrong attempt triggers lockout
      fireEvent.change(currentPinInput(), { target: { value: '9999' } });
      fireEvent.click(screen.getByRole('button', { name: /unlock/i }));
      await waitFor(() =>
        expect(screen.getByText('Too many failed attempts')).toBeInTheDocument(),
      );

      expect(onUnlock).not.toHaveBeenCalled();
      expect(mockStore['parentPinLockout']).toBeTruthy();
    });
  });

  // ── Pre-existing lockout ────────────────────────────────────────────────────
  describe('Lockout state from storage', () => {
    beforeEach(() => {
      mockStore['parentPinHash'] = '00'.repeat(32);
      mockStore['parentPinSalt'] = TEST_SALT;
      mockStore['parentPinHashVersion'] = 'pbkdf2';
    });

    it('shows locked UI when a future lockout timestamp is stored', () => {
      mockStore['parentPinLockout'] = String(Date.now() + 30_000);
      render(<SecurePinLock onUnlock={onUnlock} />);
      expect(screen.getByText(/locked\. try again in/i)).toBeInTheDocument();
      const btn = screen.getByRole('button', { name: /locked/i }) as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it('disables the PIN input when locked', () => {
      mockStore['parentPinLockout'] = String(Date.now() + 30_000);
      render(<SecurePinLock onUnlock={onUnlock} />);
      expect(currentPinInput().disabled).toBe(true);
    });

    it('clears an expired lockout from storage on mount', () => {
      mockStore['parentPinLockout'] = String(Date.now() - 1_000); // already expired
      render(<SecurePinLock onUnlock={onUnlock} />);
      expect(mockStore['parentPinLockout']).toBeUndefined();
      expect(screen.queryByText(/locked\. try again in/i)).not.toBeInTheDocument();
    });

    it('does not submit when lockout is active', async () => {
      mockStore['parentPinLockout'] = String(Date.now() + 30_000);
      render(<SecurePinLock onUnlock={onUnlock} />);
      // Button is disabled, form submit is also guarded
      const form = document.querySelector('form')!;
      fireEvent.submit(form);
      await waitFor(() => expect(onUnlock).not.toHaveBeenCalled());
    });
  });

  // ── Lockout countdown timer ─────────────────────────────────────────────────
  describe('Lockout countdown', () => {
    afterEach(() => vi.useRealTimers());

    it('displays a formatted MM:SS countdown when locked', () => {
      mockStore['parentPinHash'] = '00'.repeat(32);
      mockStore['parentPinSalt'] = TEST_SALT;
      mockStore['parentPinHashVersion'] = 'pbkdf2';
      mockStore['parentPinLockout'] = String(Date.now() + 90_000); // 1m 30s
      render(<SecurePinLock onUnlock={onUnlock} />);
      // The description text is unique: "Locked. Try again in 1:30"
      // The standalone countdown "1:30" also appears — use the description to avoid ambiguity
      expect(screen.getByText(/locked\. try again in 1:\d{2}/i)).toBeInTheDocument();
    });

    it('unlocks automatically when the countdown reaches zero', async () => {
      vi.useFakeTimers();
      mockStore['parentPinHash'] = '00'.repeat(32);
      mockStore['parentPinSalt'] = TEST_SALT;
      mockStore['parentPinHashVersion'] = 'pbkdf2';
      mockStore['parentPinLockout'] = String(Date.now() + 1_500); // 1.5 seconds
      render(<SecurePinLock onUnlock={onUnlock} />);
      expect(screen.getByText(/locked\. try again in/i)).toBeInTheDocument();

      // Advance past lockout expiry; wrap in act so React flushes state updates
      await act(async () => {
        vi.advanceTimersByTime(2_000);
      });

      // Lockout message should be gone — component is now in unlocked login mode
      expect(screen.queryByText(/locked\. try again in/i)).not.toBeInTheDocument();
    });
  });
});
