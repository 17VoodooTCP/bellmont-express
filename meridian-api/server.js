require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const connectDB = require('./config/db');
const initializeSocket = require('./socket');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const { publicLimiter, authLimiter, trackingLimiter } = require('./middleware/rateLimiter');

// Route imports
const authRoutes = require('./routes/auth');
const shipmentRoutes = require('./routes/shipments');
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');
const reviewRoutes = require('./routes/reviews');

const app = express();
const server = http.createServer(app);

// ── Socket.io ──────────────────────────────────────────────────
const io = initializeSocket(server);
app.set('io', io);

// ── Security: CORS — restrict to known origins ─────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server (no origin) 
    if (!origin) return callback(null, true);
    
    // Allowed origins are driven entirely by CLIENT_URL (comma-separated) so a
    // new deployment needs no code change. localhost stays open for local dev.
    const allowed = (process.env.CLIENT_URL || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const isAllowed = origin.includes('localhost') || allowed.includes(origin);

    if (isAllowed) {
      callback(null, true);
    } else {
      console.error(`[CORS BLOCK] Origin rejected: ${origin}`);
      // Passing an error to callback returns a 500 status. We return 403 Forbidden instead by succeeding but returning false.
      callback(null, false); 
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body parsing ───────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Structured request logging ─────────────────────────────────
app.use(requestLogger);

// ── Global rate limit for all public API endpoints ─────────────
app.use('/api/', publicLimiter);

// ── Routes with targeted rate limits ──────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/shipments/track', trackingLimiter);    // tracking is public & high-traffic
app.use('/api/shipments', shipmentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);

// ── Health check (no rate limit, no logging) ───────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// ── 404 for unmatched routes ───────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

// ── Centralized error handler (must be last) ───────────────────
app.use(errorHandler);

// ── Start server ───────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`\nVelonex24 Server running on port ${PORT}`);
    console.log(`API: http://localhost:${PORT}/api`);
    console.log(`WebSocket: ws://localhost:${PORT}`);
    console.log(`Health: http://localhost:${PORT}/api/health\n`);
  });
};

startServer();
