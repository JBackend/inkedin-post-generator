# Production Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Variables

Create a production `.env` file with the following variables:

```bash
# Server Configuration
PORT=3002
NODE_ENV=production

# Session Secret (IMPORTANT: Generate a new secure random string)
SESSION_SECRET=<generate_secure_random_string>

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/database

# LinkedIn OAuth (update callback URL to production domain)
LINKEDIN_CLIENT_ID=<your_client_id>
LINKEDIN_CLIENT_SECRET=<your_client_secret>
LINKEDIN_CALLBACK_URL=https://yourdomain.com/auth/linkedin/callback

# Anthropic Claude API
ANTHROPIC_API_KEY=<your_api_key>

# Client URL (update to production frontend URL)
CLIENT_URL=https://yourdomain.com
```

### 2. LinkedIn OAuth Configuration

Update your LinkedIn OAuth app settings at https://www.linkedin.com/developers/:
- Add production callback URL: `https://yourdomain.com/auth/linkedin/callback`
- Add production domain to authorized redirect URLs

### 3. Database Setup

Ensure PostgreSQL database is accessible:
```bash
# Test connection
psql $DATABASE_URL

# Database will auto-initialize on first server start
```

## Deployment Options

### Option A: Single Server Deployment (Recommended for Beta)

Deploy both frontend and backend on the same server.

#### Using Railway.app

1. **Install Railway CLI**
   ```bash
   npm i -g @railway/cli
   railway login
   ```

2. **Create New Project**
   ```bash
   railway init
   ```

3. **Add PostgreSQL Database**
   ```bash
   railway add
   # Select PostgreSQL
   ```

4. **Configure Environment Variables**
   ```bash
   railway variables set SESSION_SECRET=<your_secret>
   railway variables set LINKEDIN_CLIENT_ID=<your_id>
   railway variables set LINKEDIN_CLIENT_SECRET=<your_secret>
   railway variables set ANTHROPIC_API_KEY=<your_key>
   railway variables set NODE_ENV=production
   railway variables set CLIENT_URL=https://your-app.railway.app
   railway variables set LINKEDIN_CALLBACK_URL=https://your-app.railway.app/auth/linkedin/callback
   ```

5. **Add Build Configuration**
   Create `railway.json`:
   ```json
   {
     "build": {
       "builder": "NIXPACKS",
       "buildCommand": "npm install && npm run build:all"
     },
     "deploy": {
       "startCommand": "npm start",
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10
     }
   }
   ```

6. **Deploy**
   ```bash
   railway up
   ```

#### Using Render.com

1. **Create Web Service**
   - Connect your GitHub repository
   - Select branch to deploy
   - Build Command: `npm install && npm run build:all`
   - Start Command: `npm start`

2. **Add PostgreSQL Database**
   - Create new PostgreSQL database
   - Copy internal connection string

3. **Set Environment Variables**
   - Add all required variables from the checklist above

4. **Deploy**
   - Click "Manual Deploy" or push to connected branch

### Option B: Separate Frontend/Backend Deployment

#### Frontend (Vercel/Netlify)

1. **Build Frontend**
   ```bash
   cd client
   npm run build
   ```

2. **Deploy to Vercel**
   ```bash
   npm i -g vercel
   vercel
   ```

3. **Update API URL**
   Set `VITE_API_URL` to backend production URL

#### Backend (Heroku/Railway)

1. **Prepare Backend**
   ```bash
   cd server
   npm install
   ```

2. **Deploy**
   ```bash
   git push heroku main
   ```

## Production Build Scripts

Add to root `package.json`:

```json
{
  "scripts": {
    "build:client": "cd client && npm run build",
    "build:server": "cd server && npm install --production",
    "build:all": "npm run build:client && npm run build:server",
    "start": "node server/src/index.js"
  }
}
```

## Post-Deployment

### 1. Verify Deployment

- [ ] Frontend loads at production URL
- [ ] Backend API responds at /api/health
- [ ] Database connection successful
- [ ] LinkedIn OAuth flow works end-to-end
- [ ] Post generation works
- [ ] Post publishing to LinkedIn works

### 2. Monitoring

Check server logs for:
- Database connection errors
- LinkedIn API errors
- Claude API rate limits
- Session/authentication issues

### 3. Security

- [ ] HTTPS enabled
- [ ] Secure session secret configured
- [ ] Database credentials secured
- [ ] API keys not exposed in frontend
- [ ] CORS configured correctly
- [ ] Rate limiting implemented (optional)

## Closed Beta Testing

For testing with 1 person:

1. **Share Production URL** with beta tester
2. **Guide them through**:
   - Paste article URL
   - Generate post
   - Review and edit
   - Connect LinkedIn (first time)
   - Publish to LinkedIn

3. **Monitor for**:
   - Any errors in logs
   - Performance issues
   - UX confusion points
   - LinkedIn API issues

4. **Collect Feedback**:
   - What worked well?
   - What was confusing?
   - Any bugs or errors?
   - Feature requests?

## Troubleshooting

### Database Connection Issues
```bash
# Check DATABASE_URL format
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL
```

### LinkedIn OAuth Issues
- Verify callback URL matches exactly (including https/http)
- Check CLIENT_ID and CLIENT_SECRET
- Ensure scopes are correct: openid, profile, email, w_member_social

### Build Failures
```bash
# Clean install
rm -rf node_modules client/node_modules server/node_modules
npm run install-all
```

## Rollback Plan

If deployment fails:
1. Revert to previous git commit
2. Redeploy previous version
3. Check logs for specific errors
4. Fix locally and test before redeploying

## Support

For issues:
1. Check server logs
2. Check browser console
3. Review environment variables
4. Test locally with production env vars
