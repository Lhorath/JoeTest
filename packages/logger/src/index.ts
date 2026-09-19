import pino, { LoggerOptions } from "pino";

export interface LogContext {
  requestId?: string;
  userId?: string;
  appName?: string;
  env?: string;
  [key: string]: unknown;
}

const isProduction = process.env.NODE_ENV === "production";

const defaultOptions: LoggerOptions = {
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "password",
      "passwordHash",
      "token",
      "secret",
      "cookie",
      "authorization",
      "creditCard",
    ],
    censor: "[REDACTED]",
  },
};

// Use pino-pretty in non-production environments if available
if (!isProduction) {
  defaultOptions.transport = {
    target: "pino-pretty",
    options: {
      colorize: true,
      ignore: "pid,hostname",
    },
  };
}

export const rootLogger = pino(defaultOptions);

export class AppLogger {
  private logger: pino.Logger;
  private context: LogContext;

  constructor(appName: string, initialContext: LogContext = {}) {
    this.context = {
      appName,
      env: process.env.NODE_ENV || "development",
      ...initialContext,
    };
    this.logger = rootLogger.child(this.context);
  }

  public child(context: LogContext): AppLogger {
    return new AppLogger(this.context.appName || "app", {
      ...this.context,
      ...context,
    });
  }

  public info(message: string, context?: Record<string, unknown>): void {
    if (context) {
      this.logger.info(context, message);
    } else {
      this.logger.info(message);
    }
  }

  public error(
    message: string,
    error?: unknown,
    context?: Record<string, unknown>,
  ): void {
    const errorDetails =
      error instanceof Error
        ? {
            err: {
              message: error.message,
              stack: error.stack,
              name: error.name,
              ...((error as any).details || {}),
            },
          }
        : { err: error };

    this.logger.error({ ...errorDetails, ...context }, message);
  }

  public warn(message: string, context?: Record<string, unknown>): void {
    if (context) {
      this.logger.warn(context, message);
    } else {
      this.logger.warn(message);
    }
  }

  public debug(message: string, context?: Record<string, unknown>): void {
    if (context) {
      this.logger.debug(context, message);
    } else {
      this.logger.debug(message);
    }
  }

  public trace(message: string, context?: Record<string, unknown>): void {
    if (context) {
      this.logger.trace(context, message);
    } else {
      this.logger.trace(message);
    }
  }
}

export const createLogger = (
  appName: string,
  context?: LogContext,
): AppLogger => {
  return new AppLogger(appName, context);
};
