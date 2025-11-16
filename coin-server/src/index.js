const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { db, admin } = require('./utils/db');

// Import routes
const walletRoutes = require('./routes/wallet');
const giftsRoutes = require('./routes/gifts');
const shopRoutes = require('./routes/shop');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/wallet', walletRoutes);
app.use('/api/gifts', giftsRoutes);
app.use('/api/shop', shopRoutes);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`\n📨 ${req.method} ${req.path}`);
  console.log('⏰ Time:', new Date().toISOString());
  console.log('🌐 Origin:', req.headers.origin || 'No origin');
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('\n❌ ========== ERROR HANDLER ==========');
  console.error('Path:', req.path);
  console.error('Method:', req.method);
  console.error('Error:', {
    message: err.message,
    code: err.code,
    status: err.status,
    stack: err.stack?.split('\n').slice(0, 3),
  });
  console.error('========================================\n');
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR'
  });
});

// 404 handler
app.use((req, res) => {
  console.log('❌ 404 Not Found:', req.method, req.path);
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log(`🚀 Coin Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API Base: http://localhost:${PORT}/api`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  console.log('='.repeat(50) + '\n');
});

// Export for testing
module.exports = { app, db, admin };
