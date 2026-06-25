/**
 * Express App Configuration
 * Set up and configure the Express application
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const config = require('./config/environment');
const logger = require('./utils/logger');
const { errorHandler } = require('./middlewares/errorHandler');

/**
 * Initialize Express app
 */
const app = express();

/**
 * Security Middleware
 */
// Helmet for security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration
const corsOptions = {
  origin: config.CORS_ORIGIN.split(','),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors({
  origin: true,
  credentials: true
}));

/**
 * Body Parsing Middleware
 */
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ limit: '50kb', extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/**
 * Compression Middleware
 */
app.use(compression());

/**
 * Request Logging Middleware
 */
app.use((req, res, next) => {
  const start = Date.now();

  // Log response time on finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.logHttpRequest(req, res, duration);
  });

  next();
});

/**
 * Health Check Endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * API Routes
 */
// Auth routes
app.use('/api/auth', require('./routes/auth'));

// User routes
app.use('/api/users', require('./routes/users'));

// Post routes
app.use('/api/posts', require('./routes/posts'));

// Comment routes
app.use('/api/comments', require('./routes/comments'));

// Feed routes
app.use('/api/feed', require('./routes/feed'));

// Notification routes
app.use('/api/notifications', require('./routes/notifications'));

// Moderation routes
app.use('/api/moderation', require('./routes/moderation'));

// Search routes
app.use('/api/search', require('./routes/search'));

// Trend routes
app.use('/api/trends', require('./routes/trends'));

// Serve frontend static assets in production
if (config.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(distPath));

  app.get('*', (req, res, next) => {
    // Let API routes and static upload routes fall through to their handlers / 404 handler
    if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

/**
 * 404 Handler
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    status: 404,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.originalUrl} not found`,
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * Error Handler Middleware (must be last)
 */
app.use(errorHandler);

module.exports = app;
