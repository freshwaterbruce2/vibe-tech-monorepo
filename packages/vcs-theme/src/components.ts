/** Vibe Code Studio — Component Tokens v1.0.0 */

import { colors } from './tokens';

export const components = {
  sidebar: {
    background: colors.background.primary,
    width: '240px',
    itemHover: colors.background.tertiary,
    itemActive: colors.background.elevated,
    iconColor: colors.text.secondary,
    iconActiveColor: colors.accent.primary,
  },
  titlebar: {
    background: colors.background.primary,
    height: '38px',
    brandText: colors.accent.primary,
    statusDot: colors.semantic.success,
  },
  editor: {
    background: colors.background.secondary,
    gutterBackground: colors.background.primary,
    lineNumberColor: colors.text.muted,
    lineHighlight: 'rgba(0, 212, 255, 0.04)',
    selectionBackground: colors.accent.primaryMuted,
    cursorColor: colors.accent.primary,
  },
  tabs: {
    background: colors.background.primary,
    activeBackground: colors.background.secondary,
    activeBorder: colors.accent.primary,
    inactiveText: colors.text.secondary,
    activeText: colors.text.primary,
  },
  panel: {
    background: colors.background.secondary,
    headerBackground: colors.background.primary,
    border: colors.border.default,
  },
  button: {
    primary: {
      background: colors.accent.primary,
      text: colors.background.primary,
      hover: colors.accent.primaryHover,
      borderRadius: '6px',
    },
    secondary: {
      background: 'transparent',
      text: colors.text.primary,
      border: colors.border.strong,
      hover: colors.background.elevated,
    },
    ghost: {
      background: 'transparent',
      text: colors.text.secondary,
      hover: colors.background.tertiary,
    },
  },
  badge: {
    success: { bg: colors.semantic.successMuted, text: colors.semantic.success },
    warning: { bg: colors.semantic.warningMuted, text: colors.semantic.warning },
    error: { bg: colors.semantic.errorMuted, text: colors.semantic.error },
    info: { bg: colors.accent.primaryMuted, text: colors.accent.primary },
  },
  chip: {
    background: colors.background.tertiary,
    text: colors.text.primary,
    border: colors.border.default,
    hoverBackground: colors.background.elevated,
    borderRadius: '6px',
  },
  checkbox: {
    checked: colors.accent.primary,
    unchecked: colors.border.default,
    checkmark: colors.background.primary,
  },
  statusBar: {
    background: colors.background.primary,
    text: colors.text.secondary,
    activeText: colors.text.primary,
    height: '24px',
  },
  agentPanel: {
    background: colors.background.secondary,
    taskCompleted: colors.semantic.success,
    taskPending: colors.text.muted,
    taskActive: colors.accent.primary,
    stepBackground: colors.background.tertiary,
    stepBorder: colors.border.default,
  },
} as const;
