const fs = require('fs');
const path = require('path');

const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const formatLog = (level, data) => {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    ...data,
  });
};

const logger = {
  info: (data) => {
    console.log(formatLog('INFO', data));
  },

  warn: (data) => {
    console.warn(formatLog('WARN', data));
  },

  error: (data) => {
    console.error(formatLog('ERROR', data));
  },

  debug: (data) => {
    if (process.env.DEBUG) {
      console.log(formatLog('DEBUG', data));
    }
  },
};

module.exports = logger;
