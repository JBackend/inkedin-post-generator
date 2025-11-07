import { scrapeArticle, validateUrl } from '../services/scraper.service.js';
import { generateLinkedInPosts, refinePost, analyzeArticle } from '../services/claude.service.js';

/**
 * Validates and scrapes an article from URL
 */
export async function scrapeArticleController(req, res) {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    // Validate URL
    const isValid = await validateUrl(url);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or inaccessible URL'
      });
    }

    // Scrape article
    const article = await scrapeArticle(url);

    res.json({
      success: true,
      article
    });

  } catch (error) {
    console.error('Scrape controller error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Generates LinkedIn post from article
 */
export async function generatePostsController(req, res) {
  try {
    const { article, variations = 1, voiceProfile = 'critical-observer' } = req.body;

    if (!article || !article.content) {
      return res.status(400).json({
        success: false,
        error: 'Article content is required'
      });
    }

    // Generate posts
    const posts = await generateLinkedInPosts(article, variations, voiceProfile);

    res.json({
      success: true,
      posts
    });

  } catch (error) {
    console.error('Generate posts controller error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Combined endpoint: scrape and generate in one call
 */
export async function scrapeAndGenerateController(req, res) {
  try {
    const { url, variations = 1, voiceProfile = 'critical-observer' } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    // Validate URL
    const isValid = await validateUrl(url);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or inaccessible URL'
      });
    }

    // Scrape article
    const article = await scrapeArticle(url);

    // Analyze article for Notion metadata (parallel with post generation)
    const [posts, analysis] = await Promise.all([
      generateLinkedInPosts(article, variations, voiceProfile),
      analyzeArticle(article, voiceProfile)
    ]);

    res.json({
      success: true,
      article,
      posts,
      analysis // Include summary, keyPoints, tags for Notion
    });

  } catch (error) {
    console.error('Scrape and generate controller error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Refines a post based on user feedback
 */
export async function refinePostController(req, res) {
  try {
    const { post, feedback, voiceProfile = 'critical-observer' } = req.body;

    if (!post || !feedback) {
      return res.status(400).json({
        success: false,
        error: 'Post content and feedback are required'
      });
    }

    const refinedPost = await refinePost(post, feedback, voiceProfile);

    res.json({
      success: true,
      refinedPost
    });

  } catch (error) {
    console.error('Refine post controller error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

