const morgan = require('morgan');

/* ─── Structured request logger ───────────────────────────────── */
// Format: [TIMESTAMP] METHOD /path STATUS - Xms
morgan.token('body-size', (req) => {
  const len = req.headers['content-length'];
  return len ? `${len}b` : '-';
});

const requestLogger = morgan(
  ':date[iso] :method :url :status :res[content-length] - :response-time ms [:body-size in]',
  {
    skip: (req) => req.url === '/api/health', // skip noisy health pings
    stream: {
      write: (message) => {
        const trimmed = message.trim();
        const status = parseInt(trimmed.split(' ')[4], 10);
        if (status >= 500) {
          console.error('', trimmed);
        } else if (status >= 400) {
          console.warn('', trimmed);
        } else {
          console.log('', trimmed);
        }
      }
    }
  }
);

module.exports = requestLogger;
