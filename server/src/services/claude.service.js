import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy-load Anthropic client to ensure env vars are loaded
let anthropic = null;
function getAnthropicClient() {
  if (!anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
    }
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }
  return anthropic;
}

/**
 * Loads the system prompt for a specific voice profile
 * @param {string} voiceProfile - The voice profile to use (critical-observer, thought-leader, storyteller)
 * @returns {Promise<string>} - The system prompt content
 */
async function loadSystemPrompt(voiceProfile = 'critical-observer') {
  try {
    // Validate voice profile
    const validProfiles = ['critical-observer', 'thought-leader', 'storyteller'];
    if (!validProfiles.includes(voiceProfile)) {
      console.warn(`Invalid voice profile "${voiceProfile}", defaulting to critical-observer`);
      voiceProfile = 'critical-observer';
    }

    const promptPath = path.join(__dirname, '..', 'voice-profiles', `${voiceProfile}.md`);
    const systemPrompt = await fs.readFile(promptPath, 'utf-8');
    return systemPrompt;
  } catch (error) {
    console.error('Error loading voice profile:', error.message);
    throw new Error(`Voice profile file not found: ${voiceProfile}.md`);
  }
}

/**
 * Analyzes article and extracts key information for Notion
 * @param {Object} article - The scraped article data
 * @param {string} voiceProfile - The voice profile to use
 * @returns {Promise<Object>} - Analysis including summary, key points, etc.
 */
export async function analyzeArticle(article, voiceProfile = 'critical-observer') {
  try {
    const systemPrompt = await loadSystemPrompt(voiceProfile);

    const userPrompt = `
Analyze this article and provide:

Article Title: ${article.title}
Article URL: ${article.url}
Author: ${article.author}
Word Count: ${article.wordCount}

Article Content:
${article.content}

---

Please provide:
1. A 2-3 sentence summary of the article
2. 3-5 key points/arguments as bullet points
3. Suggested tags from these options: AI/ML, Product Management, Industry Trends, Contrarian Take, First Principles, Tech Industry, Innovation, Startups

Return as JSON:
{
  "summary": "2-3 sentence summary",
  "keyPoints": "→ Point 1\\n→ Point 2\\n→ Point 3",
  "tags": ["tag1", "tag2", "tag3"]
}
`;

    const message = await getAnthropicClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      temperature: 0.5,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    });

    const responseText = message.content[0].text;

    // Try to parse JSON
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(responseText);
    } catch (parseError) {
      // Fallback
      return {
        summary: article.description || 'Analysis pending',
        keyPoints: '',
        tags: []
      };
    }

  } catch (error) {
    console.error('Article analysis error:', error.message);
    return {
      summary: article.description || '',
      keyPoints: '',
      tags: []
    };
  }
}

/**
 * Generates LinkedIn post variations from article content
 * Following the comprehensive workflow in voice profile
 * @param {Object} article - The scraped article data
 * @param {number} variations - Number of post variations to generate (default: 5)
 * @param {string} voiceProfile - The voice profile to use
 * @returns {Promise<Array>} - Array of generated post variations
 */
export async function generateLinkedInPosts(article, variations = 5, voiceProfile = 'critical-observer') {
  try {
    const systemPrompt = await loadSystemPrompt(voiceProfile);

    const userPrompt = `
ARTICLE INFORMATION:
Title: ${article.title}
URL: ${article.url}
Author: ${article.author}
Word Count: ${article.wordCount}

ARTICLE CONTENT:
${article.content}

---

TASK: Generate ${variations} distinct LinkedIn post variations following Jaskaran Bedi's voice profile.

REQUIREMENTS:
1. Each post must take a DIFFERENT angle (contrarian, first-principles, pattern recognition, human impact, etc.)
2. Use → arrows for bullet points (NEVER use • or -)
3. NO emojis (absolutely zero)
4. NO hashtags (unless organically embedded in narrative)
5. NO em dashes (—)
6. Length: 150-250 words per post
7. Include specific examples, names, or numbers from the article
8. End with a thought-provoking question or reflection

FORMAT:
Return ONLY a valid JSON array with this exact structure:
[
  {
    "angle": "One-line description of this perspective",
    "whyThisWorks": "Brief rationale for why this angle is interesting",
    "post": "The complete post content with proper formatting"
  }
]

CRITICAL:
- Each post must sound authentically like Jaskaran (curious technologist who questions everything)
- Use → arrows consistently
- No generic corporate speak
- Challenge conventional wisdom
- Be specific, not abstract

Generate ${variations} unique variations now:
`;

    const message = await getAnthropicClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      temperature: 0.8, // Higher temperature for more creative variations
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    });

    // Parse the response
    const responseText = message.content[0].text;

    // Try to extract JSON from the response
    let posts;
    try {
      // Look for JSON array in the response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        posts = JSON.parse(jsonMatch[0]);
      } else {
        posts = JSON.parse(responseText);
      }

      // Validate and clean posts
      posts = posts.map(post => ({
        angle: post.angle || 'General perspective',
        whyThisWorks: post.whyThisWorks || post.why_this_works || '',
        hook: post.hook || post.post.split('\n')[0] || '',
        post: post.post || '',
        hashtags: [] // Per system prompt, no hashtags unless organic
      }));

    } catch (parseError) {
      console.error('Failed to parse Claude response as JSON:', parseError);
      console.error('Response text:', responseText);

      // Fallback: return response as single post
      posts = [{
        angle: 'Analysis of article',
        whyThisWorks: 'Provides perspective on the topic',
        hook: article.title,
        post: responseText,
        hashtags: []
      }];
    }

    return posts;

  } catch (error) {
    console.error('Claude API error:', error.message);
    throw new Error(`Failed to generate posts: ${error.message}`);
  }
}

/**
 * Refines a specific post based on user feedback
 * @param {string} originalPost - The original post content
 * @param {string} feedback - User's feedback for refinement
 * @param {string} voiceProfile - The voice profile to use
 * @returns {Promise<string>} - The refined post
 */
export async function refinePost(originalPost, feedback, voiceProfile = 'critical-observer') {
  try {
    const systemPrompt = await loadSystemPrompt(voiceProfile);

    const message = await getAnthropicClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Refine this LinkedIn post based on user feedback.

ORIGINAL POST:
${originalPost}

USER FEEDBACK:
${feedback}

REQUIREMENTS:
- Maintain Jaskaran's voice and style
- Use → arrows for bullet points
- NO emojis
- NO hashtags (unless organically embedded)
- Keep 150-250 words
- Address the feedback while staying authentic

Return ONLY the refined post content (no explanations):
`
        }
      ]
    });

    return message.content[0].text.trim();

  } catch (error) {
    console.error('Claude API error:', error.message);
    throw new Error(`Failed to refine post: ${error.message}`);
  }
}
