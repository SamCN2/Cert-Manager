const winston = require('winston');

// Helper function to safely stringify objects with circular references
function safeStringify(obj) {
  const cache = new Set();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        // Remove circular reference
        return '[Circular]';
      }
      cache.add(value);
    }
    return value;
  }, 2);
}

// Filter to reduce verbose error logging
const errorFilter = winston.format((info) => {
  if (info.level === 'error') {
    // Only include essential error information
    const { message, stack, name, ...rest } = info;
    return {
      level: 'error',
      message,
      stack: stack ? stack.split('\n')[0] : undefined, // Only first line of stack trace
      name,
      ...rest
    };
  }
  return info;
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    errorFilter(),
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp, ...rest }) => {
      let details = '';
      try {
        details = Object.keys(rest).length ? safeStringify(rest) : '';
      } catch (error) {
        details = '[Error: Could not stringify log details]';
      }
      return `${timestamp} ${level}: ${message} ${details}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...rest }) => {
          let details = '';
          try {
            details = Object.keys(rest).length ? safeStringify(rest) : '';
          } catch (error) {
            details = '[Error: Could not stringify log details]';
          }
          return `${timestamp} ${level}: ${message} ${details}`;
        })
      )
    })
  ]
});

// Add unhandled error logging
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Promise Rejection:', {
    message: error.message,
    stack: error.stack?.split('\n')[0],
    name: error.name
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    message: error.message,
    stack: error.stack?.split('\n')[0],
    name: error.name
  });
});

module.exports = logger; 