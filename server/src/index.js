import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import passport from 'passport';
import postRoutes from './routes/post.routes.js';
import authRoutes from './routes/auth.routes.js';
import { testConnection, initializeDatabase } from './database/db.js';
import { configureSession } from './middleware/session.js';
import { configurePassport } from './services/auth.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

// Validate required environment variables
const requiredEnvVars = [
  'ANTHROPIC_API_KEY',
  'DATABASE_URL',
  'SESSION_SECRET',
  'LINKEDIN_CLIENT_ID',
  'LINKEDIN_CLIENT_SECRET',
  'LINKEDIN_CALLBACK_URL'
];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.warn('⚠️  Warning: Missing environment variables:', missingEnvVars.join(', '));
  console.warn('⚠️  Please create a .env file with the required variables.');
  console.warn('⚠️  See .env.example for reference.\n');
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['set-cookie']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session middleware (must be before passport)
app.use(configureSession());

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/api', postRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'LinkedIn Post Generator API',
    version: '2.0.0',
    endpoints: {
      auth: {
        login: 'GET /auth/linkedin',
        callback: 'GET /auth/linkedin/callback',
        status: 'GET /auth/status',
        logout: 'POST /auth/logout'
      },
      api: {
        health: 'GET /api/health',
        scrape: 'POST /api/scrape',
        generate: 'POST /api/generate',
        scrapeAndGenerate: 'POST /api/scrape-and-generate',
        refine: 'POST /api/refine',
        publishToLinkedIn: 'POST /api/publish-to-linkedin'
      }
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Initialize database and start server
async function startServer() {
  try {
    // Test database connection
    await testConnection();

    // Initialize database schema
    await initializeDatabase();

    // Configure Passport
    configurePassport();

    // Start server
    app.listen(PORT, () => {
      console.log('\n🚀 LinkedIn Post Generator API');
      console.log(`📡 Server running on http://localhost:${PORT}`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`\n📚 API Documentation: http://localhost:${PORT}/\n`);

      if (missingEnvVars.length === 0) {
        console.log('✅ All environment variables configured\n');
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
