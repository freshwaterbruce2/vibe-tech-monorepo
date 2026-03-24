/** Vibe Code Studio — Design Tokens v1.0.0 */

export const colors = {
  background: {
    primary: '#0B0E1A',
    secondary: '#0F1225',
    tertiary: '#141832',
    elevated: '#1A1F3A',
    surface: '#1E2444',
    overlay: '#232A50',
  },
  accent: {
    primary: '#00D4FF',
    primaryHover: '#00BFEE',
    primaryMuted: 'rgba(0, 212, 255, 0.15)',
    secondary: '#8B5CF6',
    secondaryHover: '#7C3AED',
    secondaryMuted: 'rgba(139, 92, 246, 0.15)',
  },
  text: {
    primary: '#E2E8F0',
    secondary: '#8892B0',
    muted: '#4A5568',
    inverse: '#0B0E1A',
    link: '#00D4FF',
  },
  semantic: {
    success: '#22C55E',
    successMuted: 'rgba(34, 197, 94, 0.15)',
    warning: '#F59E0B',
    warningMuted: 'rgba(245, 158, 11, 0.15)',
    error: '#EF4444',
    errorMuted: 'rgba(239, 68, 68, 0.15)',
    info: '#3B82F6',
    infoMuted: 'rgba(59, 130, 246, 0.15)',
  },
  border: {
    default: '#1E2A4A',
    subtle: '#162038',
    strong: '#2A3558',
    accent: '#00D4FF',
  },
  input: {
    background: '#0D1129',
    border: '#1E2A4A',
    borderFocus: '#00D4FF',
    placeholder: '#4A5568',
  },
  syntax: {
    keyword: '#C792EA',
    string: '#C3E88D',
    number: '#F78C6C',
    function: '#82AAFF',
    comment: '#546E7A',
    variable: '#E2E8F0',
    type: '#FFCB6B',
    operator: '#89DDFF',
    tag: '#F07178',
    attribute: '#C792EA',
  },
} as const;

export const typography = {
  fontFamily: {
    ui: "'Inter', 'Segoe UI', -apple-system, sans-serif",
    code: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    heading: "'Inter', 'Segoe UI', -apple-system, sans-serif",
  },
  fontSize: {
    xs: '11px',
    sm: '12px',
    base: '13px',
    md: '14px',
    lg: '16px',
    xl: '18px',
    '2xl': '22px',
    '3xl': '28px',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.2,
    base: 1.5,
    relaxed: 1.75,
    code: 1.6,
  },
} as const;

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '32px',
  '3xl': '48px',
} as const;

export const borderRadius = {
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  full: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 3px rgba(0, 0, 0, 0.4)',
  md: '0 4px 12px rgba(0, 0, 0, 0.5)',
  lg: '0 8px 24px rgba(0, 0, 0, 0.6)',
  glow: '0 0 12px rgba(0, 212, 255, 0.3)',
  glowPurple: '0 0 12px rgba(139, 92, 246, 0.3)',
} as const;
