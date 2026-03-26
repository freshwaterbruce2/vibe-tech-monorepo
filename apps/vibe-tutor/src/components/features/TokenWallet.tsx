import {
  ArrowLeft,
  Award,
  Coins,
  ShoppingBag,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  getRecentTransactions,
  getTodayEarnings,
  getTodaySpending,
  getTokenBalance,
  getTokenStats,
  type TokenTransaction,
} from '../../services/tokenService';
import type { View } from '../../types';

interface TokenWalletProps {
  onClose?: () => void;
  onNavigate?: (view: View) => void;
  compact?: boolean;
}

/** Animates a number counting up from 0 to target */
function useCountUp(target: number, durationMs = 800) {
  const [value, setValue] = useState(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [target, durationMs]);

  return value;
}

const TokenWallet = ({ onClose, onNavigate, compact = false }: TokenWalletProps) => {
  const balance = getTokenBalance();
  const stats = getTokenStats();
  const transactions = getRecentTransactions(20);
  const todayEarnings = getTodayEarnings();
  const todaySpending = getTodaySpending();

  const [filter, setFilter] = useState<'all' | 'earn' | 'spend'>('all');
  const animatedBalance = useCountUp(balance);

  const filteredTransactions =
    filter === 'all' ? transactions : transactions.filter((t) => t.type === filter);

  // Motivational message based on balance
  const getMotivation = () => {
    if (balance >= 500) return '🏆 Token Master! Amazing savings!';
    if (balance >= 200) return '🔥 On fire! Keep stacking!';
    if (balance >= 50) return '⭐ Great start! Keep going!';
    if (todayEarnings > 0) return "💪 You're earning today!";
    return '🎮 Complete tasks to earn tokens!';
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const formatTime = (timestamp: number): string =>
    new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-lg">
        <Coins className="w-5 h-5 text-white" />
        <span className="font-bold text-white text-lg">{balance.toLocaleString()}</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 p-4 pb-36 md:pb-8">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            {onClose && (
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-lg transition-colors text-white font-medium"
              >
                <ArrowLeft size={20} /> Back
              </button>
            )}
            <div className="flex items-center gap-2">
              <Coins className="w-6 h-6 text-yellow-400" />
              <h1 className="text-xl font-bold text-white">Token Wallet</h1>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate('shop')}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-600 hover:to-violet-700 rounded-lg transition-all text-white font-medium shadow-lg shadow-fuchsia-500/20"
              >
                <ShoppingBag size={18} /> Shop
              </button>
            )}
          </div>
        </div>

        {/* Balance Hero Card */}
        <div className="glass-card overflow-hidden">
          {/* Decorative top border */}
          <div className="h-1 bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400" />
          <div className="p-6 text-center relative">
            {/* Background accent */}
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-orange-500/10 pointer-events-none" />

            <div className="relative">
              {/* Coin icon with pulse */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 p-[2px] shadow-[0_0_30px_rgba(250,204,21,0.4)] group-hover:scale-110 transition-transform duration-500 shrink-0">
                <div className="w-full h-full bg-[#1a1c23] rounded-2xl flex items-center justify-center">
                  <Coins className="w-8 h-8 text-yellow-400" />
                </div>
              </div>

              <p className="text-sm text-white/60 mb-1 font-medium tracking-wide uppercase">
                Current Balance
              </p>

              {/* Animated balance */}
              <span className="text-5xl sm:text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 via-yellow-400 to-orange-500 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] tabular-nums tracking-tight">
                {animatedBalance.toLocaleString()}
              </span>

              <div className="flex items-center justify-center gap-1.5 text-yellow-400/80">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-semibold">Vibe Tokens</span>
              </div>

              {/* Motivational message */}
              <div className="mt-3 text-sm text-white/70 font-medium">{getMotivation()}</div>
            </div>
          </div>
        </div>

        {/* Today's Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-fuchsia-400" />}
            label="Earned Today"
            value={`+${todayEarnings}`}
            color="fuchsia"
          />
          <StatCard
            icon={<TrendingDown className="w-5 h-5 text-red-400" />}
            label="Spent Today"
            value={`-${todaySpending}`}
            color="red"
          />
          <StatCard
            icon={<Award className="w-5 h-5 text-cyan-400" />}
            label="All-Time Earned"
            value={stats.totalEarned.toLocaleString()}
            color="cyan"
          />
          <StatCard
            icon={<Zap className="w-5 h-5 text-purple-400" />}
            label="All-Time Spent"
            value={stats.totalSpent.toLocaleString()}
            color="purple"
          />
        </div>

        {/* Transaction History */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Recent Activity</h3>
            <div className="flex gap-1.5">
              {(['all', 'earn', 'spend'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                    filter === f
                      ? f === 'earn'
                        ? 'bg-violet-600 text-white shadow-lg shadow-fuchsia-500/20'
                        : f === 'spend'
                          ? 'bg-red-600 text-white shadow-lg shadow-red-500/20'
                          : 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'earn' ? 'Earned' : 'Spent'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-10">
                <Coins className="w-10 h-10 mx-auto mb-3 text-white/20" />
                <p className="text-white/50 font-medium">No transactions yet</p>
                <p className="text-white/30 text-sm mt-1">Complete tasks to earn tokens!</p>
              </div>
            ) : (
              filteredTransactions.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  formatDate={formatDate}
                  formatTime={formatTime}
                />
              ))
            )}
          </div>
        </div>

        {/* Shop CTA (bottom) */}
        {onNavigate && (
          <button
            onClick={() => onNavigate('shop')}
            className="w-full glass-card p-4 flex items-center justify-center gap-3 bg-gradient-to-r from-violet-600/20 to-violet-600/20 border border-fuchsia-500/30 hover:border-fuchsia-400/50 transition-all active:scale-[0.98] group"
          >
            <ShoppingBag className="w-6 h-6 text-fuchsia-400 group-hover:scale-110 transition-transform" />
            <span className="text-lg font-bold text-fuchsia-400">Visit the Reward Shop</span>
            <span className="text-white/50 text-sm ml-1">Spend your tokens!</span>
          </button>
        )}
      </div>
    </div>
  );
};

