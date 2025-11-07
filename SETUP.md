# LinkedIn Post Generator - Setup Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database
- LinkedIn Developer Account
- Anthropic API Key

## 1. Database Setup

### Install PostgreSQL

**macOS (using Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

### Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database and user
CREATE DATABASE linkedin_post_generator;
CREATE USER your_username WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE linkedin_post_generator TO your_username;

# Exit psql
\q
```

## 2. LinkedIn OAuth Setup

### Create LinkedIn App

1. Go to https://www.linkedin.com/developers/apps
2. Click "Create app"
3. Fill in app information and create
4. Go to **Products** tab → Request "Sign In with LinkedIn using OpenID Connect"
5. Go to **Auth** tab → Add redirect URL: `http://localhost:3002/auth/linkedin/callback`
6. Copy **Client ID** and **Client Secret**
7. Request "Share on LinkedIn" product for publishing permissions

## 3. Environment Variables

Create `/server/.env`:

```bash
# Anthropic Claude API
ANTHROPIC_API_KEY=your_key_here

# PostgreSQL Database
DATABASE_URL=postgresql://username:password@localhost:5432/linkedin_post_generator

# Session Secret (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
SESSION_SECRET=your_random_secret_here

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_CALLBACK_URL=http://localhost:3002/auth/linkedin/callback

# Server
PORT=3002
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

## 4. Installation & Running

```bash
# Install dependencies
npm install

# Start development server (runs both frontend and backend)
npm run dev
```

The app will be available at http://localhost:5173

## 5. Usage

1. Click "Connect LinkedIn" to authenticate
2. Enter an article URL
3. Select voice profile
4. Generate and edit post
5. Publish to LinkedIn

## Troubleshooting

- **Auth not working**: Verify LinkedIn app redirect URL matches exactly
- **Publishing fails**: Ensure "Share on LinkedIn" product is approved
- **Database errors**: Check DATABASE_URL and PostgreSQL is running
