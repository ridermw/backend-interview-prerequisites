/**
 * Logging utility for structured application logging.
 * Provides consistent logging interface across the application with severity levels.
 * Can be extended to integrate with external logging services (e.g., Winston, Pino).
 */

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: unknown;
}

/**
 * Logger class for structured application logging.
 * Formats log entries consistently and can be configured for different environments.
 */
export class Logger {
  private static minLevel: LogLevel = LogLevel.INFO;
  private static enabled: boolean = process.env.NODE_ENV !== "test";

  /**
   * Set minimum log level. Logs below this level will be suppressed.
   * @param level - Minimum log level to display
   */
  static setLogLevel(level: LogLevel): void {
    Logger.minLevel = level;
  }

  /**
   * Enable or disable logging output.
   * Useful for suppressing logs in test environments.
   * @param enabled - Whether to output logs
   */
  static setEnabled(enabled: boolean): void {
    Logger.enabled = enabled;
  }

  /**
   * Check if a log level should be output based on current min level
   */
  private static shouldLog(level: LogLevel): boolean {
    const levels = [
      LogLevel.DEBUG,
      LogLevel.INFO,
      LogLevel.WARN,
      LogLevel.ERROR,
    ];
    const currentIndex = levels.indexOf(Logger.minLevel);
    const requestedIndex = levels.indexOf(level);
    return requestedIndex >= currentIndex;
  }

  /**
   * Format and output a log entry
   */
  private static log(entry: LogEntry): void {
    if (!Logger.enabled || !Logger.shouldLog(entry.level)) {
      return;
    }

    const contextStr = entry.context ? `[${entry.context}]` : "";
    const dataStr =
      entry.data !== undefined ? ` ${JSON.stringify(entry.data)}` : "";
    const message = `${entry.timestamp} ${entry.level} ${contextStr} ${entry.message}${dataStr}`;

    // Route to appropriate console method
    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(message);
        break;
      case LogLevel.WARN:
        console.warn(message);
        break;
      default:
        console.log(message);
    }
  }

  /**
   * Create a log entry with current timestamp
   */
  private static createEntry(
    level: LogLevel,
    message: string,
    context?: string,
    data?: unknown,
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      data,
    };
  }

  /**
   * Log debug information (development only)
   */
  static debug(message: string, context?: string, data?: unknown): void {
    Logger.log(Logger.createEntry(LogLevel.DEBUG, message, context, data));
  }

  /**
   * Log informational message
   */
  static info(message: string, context?: string, data?: unknown): void {
    Logger.log(Logger.createEntry(LogLevel.INFO, message, context, data));
  }

  /**
   * Log warning message
   */
  static warn(message: string, context?: string, data?: unknown): void {
    Logger.log(Logger.createEntry(LogLevel.WARN, message, context, data));
  }

  /**
   * Log error message with optional error object
   */
  static error(message: string, context?: string, error?: unknown): void {
    const errorData =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error;
    Logger.log(Logger.createEntry(LogLevel.ERROR, message, context, errorData));
  }
}
