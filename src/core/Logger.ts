// ============================================================
// Logger central — usar siempre en lugar de console.log directo
// En producción (import.meta.env.PROD) solo se muestran warn y error.
// ============================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LogData = Record<string, any> | Error | unknown;

function formatEntry(entry: LogEntry): string {
  const prefix = `[METTLEBOUND][${entry.level.toUpperCase()}]`;
  return `${prefix} ${entry.message}`;
}

const isDev = !import.meta.env.PROD;

export const logger = {
  debug(message: string, data?: LogData): void {
    if (!isDev) { return; }
    console.warn(formatEntry({ level: 'debug', message, data }), data ?? '');
  },

  info(message: string, data?: LogData): void {
    if (!isDev) { return; }
    console.warn(formatEntry({ level: 'info', message, data }), data ?? '');
  },

  warn(message: string, data?: LogData): void {
    console.warn(formatEntry({ level: 'warn', message, data }), data ?? '');
  },

  error(message: string, data?: LogData): void {
    console.error(formatEntry({ level: 'error', message, data }), data ?? '');
  },
} as const;
