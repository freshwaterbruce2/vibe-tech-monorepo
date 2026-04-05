import {
  Brain,
  Calendar,
  ChevronDown,
  ChevronUp,
  Coins,
  Eye,
  GraduationCap,
  Heart,
  Layers,
  LayoutDashboard,
  Lock,
  Menu,
  Music2,
  Timer,
  Trophy,
  X,
} from 'lucide-react';
import { useState } from 'react';
import type { View } from '../../types';
import { GradientDefs, GradientIcon } from './icons/GradientIcon';
import { VibeTechLogo } from './icons/VibeTechLogo';

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

/** All navigation items — desktop sidebar shows all, mobile shows primary 5 + "More" */
const navItems = [
  {
    view: 'dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
    gradient: 'vibe-gradient-primary',
  },
  { view: 'tutor', icon: GraduationCap, label: 'Vibe Tutor', gradient: 'vibe-gradient-secondary' },
  { view: 'friend', icon: Heart, label: 'Vibe Buddy', gradient: 'vibe-gradient-accent' },
  { view: 'cards', icon: Layers, label: 'Learning Realms', gradient: 'vibe-gradient-primary' },
  { view: 'shop', icon: Coins, label: '🛒 Reward Shop', gradient: 'vibe-gradient-secondary' },
  { view: 'games', icon: Brain, label: 'Brain Gym', gradient: 'vibe-gradient-accent' },
  { view: 'schedules', icon: Calendar, label: 'Schedules', gradient: 'vibe-gradient-primary' },
  { view: 'tokens', icon: Coins, label: 'Tokens', gradient: 'vibe-gradient-accent' },
  {
    view: 'achievements',
    icon: Trophy,
    label: 'Achievements',
    gradient: 'vibe-gradient-secondary',
  },
  { view: 'music', icon: Music2, label: 'Music', gradient: 'vibe-gradient-accent' },
  { view: 'sensory', icon: Eye, label: 'Sensory', gradient: 'vibe-gradient-primary' },
  { view: 'focus', icon: Timer, label: 'Focus', gradient: 'vibe-gradient-secondary' },
  { view: 'wellness', icon: Heart, label: 'Wellness', gradient: 'vibe-gradient-accent' },
] as const;

/** The 5 primary tabs shown in the mobile bottom nav */
const MOBILE_PRIMARY: View[] = ['dashboard', 'tutor', 'friend', 'music', 'sensory'];

const primaryNavItems = navItems.filter((item) => MOBILE_PRIMARY.includes(item.view as View));
const secondaryNavItems = navItems.filter((item) => !MOBILE_PRIMARY.includes(item.view as View));

