# LinkedIn Post Generator

Convert web articles into LinkedIn posts in your authentic voice using AI.

## Features

- 🔗 **URL Input**: Paste any article URL to get started
- 🤖 **AI-Powered**: Uses Claude Sonnet 4 to generate posts matching your voice
- 🎭 **Voice Profiles**: Choose from multiple writing styles (Critical Observer, Personal Stories, Analytical)
- ✏️ **Edit & Refine**: Review and customize posts with AI-powered refinement
- 🔐 **LinkedIn OAuth**: Secure authentication with LinkedIn
- 📤 **Direct Publishing**: Publish directly to LinkedIn with one click
- 💾 **Session Persistence**: Never lose your work during authentication

## Tech Stack

### Frontend
- React + TypeScript
- Vite
- Custom CSS with modern design

### Backend
- Node.js + Express (ES6 modules)
- PostgreSQL database
- LinkedIn OAuth 2.0 (OpenID Connect)
- Passport.js authentication
- Anthropic Claude Sonnet 4 API
- Cheerio/Puppeteer for web scraping

## Setup

1. **Clone and Install**
   ```bash
   npm run install-all
   ```

2. **Setup PostgreSQL Database**
   ```bash
   # Install PostgreSQL if not already installed
   # macOS: brew install postgresql
   # Ubuntu: sudo apt-get install postgresql

   # Create database
   createdb linkedin_post_generator
   ```

3. **Configure Environment Variables**
   ```bash
   cp .env.example server/.env
   ```

   Update `server/.env` with your credentials:
   - `DATABASE_URL`: PostgreSQL connection string
   - `ANTHROPIC_API_KEY`: Get from https://console.anthropic.com/
   - `LINKEDIN_CLIENT_ID`: Create app at https://www.linkedin.com/developers/
   - `LINKEDIN_CLIENT_SECRET`: From LinkedIn developer portal
   - `LINKEDIN_CALLBACK_URL`: `http://localhost:3002/auth/linkedin/callback`
   - `SESSION_SECRET`: Generate a random secure string
   - `CLIENT_URL`: `http://localhost:5173`

4. **LinkedIn OAuth Setup**
   - Create a LinkedIn app at https://www.linkedin.com/developers/
   - Add redirect URL: `http://localhost:3002/auth/linkedin/callback`
   - Request scopes: `openid`, `profile`, `email`, `w_member_social`

5. **Run Development Server**
   ```bash
   npm run dev
   ```

   - Frontend: http://localhost:5173
   - Backend: http://localhost:3002

## Usage

1. Open http://localhost:5173
2. Paste an article URL
3. Select your preferred voice profile
4. Click "Generate Post"
5. Review and edit the generated post
6. Click "Connect LinkedIn to Publish" (first time only)
7. Publish directly to LinkedIn

## Project Structure

```
linkedin-post-generator/
├── client/                 # React frontend
│   ├── src/
│   │   ├── App.tsx        # Main application
│   │   ├── App.css        # Styles
│   │   └── main.tsx       # Entry point
│   └── package.json
├── server/                 # Express backend
│   ├── src/
│   │   ├── routes/        # API routes
│   │   │   ├── auth.routes.js
│   │   │   └── post.routes.js
│   │   ├── services/      # Business logic
│   │   │   ├── auth.service.js
│   │   │   ├── claude.service.js
│   │   │   ├── linkedin.service.js
│   │   │   └── scraper.service.js
│   │   ├── controllers/   # Request handlers
│   │   ├── middleware/    # Express middleware
│   │   │   └── session.js
│   │   ├── database/      # Database config
│   │   │   ├── db.js
│   │   │   └── schema.sql
│   │   └── index.js       # Server entry point
│   ├── .env               # Environment variables
│   └── package.json
├── .env.example           # Example environment file
├── DEPLOYMENT.md          # Production deployment guide
└── package.json           # Root package file
```

## License

ISC
