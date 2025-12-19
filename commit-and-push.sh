#!/bin/bash

# Navigate to repo directory
cd /Users/jaskaranbedi/Desktop/inkedin-post-generator-clean

# Add all changes
git add .

# Commit with message
git commit -m "$(cat <<'EOF'
Implement rate limiting system with anonymous and authenticated tiers

**Backend:**
- Add post_count, week_start, subscription_tier fields to users table
- Create rate limit middleware with weekly reset logic
- Add /api/usage endpoint for fetching usage stats
- Integrate rate limiting into post generation routes
- Fix CORS to allow x-anonymous-count header

**Frontend:**
- Add anonymous user counter in localStorage (0-3 limit)
- Display usage stats indicators for both user types
- Build rate limit modal dialog with upgrade prompts
- Track and increment usage on each generation
- Handle rate limit errors gracefully

**Rate Limits:**
- Anonymous: 3 total generations
- Authenticated: 3 articles/week (resets Monday)
- Voice switching within session = FREE (cached)

**Cost Analysis:**
- ~$0.016 per generation (3.5K input, 400 output tokens)
- 50 active users = $19-48/month depending on usage

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

# Push to GitHub
git push origin main

echo "✅ Committed and pushed to GitHub"
