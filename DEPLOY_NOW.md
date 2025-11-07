# Deploy to Production - Quick Start Guide

## ✅ Prerequisites Checklist

Before deploying, make sure you have:
- [ ] GitHub account (to connect Railway to your repo)
- [ ] LinkedIn Developer App credentials
- [ ] Anthropic API key
- [ ] This codebase pushed to GitHub

---

## 🚀 Deployment Steps

### 1. Push to GitHub (if not already done)

```bash
cd /Users/jaskaranbedi/linkedin-post-generator

# Initialize git (if needed)
git init
git add .
git commit -m "Prepare for production deployment"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/linkedin-post-generator.git
git push -u origin main
```

### 2. Sign Up for Railway

1. Go to https://railway.app/
2. Click "Start a New Project"
3. Sign in with GitHub
4. Grant Railway access to your repository

### 3. Deploy Your App

1. Click "Deploy from GitHub repo"
2. Select `linkedin-post-generator`
3. Railway will auto-detect it as a Node.js app

### 4. Add PostgreSQL Database

1. In your Railway project, click "New"
2. Select "Database" → "Add PostgreSQL"
3. Railway will automatically set the `DATABASE_URL` environment variable

### 5. Configure Environment Variables

In Railway, go to your service → "Variables" tab and add:

```bash
# Node Environment
NODE_ENV=production

# Session Secret (generate a new one!)
SESSION_SECRET=<run: openssl rand -hex 64>

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
LINKEDIN_CALLBACK_URL=https://your-app.railway.app/auth/linkedin/callback

# Anthropic API
ANTHROPIC_API_KEY=your_anthropic_api_key

# Client URL (same as your Railway domain)
CLIENT_URL=https://your-app.railway.app

# Port (Railway provides this automatically, but you can set it)
PORT=3002
```

**Note:** Railway will give you a domain like `your-app.railway.app`. Use that for both `CLIENT_URL` and `LINKEDIN_CALLBACK_URL`.

### 6. Generate Session Secret

Run this locally to generate a secure session secret:

```bash
openssl rand -hex 64
```

Copy the output and paste it as your `SESSION_SECRET` in Railway.

### 7. Update LinkedIn OAuth Settings

1. Go to https://www.linkedin.com/developers/
2. Open your LinkedIn app
3. Go to "Auth" tab
4. Add your Railway callback URL to "Authorized redirect URLs":
   ```
   https://your-app.railway.app/auth/linkedin/callback
   ```
5. Save changes

### 8. Deploy!

Railway will automatically:
- Build your frontend (`npm run build:client`)
- Install server dependencies
- Start your server
- Serve the built frontend

Watch the deployment logs in Railway dashboard.

### 9. Test Your Deployment

Once deployed:
1. Visit `https://your-app.railway.app`
2. Test the full flow:
   - ✅ Generate a post (logged out)
   - ✅ Click "Connect LinkedIn to Publish"
   - ✅ Complete LinkedIn OAuth
   - ✅ Verify post is preserved after auth
   - ✅ Publish to LinkedIn

---

## 🔧 Troubleshooting

### Build Fails

Check Railway logs. Common issues:
- Missing dependencies: Make sure `package.json` is correct
- Build command fails: Verify `railway.json` build command is correct

### LinkedIn OAuth Fails

- Verify callback URL matches exactly (https vs http)
- Check CLIENT_ID and CLIENT_SECRET are correct
- Ensure Railway domain is in LinkedIn's authorized redirect URLs

### Database Connection Fails

- Railway should auto-configure `DATABASE_URL`
- Check that PostgreSQL database is running in Railway
- Verify `DATABASE_URL` environment variable exists

### Posts Not Saving After Auth

- Check `SESSION_SECRET` is set
- Verify `CLIENT_URL` matches your Railway domain
- Check browser console for sessionStorage errors

---

## 💡 Alternative: Quick Manual Deploy

If Railway doesn't work, here's a quick Render.com option:

### Render.com (Alternative)

1. Go to https://render.com
2. Create new "Web Service"
3. Connect GitHub repo
4. Configure:
   - Build Command: `npm run build:all`
   - Start Command: `npm start`
   - Add PostgreSQL database (in Render dashboard)
   - Set all environment variables
5. Deploy

---

## 📋 Post-Deployment Checklist

After deployment:
- [ ] App loads at production URL
- [ ] Can generate posts without logging in
- [ ] LinkedIn OAuth works
- [ ] Posts persist after auth redirect
- [ ] Can publish to LinkedIn
- [ ] Check server logs for errors

---

## 🎉 You're Live!

Share your production URL with your beta tester:
```
https://your-app.railway.app
```

Monitor usage through:
- Railway dashboard (for server metrics)
- LinkedIn Developer Portal (for API usage)
- Anthropic Console (for Claude API usage)

---

## 🆘 Need Help?

Common commands:
```bash
# View Railway logs
railway logs

# Redeploy
railway up

# Check environment variables
railway variables
```

For issues, check:
1. Railway deployment logs
2. Browser console (F12)
3. Network tab for API errors
