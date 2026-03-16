import { EditorSettings } from '../types';
import type * as Monaco from 'monaco-editor';
import { logger } from '../services/Logger';

// A subset of VS Code theme format
export interface VSCodeTheme {
  name?: string;
  type?: 'dark' | 'light';
  colors?: Record<string, string>;
  tokenColors?: Array<{
    name?: string;
    scope: string | string[];
    settings: {
      foreground?: string;
      background?: string;
      fontStyle?: string;
    };
  }>;
}

export const loadCustomTheme = async (themeName: string, themeJson: string) => {
  try {
    const themeData = JSON.parse(themeJson) as VSCodeTheme;
    
    // Map VS Code theme to Monaco theme
    const monaco = await import('monaco-editor');
    const rules: Monaco.editor.ITokenThemeRule[] = [];
    
    if (themeData.tokenColors) {
      themeData.tokenColors.forEach((tc) => {
        const scopes = Array.isArray(tc.scope) ? tc.scope : tc.scope ? tc.scope.split(',') : [];
        scopes.forEach((scope) => {
          rules.push({
            token: scope.trim(),
            foreground: tc.settings.foreground?.replace('#', ''),
            background: tc.settings.background?.replace('#', ''),
            fontStyle: tc.settings.fontStyle
          });
        });
      });
    }

    monaco.editor.defineTheme(themeName, {
      base: themeData.type === 'light' ? 'vs' : 'vs-dark',
      inherit: true,
      rules: rules,
      colors: themeData.colors || {}
    });

    logger.info(`[ThemeManager] Successfully loaded theme: ${themeName}`);
    return true;
  } catch (error) {
    logger.error(`[ThemeManager] Failed to load custom theme: ${error}`);
    return false;
  }
};
