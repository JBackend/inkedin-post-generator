# LinkedIn Post Generator

Convert web articles into LinkedIn posts in your authentic voice using AI.

## Features

- 🔗 **URL Input**: Paste any article URL to get started
- 🤖 **AI-Powered**: Uses Claude to generate posts matching your voice
- 📝 **Multiple Angles**: Get 3-5 different post variations per article
- ✏️ **Edit & Review**: Review and customize posts before saving
- 💾 **Linkedin Publish Automation**: Publish Directly into Linkedin

## Tech Stack

### Frontend
- React + TypeScript
- Vite
- TailwindCSS (optional)

### Backend
- Node.js + Express
- Anthropic Claude API
- Notion API
- Cheerio/Puppeteer for web scraping

## Setup

1. **Clone and Install**
   ```bash
   npm run install-all
   ```

2. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   ```

   Add your API keys:
   - `ANTHROPIC_API_KEY`: Get from https://console.anthropic.com/
   - `NOTION_API_KEY`: Create integration at https://www.notion.so/my-integrations
   - `NOTION_DATABASE_ID`: Your Notion database ID

3. **Add your system_prompt.md**
   - Place your voice analysis and generation instructions in `server/src/system_prompt.md`

4. **Run Development Server**
   ```bash
   npm run dev
   ```

   - Frontend: http://localhost:5173
   - Backend: http://localhost:3002

## Usage

1. Paste an article URL
2. Click "Generate Posts"
3. Review the generated variations
4. Edit if needed
5. Save to Notion

## Project Structure

```
linkedin-post-generator/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   └── App.tsx
│   └── package.json
├── server/                 # Express backend
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── controllers/   # Request handlers
│   │   ├── utils/         # Helper functions
│   │   ├── system_prompt.md
│   │   └── index.js
│   └── package.json
├── .env.example
└── package.json
```

## License

ISC