const Sidebar = ({ currentView, onNavigate, isCollapsed = false, onToggle }: SidebarProps) => {
  const [moreOpen, setMoreOpen] = useState(false);

  const handleMoreNavigate = (view: View) => {
    onNavigate(view);
    setMoreOpen(false);
  };

  return (
    <>
      <GradientDefs />

      {/* Desktop Sidebar - hidden on mobile */}
      <div
        className={`hidden md:flex ${isCollapsed ? 'w-[72px]' : 'w-64'} glass-card border-r border-[var(--glass-border)] flex-col shrink-0 relative overflow-hidden transition-[width] duration-300`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--glass-surface)] to-transparent pointer-events-none"></div>
        <div className="relative z-10">
          <div
            className={`p-6 flex items-center gap-3 border-b border-[var(--glass-border)] backdrop-blur-sm ${isCollapsed ? 'justify-center' : 'justify-between'}`}
          >
            <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
              <VibeTechLogo className="w-12 h-12 float-animation" />
              {!isCollapsed && (
                <div>
                  <h1 className="text-xl font-bold neon-text-primary">Vibe-Tech</h1>
                  <p className="text-sm text-[var(--text-secondary)] opacity-80">AI Tutor</p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onToggle}
              className={`glass-card border border-[var(--glass-border)] rounded-lg w-10 h-10 flex items-center justify-center hover:scale-105 transition-all duration-200 focus-glow ${isCollapsed ? 'absolute top-4 right-4' : ''}`}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!isCollapsed}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronDown className="w-5 h-5 text-[var(--text-primary)]" />
              ) : (
                <ChevronUp className="w-5 h-5 text-[var(--text-primary)]" />
              )}
            </button>
          </div>
          <nav role="navigation" aria-label="Desktop navigation" className="flex-1 p-4 space-y-3">
            {navItems.map(({ view, icon: Icon, label, gradient }) => (
              <button
                key={view}
                onClick={() => onNavigate(view as View)}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left transition-all duration-300 group relative overflow-hidden ${
                  currentView === view
                    ? 'glass-button text-white font-semibold shadow-[var(--neon-glow-primary)] border-[var(--primary-accent)]'
                    : 'glass-card hover:glass-card text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:scale-105 focus-glow'
                }`}
                title={isCollapsed ? label : undefined}
                aria-label={isCollapsed ? label : undefined}
              >
                <GradientIcon
                  Icon={Icon}
                  size={24}
                  gradientId={currentView === view ? 'vibe-gradient-mobile' : gradient}
                  className="transition-all duration-300"
                />
                {!isCollapsed && <span className="transition-all duration-300">{label}</span>}
                {currentView === view && (
                  <div className="absolute right-3 w-2 h-2 bg-white rounded-full shadow-lg animate-pulse"></div>
                )}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-[var(--glass-border)]">
            <button
              onClick={() => onNavigate('parent')}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left transition-all duration-300 group relative overflow-hidden ${
                currentView === 'parent'
                  ? 'glass-button text-white font-semibold shadow-[var(--neon-glow-secondary)] border-[var(--secondary-accent)]'
                  : 'glass-card hover:glass-card text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:scale-105 focus-glow'
              }`}
              title={isCollapsed ? 'Parent Zone' : undefined}
              aria-label={isCollapsed ? 'Parent Zone' : undefined}
            >
              <GradientIcon
                Icon={Lock}
                size={24}
                gradientId={
                  currentView === 'parent' ? 'vibe-gradient-mobile' : 'vibe-gradient-secondary'
                }
                className="transition-all duration-300"
              />
              {!isCollapsed && <span className="transition-all duration-300">Parent Zone</span>}
              {currentView === 'parent' && (
                <div className="absolute right-3 w-2 h-2 bg-white rounded-full shadow-lg animate-pulse"></div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile "More" drawer — slides up from bottom nav */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-[70]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          {/* Drawer */}
          <div className="absolute bottom-0 left-0 right-0 glass-card border-t border-[var(--glass-border)] rounded-t-2xl p-4 animate-[slideUp_0.2s_ease-out]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">More</h2>
              <button
                onClick={() => setMoreOpen(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Close menu"
                title="Close menu"
              >
                <X className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {secondaryNavItems.map(({ view, icon: Icon, label, gradient }) => (
                <button
                  key={view}
                  onClick={() => handleMoreNavigate(view as View)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 ${
                    currentView === view
                      ? 'bg-[var(--primary-accent)]/20 text-[var(--primary-accent)]'
                      : 'text-[var(--text-secondary)] hover:bg-white/5'
                  }`}
                >
                  <GradientIcon
                    Icon={Icon}
                    size={24}
                    gradientId={currentView === view ? 'vibe-gradient-mobile' : gradient}
                    className="mb-1"
                  />
                  <span className="text-[10px] font-medium leading-tight text-center break-words w-full truncate text-wrap">{label}</span>
                </button>
              ))}
              {/* Parent Zone in More menu */}
              <button
                onClick={() => handleMoreNavigate('parent')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 ${
                  currentView === 'parent'
                    ? 'bg-[var(--secondary-accent)]/20 text-[var(--secondary-accent)]'
                    : 'text-[var(--text-secondary)] hover:bg-white/5'
                }`}
              >
                <GradientIcon
                  Icon={Lock}
                  size={24}
                  gradientId={
                    currentView === 'parent' ? 'vibe-gradient-mobile' : 'vibe-gradient-secondary'
                  }
                  className="mb-1"
                />
                <span className="text-[10px] font-medium leading-tight text-center break-words w-full truncate text-wrap">Parent</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation — 5 primary tabs + More */}
      <nav
        role="navigation"
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 glass-card border-t border-[var(--glass-border)] z-50 sidebar-safe-bottom"
      >
        <div className="max-w-lg mx-auto grid grid-cols-6 gap-0.5 px-2 pt-2 pb-1">
          {primaryNavItems.map(({ view, icon: Icon, label, gradient }) => (
            <button
              key={view}
              onClick={() => onNavigate(view as View)}
              className={`flex flex-col items-center justify-center min-h-[52px] px-1 py-1.5 rounded-lg transition-all duration-200 touch-manipulation ${
                currentView === view
                  ? 'text-[var(--primary-accent)]'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              <GradientIcon
                Icon={Icon}
                size={22}
                gradientId={currentView === view ? 'vibe-gradient-mobile' : gradient}
                className="mb-0.5"
              />
              <span className="text-[10px] font-medium leading-tight text-center break-words w-full truncate text-wrap">{label}</span>
            </button>
          ))}
          {/* More button */}
          <button
            onClick={() => setMoreOpen((prev) => !prev)}
            className={`flex flex-col items-center justify-center min-h-[52px] px-1 py-1.5 rounded-lg transition-all duration-200 touch-manipulation ${
              moreOpen || (!MOBILE_PRIMARY.includes(currentView) && currentView !== 'parent')
                ? 'text-[var(--primary-accent)]'
                : 'text-[var(--text-secondary)]'
            }`}
            aria-label="More navigation options"
            title="More"
          >
            <Menu className="w-[22px] h-[22px] mb-0.5" />
            <span className="text-[10px] font-medium leading-tight text-center break-words w-full truncate text-wrap">More</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
