export type View = 'today' | 'symptoms' | 'history' | 'settings';

interface Props {
  current: View;
  onChange: (view: View) => void;
}

function LogoMark() {
  return (
    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/70 text-sky-700 ring-1 ring-sky-100">
      <svg
        width="35"
        height="35"
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M15.5 33.5h19a7.5 7.5 0 0 0 0-15 11 11 0 0 0-21-2.8A9 9 0 0 0 15.5 33.5Z" />
        <path d="M34 5v4M34 17v4M26 13h-4M46 13h-4M28.3 7.3l-2.8-2.8M42.5 21.5l-2.8-2.8M39.7 7.3l2.8-2.8" />
      </svg>
    </div>
  );
}

function TabIcon({ tab, active }: { tab: View; active: boolean }) {
  const color = active ? '#0567c5' : '#64748b';
  const paths: Record<View, string[]> = {
    today: ['M3 12l9-8 9 8', 'M5 10v10h14V10', 'M9 20v-6h6v6'],
    symptoms: ['M12 21s7-4.4 7-10a7 7 0 0 0-14 0c0 5.6 7 10 7 10Z', 'M9 11h6M12 8v6'],
    history: ['M8 3v4M16 3v4', 'M4 8h16', 'M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z'],
    settings: ['M9 11l3 3L22 4', 'M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'],
  };

  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[tab].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}

const TABS: { key: View; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'symptoms', label: 'Symptoms' },
  { key: 'history', label: 'History' },
  { key: 'settings', label: 'Habits' },
];

export function NavBar({ current, onChange }: Props) {
  return (
    <nav className="sticky top-0 z-20 px-4 pt-4" aria-label="Main navigation">
      <div className="nav-shell mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <LogoMark />
            <div>
              <p className="text-lg font-black leading-tight text-sky-950">Health Tracker</p>
              <p className="text-xs font-bold text-sky-700/70">My Daily Journal</p>
            </div>
          </div>
        </div>

        <div className="tab-shell mx-auto grid w-full max-w-xl grid-cols-4 gap-1 sm:w-auto">
          {TABS.map(({ key, label }) => {
            const active = current === key;
            return (
              <button
                key={key}
                onClick={() => onChange(key)}
                className={`tab-button ${active ? 'tab-button-active' : ''}`}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
              >
                <TabIcon tab={key} active={active} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <div className="hidden sm:block" aria-hidden="true" />
      </div>
    </nav>
  );
}
