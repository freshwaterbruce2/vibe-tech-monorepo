import type { ITerminalOptions, ITheme } from '@xterm/xterm';

export interface TerminalOptions extends Partial<ITerminalOptions> {
  shell?: string;
  name?: string;
  cwd?: string;
  env?: Record<string, string>;
  theme?: ITheme;
  rendererType?: 'dom' | 'canvas';
  copyOnSelect?: boolean;
  rows?: number;
  cols?: number;
}

export interface TerminalSessionState {
  id: string;
  name?: string;
  shell?: string;
  options?: TerminalOptions;
  createdAt: Date;
}