/* ---------- Sub-components ---------- */

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'fuchsia' | 'red' | 'cyan' | 'purple';
}) {
  const borderMap = {
    fuchsia: 'border-fuchsia-500/20 bg-violet-600/10',
    red: 'border-red-500/20 bg-red-600/10',
    cyan: 'border-cyan-500/20 bg-cyan-600/10',
    purple: 'border-purple-500/20 bg-purple-600/10',
  };
  const textMap = {
    fuchsia: 'text-fuchsia-400',
    red: 'text-red-400',
    cyan: 'text-cyan-400',
    purple: 'text-purple-400',
  };

  return (
    <div className={`glass-card p-4 border ${borderMap[color]}`}>
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <span className="text-xs text-white/60 font-medium">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${textMap[color]}`}>{value}</div>
    </div>
  );
}

function TransactionRow({
  transaction,
  formatDate,
  formatTime,
}: {
  transaction: TokenTransaction;
  formatDate: (ts: number) => string;
  formatTime: (ts: number) => string;
}) {
  const isEarn = transaction.type === 'earn';

  return (
    <div
      className={`rounded-xl p-3.5 flex items-center gap-3 transition-colors ${
        isEarn
          ? 'bg-fuchsia-500/5 border border-fuchsia-500/10 hover:bg-fuchsia-500/10'
          : 'bg-red-500/5 border border-red-500/10 hover:bg-red-500/10'
      }`}
    >
      {/* Icon */}
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
          isEarn ? 'bg-fuchsia-500/20' : 'bg-red-500/20'
        }`}
      >
        {isEarn ? (
          <TrendingUp className="w-4 h-4 text-fuchsia-400" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-400" />
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm truncate">{transaction.reason}</p>
        <p className="text-xs text-white/40">
          {formatDate(transaction.timestamp)} · {formatTime(transaction.timestamp)}
        </p>
      </div>

      {/* Amount */}
      <div className={`text-lg font-bold shrink-0 ${isEarn ? 'text-fuchsia-400' : 'text-red-400'}`}>
        {isEarn ? '+' : '-'}
        {transaction.amount}
      </div>
    </div>
  );
}

export default TokenWallet;
