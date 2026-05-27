type LogLevel = 'info' | 'warn' | 'error';

function formatLogDetail(detail: unknown): string {
  if (detail instanceof Error) {
    return detail.stack ?? detail.message;
  }

  if (typeof detail === 'string') {
    return detail;
  }

  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

function writeLog(level: LogLevel, message: string, details: unknown[]): void {
  const output = [
    `[${new Date().toISOString()}]`,
    `[${level.toUpperCase()}]`,
    message,
    ...details.map(formatLogDetail)
  ].join(' ');

  const stream = level === 'error' ? process.stderr : process.stdout;
  stream.write(`${output}\n`);
}

export const logger = {
  info(message: string, ...details: unknown[]): void {
    writeLog('info', message, details);
  },

  warn(message: string, ...details: unknown[]): void {
    writeLog('warn', message, details);
  },

  error(message: string, ...details: unknown[]): void {
    writeLog('error', message, details);
  }
};
