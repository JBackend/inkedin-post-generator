# Notion Database Setup Guide

This guide will help you create and configure your Notion database for the LinkedIn Post Generator.

## Step 1: Create a New Database

1. Open Notion and navigate to the workspace where you want to create the database
2. Click "+ New page" or use `/database` command
3. Select "Table - Inline" or "Table - Full page"
4. Name it: **"LinkedIn Post Generator"**

## Step 2: Configure Database Properties

Delete the default properties and add these properties in order:

### 1. Title (Title property)
- **Name**: `Title`
- **Type**: Title
- **Description**: Article headline
- *Note: Every Notion database has one Title property by default*

### 2. Source URL
- **Name**: `Source URL`
- **Type**: URL
- **Description**: Original article link

### 3. Author
- **Name**: `Author`
- **Type**: Text
- **Description**: Article author name

### 4. Date Added
- **Name**: `Date Added`
- **Type**: Created time
- **Description**: Auto-populated when post is created

### 5. Status
- **Name**: `Status`
- **Type**: Select
- **Options**:
  - Draft (Gray)
  - In Review (Yellow)
  - Approved (Green)
  - Published (Blue)
  - Archived (Red)

### 6. Article Summary
- **Name**: `Article Summary`
- **Type**: Text
- **Description**: 2-3 sentence summary of the article

### 7. Key Points
- **Name**: `Key Points`
- **Type**: Text
- **Description**: Bullet list of main arguments from article

### 8. Generated Angles
- **Name**: `Generated Angles`
- **Type**: Text
- **Description**: All angle options with drafts (JSON format)

### 9. Selected Angle
- **Name**: `Selected Angle`
- **Type**: Select
- **Options** (add these as you use different angles):
  - Contrarian Take
  - First Principles
  - Pattern Recognition
  - Human Impact
  - Implementation Reality
  - Observation to Pattern
  - Industry Challenge
  - Selected (default)

### 10. Final Post
- **Name**: `Final Post`
- **Type**: Text
- **Description**: The approved LinkedIn post content

### 11. Word Count
- **Name**: `Word Count`
- **Type**: Number
- **Description**: Character count of final post

### 12. Tags
- **Name**: `Tags`
- **Type**: Multi-select
- **Options**:
  - AI/ML (Blue)
  - Product Management (Purple)
  - Industry Trends (Orange)
  - Contrarian Take (Red)
  - First Principles (Green)
  - Tech Industry (Yellow)
  - Innovation (Pink)
  - Startups (Teal)
  - Leadership (Gray)
  - Career (Brown)

### 13. Feedback Notes
- **Name**: `Feedback Notes`
- **Type**: Text
- **Description**: User's editing notes and preferences

### 14. Published Date
- **Name**: `Published Date`
- **Type**: Date
- **Description**: When the post was published to LinkedIn

### 15. Engagement
- **Name**: `Engagement`
- **Type**: Number
- **Description**: Total likes/comments (manual entry)

### 16. Related Posts (Optional)
- **Name**: `Related Posts`
- **Type**: Relation
- **Description**: Link to similar posts in this database

---

## Step 3: Create Database Views

### View 1: All Posts (Default)
- **Type**: Table
- **Filter**: None
- **Sort**: Date Added (Descending)

### View 2: Drafts
- **Type**: Table
- **Filter**: Status = Draft
- **Sort**: Date Added (Descending)

### View 3: Ready to Publish
- **Type**: Table
- **Filter**: Status = Approved
- **Sort**: Date Added (Descending)

### View 4: Published
- **Type**: Table
- **Filter**: Status = Published
- **Sort**: Published Date (Descending)
- **Group by**: Tags

### View 5: By Topic
- **Type**: Board or Gallery
- **Group by**: Tags
- **Sort**: Date Added (Descending)

### View 6: Performance
- **Type**: Table
- **Filter**: Engagement > 0
- **Sort**: Engagement (Descending)

