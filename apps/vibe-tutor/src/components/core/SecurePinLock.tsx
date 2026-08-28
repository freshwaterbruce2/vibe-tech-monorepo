import React, { useEffect, useState } from 'react';

import { appStore } from '../../utils/electronStore';

interface PinLockProps {
  onUnlock: () => void;
}

// Generate a cryptographically random 16-byte hex salt
function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// PBKDF2 PIN hash — 310,000 iterations, SHA-256, 32-byte output
// NOTE: Hashes generated here are not backward-compatible with the old SHA-256(pin+salt) format.
// On first launch after this upgrade, users with an existing PIN must reset it.
async function hashPin(pin: string, salt: string): Promise<string> {
  const enc = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: 310_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );

  return Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getInitialLockoutState(): {
  isSetupMode: boolean;
  lockout: boolean;
  lockoutEndTime: number;
  lockoutRemaining: number;
  shouldClearExpiredLockout: boolean;
  attempts: number;
} {
  // Migrate legacy SHA-256 hashes: if a hash exists but was set before PBKDF2
  // was introduced, clear it and force re-setup rather than silently failing.
  const pinHashVersion = appStore.get('parentPinHashVersion');
  if (appStore.get('parentPinHash') && pinHashVersion !== 'pbkdf2') {
    appStore.delete('parentPinHash');
    appStore.delete('parentPinSalt');
    appStore.delete('parentPinHashVersion');
    appStore.delete('parentPinAttempts');
    appStore.delete('parentPinLockout');
  }

  const storedHash = appStore.get('parentPinHash');
  const storedSalt = appStore.get('parentPinSalt');
  const lockoutEnd = appStore.get('parentPinLockout');
  const storedAttempts = appStore.get('parentPinAttempts');
  const attempts = storedAttempts ? (Number.parseInt(storedAttempts, 10) || 0) : 0;

  const isSetupMode = !storedHash || !storedSalt;
  if (!lockoutEnd) {
    return {
      isSetupMode,
      lockout: false,
      lockoutEndTime: 0,
      lockoutRemaining: 0,
      shouldClearExpiredLockout: false,
      attempts,
    };
  }

  const endTime = Number.parseInt(lockoutEnd, 10);
  const now = Date.now();
  if (Number.isFinite(endTime) && now < endTime) {
    return {
      isSetupMode,
      lockout: true,
      lockoutEndTime: endTime,
      lockoutRemaining: Math.max(0, endTime - now),
      shouldClearExpiredLockout: false,
      attempts,
    };
  }

  return {
    isSetupMode,
    lockout: false,
    lockoutEndTime: 0,
    lockoutRemaining: 0,
    shouldClearExpiredLockout: true,
    attempts: 0,
  };
}

