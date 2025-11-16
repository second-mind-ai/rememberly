/**
 * Logging utility to replace direct console.log usage
 * Provides structured logging with different levels and production filtering
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogConfig {
  enableDebug: boolean;
  enableInfo: boolean;
  enableWarnings: boolean;
  enableErrors: boolean;
}

// Configuration based on environment
const isDevelopment = __DEV__;

const config: LogConfig = {
  enableDebug: isDevelopment,
  enableInfo: true,
  enableWarnings: true,
  enableErrors: true,
};

/**
 * Sanitize data to prevent logging sensitive information
 */
function sanitizeData(data: unknown): unknown {
  if (typeof data === 'string') {
    // Hide tokens and sensitive strings
    if (data.includes('token') || data.includes('key') || data.includes('secret')) {
      return '[REDACTED]';
    }
    // Truncate long strings
    if (data.length > 200) {
      return data.substring(0, 200) + '...';
    }
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      // Redact sensitive keys
      if (key.toLowerCase().includes('token') ||
          key.toLowerCase().includes('password') ||
          key.toLowerCase().includes('secret') ||
          key.toLowerCase().includes('key')) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Format log message with timestamp and level
 */
function formatMessage(level: LogLevel, message: string, context?: string): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? `[${context}]` : '';
  return `[${timestamp}] ${level.toUpperCase()} ${contextStr} ${message}`;
}

/**
 * Logger utility class
 */
export const logger = {
  /**
   * Debug level - Only in development
   * Use for detailed debugging information
   */
  debug(message: string, data?: unknown, context?: string): void {
    if (config.enableDebug) {
      const formatted = formatMessage('debug', message, context);
      if (data !== undefined) {
        console.log(formatted, sanitizeData(data));
      } else {
        console.log(formatted);
      }
    }
  },

  /**
   * Info level - General information
   * Use for normal application flow
   */
  info(message: string, data?: unknown, context?: string): void {
    if (config.enableInfo) {
      const formatted = formatMessage('info', message, context);
      if (data !== undefined) {
        console.log(formatted, sanitizeData(data));
      } else {
        console.log(formatted);
      }
    }
  },

  /**
   * Warning level - Potential issues
   * Use for recoverable errors or warnings
   */
  warn(message: string, data?: unknown, context?: string): void {
    if (config.enableWarnings) {
      const formatted = formatMessage('warn', message, context);
      if (data !== undefined) {
        console.warn(formatted, sanitizeData(data));
      } else {
        console.warn(formatted);
      }
    }
  },

  /**
   * Error level - Critical issues
   * Use for errors that need attention
   */
  error(message: string, error?: unknown, context?: string): void {
    if (config.enableErrors) {
      const formatted = formatMessage('error', message, context);
      if (error !== undefined) {
        // For Error objects, log the stack trace in development
        if (error instanceof Error && isDevelopment) {
          console.error(formatted, error);
        } else {
          console.error(formatted, sanitizeData(error));
        }
      } else {
        console.error(formatted);
      }
    }
  },

  /**
   * Performance logging - Measure execution time
   */
  time(label: string): void {
    if (isDevelopment) {
      console.time(label);
    }
  },

  timeEnd(label: string): void {
    if (isDevelopment) {
      console.timeEnd(label);
    }
  },

  /**
   * Update logger configuration
   */
  setConfig(newConfig: Partial<LogConfig>): void {
    Object.assign(config, newConfig);
  },
};

/**
 * Context-aware logger factory
 * Creates a logger with a specific context prefix
 */
export function createLogger(context: string) {
  return {
    debug: (message: string, data?: unknown) => logger.debug(message, data, context),
    info: (message: string, data?: unknown) => logger.info(message, data, context),
    warn: (message: string, data?: unknown) => logger.warn(message, data, context),
    error: (message: string, error?: unknown) => logger.error(message, error, context),
  };
}

/**
 * Helper to sanitize error messages for user display
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Map technical errors to user-friendly messages
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return 'Unable to connect. Please check your internet connection.';
    }

    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'You do not have permission to perform this action.';
    }

    if (message.includes('not found')) {
      return 'The requested item was not found.';
    }

    if (message.includes('timeout')) {
      return 'The request timed out. Please try again.';
    }

    // Return original message if safe
    if (!message.includes('database') && !message.includes('query') && !message.includes('sql')) {
      return error.message;
    }
  }

  return 'An unexpected error occurred. Please try again.';
}

export default logger;
