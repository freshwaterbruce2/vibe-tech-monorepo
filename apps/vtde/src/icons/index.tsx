import React from 'react';

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

const defaults = (props: IconProps, size = 24) => ({
  width: props.size ?? size,
  height: props.size ?? size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
  size: undefined,
});

/* ── Terminal ─────────────────────────────────────────── */
export function TerminalIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <polyline points="7 8 11 12 7 16" />
      <line x1="13" y1="16" x2="17" y2="16" />
    </svg>
  );
}

/* ── System Monitor ───────────────────────────────────── */
export function MonitorIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <polyline points="6 13 9 9 12 11 15 7 18 10" />
    </svg>
  );
}

/* ── Memory / Brain ───────────────────────────────────── */
export function MemoryIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      <path d="M12 2C8.5 2 5.5 4.5 5.5 8c0 2.5 1.5 4.5 3.5 5.5V15a3 3 0 006 0v-1.5c2-1 3.5-3 3.5-5.5 0-3.5-3-6-6.5-6z" />
      <path d="M9 18h6" />
      <path d="M10 21h4" />
      <path d="M9 9.5h6" />
      <path d="M9 12h6" />
    </svg>
  );
}

/* ── Nova / AI Sparkle ────────────────────────────────── */
export function NovaIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

/* ── Healing / Shield ─────────────────────────────────── */
export function HealingIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  );
}

/* ── Code Brackets ────────────────────────────────────── */
export function CodeIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
      <line x1="14" y1="4" x2="10" y2="20" />
    </svg>
  );
}

/* ── Globe / Web ──────────────────────────────────────── */
export function WebIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      <circle cx="12" cy="12" r="10" />
      <ellipse cx="12" cy="12" rx="4" ry="10" />
      <path d="M2 12h20" />
      <path d="M4 7h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

/* ── Neural Net / AI ──────────────────────────────────── */
export function AiIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      <circle cx="6" cy="6" r="2" />
      <circle cx="18" cy="6" r="2" />
      <circle cx="12" cy="12" r="2.5" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
      <line x1="7.5" y1="7.5" x2="10.5" y2="10.5" />
      <line x1="16.5" y1="7.5" x2="13.5" y2="10.5" />
      <line x1="7.5" y1="16.5" x2="10.5" y2="13.5" />
      <line x1="16.5" y1="16.5" x2="13.5" y2="13.5" />
    </svg>
  );
}

/* ── Tools / Wrench ───────────────────────────────────── */
export function ToolsIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94L6.73 20.2a2 2 0 01-2.83 0l-.1-.1a2 2 0 010-2.83l6.73-6.73A6 6 0 016.3 2.53l3.77 3.77z" />
    </svg>
  );
}

/* ── Mobile / Phone ───────────────────────────────────── */
export function MobileIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      <rect x="6" y="2" width="12" height="20" rx="3" />
      <line x1="12" y1="18" x2="12" y2="18.01" strokeWidth="2.5" />
    </svg>
  );
}

/* ── Dashboard / Grid ─────────────────────────────────── */
export function DashboardIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

/* ── Education / Grad Cap ─────────────────────────────── */
export function EducationIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      <path d="M12 3L1 9l11 6 9-5V17" />
      <path d="M5 13.18v4L12 21l7-3.82v-4" />
    </svg>
  );
}

/* ── Finance / Chart ──────────────────────────────────── */
export function FinanceIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  );
}

/* ── Shipping / Box ───────────────────────────────────── */
export function ShippingIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

/* ── VTDE Branding ────────────────────────────────────── */
export function VtdeIcon(props: IconProps) {
  return (
    <svg {...defaults(props)} strokeWidth={2.2}>
      <path d="M4 4l8 16 8-16" />
      <path d="M8 4h8" opacity={0.5} />
    </svg>
  );
}

/* ── File Explorer ────────────────────────────────────── */
export function FolderIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  );
}

/* ── Settings / Gear ──────────────────────────────────── */
export function SettingsIcon(props: IconProps) {
  return (
    <svg {...defaults(props)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}