const SecurePinLock = ({ onUnlock }: PinLockProps) => {
  const [initialLockoutState] = useState(() => getInitialLockoutState());
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [isSetupMode] = useState(initialLockoutState.isSetupMode);
  const [attempts, setAttempts] = useState(initialLockoutState.attempts);
  const [lockout, setLockout] = useState(initialLockoutState.lockout);
  const [lockoutEndTime, setLockoutEndTime] = useState(initialLockoutState.lockoutEndTime);
  const [lockoutRemaining, setLockoutRemaining] = useState(initialLockoutState.lockoutRemaining);

  useEffect(() => {
    if (initialLockoutState.shouldClearExpiredLockout) {
      appStore.delete('parentPinLockout');
    }
  }, [initialLockoutState.shouldClearExpiredLockout]);

  useEffect(() => {
    if (lockout && lockoutEndTime > 0) {
      const timer = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, lockoutEndTime - now);
        setLockoutRemaining(remaining);
        
        if (now >= lockoutEndTime) {
          setLockout(false);
          setLockoutEndTime(0);
          setAttempts(0);
          setError('');
          appStore.delete('parentPinLockout');
          appStore.delete('parentPinAttempts');
        }
      }, 1000);

      return () => clearInterval(timer);
    }
    return undefined;
  }, [lockout, lockoutEndTime]);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPin = e.target.value;
    if (/^\d*$/.test(newPin) && newPin.length <= 6) {
      setPin(newPin);
      setError('');
    }
  };

  const handleConfirmPinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPin = e.target.value;
    if (/^\d*$/.test(newPin) && newPin.length <= 6) {
      setConfirmPin(newPin);
      setError('');
    }
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pin.length < 4) {
      setError('PIN must be 4-6 digits.');
      return;
    }

    if (pin !== confirmPin) {
      setError('PINs do not match.');
      return;
    }

    // Generate salt and hash the PIN
    const salt = generateSalt();
    const hashedPin = await hashPin(pin, salt);

    // Store hashed PIN, salt, and hash version
    appStore.set('parentPinHash', hashedPin);
    appStore.set('parentPinSalt', salt);
    appStore.set('parentPinHashVersion', 'pbkdf2');

    // Clear PIN from memory immediately
    setPin('');
    setConfirmPin('');

    onUnlock();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockout) return;

    const storedHash = appStore.get('parentPinHash');
    const storedSalt = appStore.get('parentPinSalt');

    if (!storedHash || !storedSalt) {
      setError('PIN not configured. Please refresh and set up a PIN.');
      return;
    }

    // Hash the entered PIN with stored salt
    const enteredHash = await hashPin(pin, storedSalt);

    // Clear PIN from memory immediately
    setPin('');

    if (enteredHash === storedHash) {
      setAttempts(0);
      appStore.delete('parentPinAttempts');
      onUnlock();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      appStore.set('parentPinAttempts', String(newAttempts));

      if (newAttempts >= 3) {
        // Progressive lockout: 30s, 5min, 15min, 1hr
        const lockoutDurations = [30000, 300000, 900000, 3600000];
        const failedSets = Math.min(Math.floor(newAttempts / 3) - 1, 3);
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- 0ms lockout is invalid
        const lockoutDuration = lockoutDurations[failedSets] || 3600000;
        const now = Date.now();
        const lockoutEnd = now + lockoutDuration;

        setLockoutEndTime(lockoutEnd);
        setLockoutRemaining(lockoutDuration);
        setLockout(true);
        appStore.set('parentPinLockout', String(lockoutEnd));

        const minutes = Math.floor(lockoutDuration / 60000);
        const seconds = Math.floor((lockoutDuration % 60000) / 1000);
        setError(
          `Too many incorrect attempts. Locked for ${minutes > 0 ? `${minutes}m ` : ''}${seconds}s`,
        );
      } else {
        setError(`Incorrect PIN. ${3 - newAttempts} attempts remaining.`);
      }
    }
  };

  const formatLockoutTime = () => {
    if (!lockout || lockoutRemaining <= 0) return '';
    const minutes = Math.floor(lockoutRemaining / 60000);
    const seconds = Math.floor((lockoutRemaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (isSetupMode) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-800/50">
        <div className="w-full max-w-sm text-center">
          <h2 className="text-2xl font-bold text-text-primary mb-2">Set Up Parent PIN</h2>
          <p className="text-text-secondary mb-8">
            Create a secure 4-6 digit PIN to protect the Parent Zone.
          </p>
          <form onSubmit={(e) => { void handleSetupSubmit(e); }}>
            <input
              type="password"
              id="pin-entry"
              name="pin-entry"
              placeholder="Enter PIN"
              value={pin}
              onChange={handlePinChange}
              maxLength={6}
              className="w-full p-4 mb-4 text-center text-3xl tracking-[0.5em] bg-slate-700/50 border border-slate-600 rounded-lg text-text-primary focus:ring-2 focus:ring-[var(--primary-accent)] outline-none"
              autoFocus
              autoComplete="off"
            />
            <input
              type="password"
              id="pin-confirm"
              name="pin-confirm"
              placeholder="Confirm PIN"
              value={confirmPin}
              onChange={handleConfirmPinChange}
              maxLength={6}
              className="w-full p-4 text-center text-3xl tracking-[0.5em] bg-slate-700/50 border border-slate-600 rounded-lg text-text-primary focus:ring-2 focus:ring-[var(--primary-accent)] outline-none"
              autoComplete="off"
            />
            {error && <p className="text-red-400 mt-4">{error}</p>}
            <button
              type="submit"
              className="w-full mt-6 px-6 py-3 rounded-lg bg-[var(--primary-accent)] text-background-main font-semibold hover:opacity-80 disabled:opacity-50"
              disabled={pin.length < 4 || pin !== confirmPin}
            >
              Set PIN
            </button>
          </form>
          <p className="text-xs text-text-muted mt-4">
            PIN is securely hashed and cannot be recovered if forgotten. Write it down in a safe
            place.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-800/50">
      <div className="w-full max-w-sm text-center">
        <h2 className="text-2xl font-bold text-text-primary mb-2">Parent Zone</h2>
        <p className="text-text-secondary mb-8">
          {lockout
            ? `Locked. Try again in ${formatLockoutTime()}`
            : 'Please enter the PIN to continue.'}
        </p>
        <form onSubmit={(e) => { void handleLoginSubmit(e); }}>
          <input
            type="password"
            id="current-pin"
            name="current-pin"
            value={pin}
            onChange={handlePinChange}
            maxLength={6}
            className="w-full p-4 text-center text-3xl tracking-[1em] bg-slate-700/50 border border-slate-600 rounded-lg text-text-primary focus:ring-2 focus:ring-[var(--primary-accent)] outline-none"
            autoFocus
            disabled={lockout}
            autoComplete="off"
            placeholder={lockout ? 'LOCKED' : ''}
          />
          {error && !lockout && <p className="text-red-400 mt-4">{error}</p>}
          {lockout && (
            <div className="mt-4">
              <p className="text-orange-400">Too many failed attempts</p>
              <p className="text-2xl font-mono text-orange-400 mt-2">{formatLockoutTime()}</p>
            </div>
          )}
          <button
            type="submit"
            className="w-full mt-6 px-6 py-3 rounded-lg bg-[var(--primary-accent)] text-background-main font-semibold hover:opacity-80 disabled:opacity-50"
            disabled={pin.length < 4 || lockout}
          >
            {lockout ? 'Locked' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SecurePinLock;