---

## Step 4: Connect Integration to Database

1. Click the "..." menu in the top right of your database
2. Go to "Connections" → "Connect to"
3. Search for your integration (e.g., "LinkedIn Post Generator")
4. Click to connect

If you don't see your integration:
1. Go to https://www.notion.so/my-integrations
2. Create a new integration (or find your existing one)
3. Copy the "Internal Integration Token" (this is your `NOTION_API_KEY`)
4. Return to your database and connect it

---

## Step 5: Get Your Database ID

1. Open your database in Notion
2. Click "Share" in the top right
3. Click "Copy link"
4. The link looks like: `https://www.notion.so/workspace/[DATABASE_ID]?v=...`
5. Extract the **DATABASE_ID** (32-character string between the last `/` and `?`)
6. Example:
   ```
   URL: https://notion.so/myworkspace/a1b2c3d4e5f6789012345678?v=123...
   DATABASE_ID: a1b2c3d4e5f6789012345678
   ```

**Note**: Remove any dashes if present. It should be exactly 32 characters, no dashes.

---

## Step 6: Update Your .env File

Open `/server/.env` and add your credentials:

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
NOTION_API_KEY=secret_your-notion-integration-token-here
NOTION_DATABASE_ID=your32characterdatabaseid
PORT=3002
```

---

## Step 7: Test the Connection

Run this command to verify your Notion setup:

```bash
cd /Users/jaskaranbedi/linkedin-post-generator
npm run dev
```

Then in a browser, visit:
```
http://localhost:3002/api/notion-schema
```

You should see a JSON response with your database properties.

---

## Quick Setup Checklist

- [ ] Created Notion database named "LinkedIn Post Generator"
- [ ] Added all 16 properties with correct types
- [ ] Configured Select and Multi-select options
- [ ] Created integration at notion.so/my-integrations
- [ ] Copied Integration Token (NOTION_API_KEY)
- [ ] Connected integration to database
- [ ] Copied Database ID (32 characters)
- [ ] Updated server/.env file with both keys
- [ ] Tested connection via /api/notion-schema endpoint

---

## Troubleshooting

### "Database not found" error
- Verify DATABASE_ID is exactly 32 characters, no dashes
- Ensure you've connected the integration to the database
- Check that the database is in the same workspace as your integration

### "Validation error" when saving
- One or more property names don't match exactly
- Check spelling and capitalization (e.g., "Status" not "status")
- Ensure Select options exist before using them

### "Unauthorized" error
- Verify NOTION_API_KEY starts with `secret_`
- Make sure integration has access to the workspace
- Reconnect integration to database

### Properties not saving
- Some properties are optional - they won't cause errors if missing
- The system will gracefully skip properties that don't exist
- Start with minimum required properties: Title, Source URL, Status, Final Post

---

## Minimum Required Properties

If you want a simpler setup, these are the **minimum** required properties:

1. **Title** (Title) - Required by Notion
2. **Source URL** (URL)
3. **Status** (Select) - Options: Draft, Published
4. **Final Post** (Text)

The system will work with just these four. Add others as needed!

---

## Advanced: Custom Properties

You can customize property names in the Notion service code:

File: `server/src/services/notion.service.js`

Look for the `properties` object and change the property names to match your database.

---

## Example Database Structure

Here's what a populated entry looks like:

| Title | Author | Status | Selected Angle | Word Count | Tags |
|-------|--------|--------|----------------|------------|------|
| The Future of AI PMs | Jane Doe | Published | Contrarian Take | 247 | AI/ML, Product Management |
| Why Startups Fail | John Smith | Draft | First Principles | 198 | Startups, Industry Trends |

---

## Need Help?

If you encounter issues:
1. Check the server logs for detailed error messages
2. Verify all property names match exactly (case-sensitive)
3. Ensure your integration has proper permissions
4. Test with the minimum required properties first

Happy posting! 🚀
