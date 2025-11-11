import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { getPool } from '../database/db.js';

const PgSession = connectPgSimple(session);

/**
 * Configure express-session with PostgreSQL store
 */
export function configureSession() {
  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is not set in environment variables');
  }

  const pool = getPool();

  return session({
    store: new PgSession({
      pool,
      tableName: 'sessions',
      createTableIfMissing: false, // We create it in schema.sql
    }),
    name: 'linkedin_post_generator.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    }
  });
}

/**
 * Middleware to require authentication
 */
export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please connect your LinkedIn account.'
    });
  }
  next();
}

/**
 * Middleware to attach user to request if authenticated
 */
export function attachUser(req, res, next) {
  if (req.session && req.session.userId) {
    // User is in session, attach to request
    req.userId = req.session.userId;
  }
  next();
}
