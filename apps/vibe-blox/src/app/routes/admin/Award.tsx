import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../../api/client';
import type { User } from '../../../types';

interface AwardProps {
  user: User;
}

export default function Award({ user: _user }: AwardProps) {
  const navigate = useNavigate();
  const [amount, setAmount] = useState<number>(10);
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const handleAward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Please provide a reason');
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch('/api/transactions/award', {
        method: 'POST',
        body: JSON.stringify({
          amount,
          description: reason,
        }),
      });
      alert(`Successfully awarded ${amount} VC!`);
      navigate('/admin');
    } catch (error) {
      console.error('Failed to award coins:', error);
      alert('Failed to award coins');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-dark pb-20">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-bg-card/95 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={async () => navigate('/admin')} className="text-2xl">
              ⬅️
            </button>
            <h1 className="font-heading text-2xl font-bold text-text-primary">Award Coins</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-md px-4 py-8">
        <div className="rounded-xl border border-border-subtle bg-bg-card p-6">
          <form onSubmit={handleAward}>
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-text-secondary">
                Amount (VC)
              </label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setAmount(Math.max(1, amount - 5))}
                  className="rounded-lg bg-bg-elevated p-3 hover:bg-bg-elevated/80"
                >
                  ➖
                </button>
                <div className="flex-1 text-center">
                  <span className="text-4xl font-bold text-gold">{amount}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAmount(amount + 5)}
                  className="rounded-lg bg-bg-elevated p-3 hover:bg-bg-elevated/80"
                >
                  ➕
                </button>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="mt-4 w-full accent-blue-primary"
              />
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-text-secondary">Reason</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why are you awarding these coins?"
                className="w-full rounded-lg border border-border-subtle bg-bg-dark px-3 py-2 text-text-primary placeholder-text-muted focus:border-blue-primary focus:outline-none"
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                'Extra Chores',
                'Great Attitude',
                'Helping Out',
                'Being Kind',
                'School Achievement',
                'Just Because',
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  className="rounded-lg border border-border-subtle bg-bg-elevated py-2 text-xs font-medium text-text-secondary hover:border-blue-primary hover:text-text-primary"
                >
                  {preset}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary mt-8 w-full py-3 text-lg font-bold"
            >
              {submitting ? 'Awarding...' : 'Award Coins'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
