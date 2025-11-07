-- LinkedIn Post Generator Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  linkedin_id VARCHAR(255) UNIQUE NOT NULL,
  linkedin_access_token TEXT NOT NULL,
  linkedin_refresh_token TEXT,
  token_expires_at TIMESTAMP,
  name VARCHAR(255),
  email VARCHAR(255),
  profile_photo TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sessions table (for express-session)
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP NOT NULL
);

-- Create index on sessions expire for cleanup
CREATE INDEX IF NOT EXISTS sessions_expire_idx ON sessions (expire);

-- Create index on linkedin_id for faster lookups
CREATE INDEX IF NOT EXISTS users_linkedin_id_idx ON users (linkedin_id);
