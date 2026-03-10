// Log type definitions for log file monitoring

export type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG";

export interface LogEntry {
	timestamp: Date;
	level: LogLevel;
	message: string;
	source?: string;
	file?: string;
	line?: number;
}

export interface LogFile {
	name: string;
	path: string;
	size: number;
	lastModified: Date;
	errorCount: number;
	warningCount: number;
}

export interface LogFilter {
	level?: LogLevel;
	startTime?: Date;
	endTime?: Date;
	keyword?: string;
	source?: string;
}

export interface LogMetrics {
	totalLogFiles: number;
	totalErrors: number;
	totalWarnings: number;
	lastHourErrors: number;
	lastDayErrors: number;
}
