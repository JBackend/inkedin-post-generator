-- Migration: Add rate limiting fields to users table
-- Date: 2025-12-19

-- Add post_count column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'post_count'
  ) THEN
    ALTER TABLE users ADD COLUMN post_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add week_start column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'week_start'
  ) THEN
    ALTER TABLE users ADD COLUMN week_start TIMESTAMP DEFAULT NOW();
  END IF;
END $$;

-- Add subscription_tier column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE users ADD COLUMN subscription_tier VARCHAR(50) DEFAULT 'free';
  END IF;
END $$;

-- Update existing users to have week_start set to now if null
UPDATE users SET week_start = NOW() WHERE week_start IS NULL;
