import express from 'express';
import {
  scrapeArticleController,
  generatePostsController,
  scrapeAndGenerateController,
  refinePostController
} from '../controllers/post.controller.js';
import { publishToLinkedInController } from '../controllers/linkedin.controller.js';
import { requireAuth } from '../middleware/session.js';
import { checkRateLimit, trackPostGeneration, getUserUsageStats } from '../middleware/rateLimit.js';

const router = express.Router();

// Get usage stats for current user
router.get('/usage', async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      // Anonymous user - return limits but no usage data
      return res.json({
        tier: 'anonymous',
        limit: 3,
        message: 'Sign in to track your usage'
      });
    }

    const stats = await getUserUsageStats(req.user.id);
    if (!stats) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      tier: stats.subscriptionTier,
      current: stats.postCount,
      limit: stats.limit,
      resetsAt: new Date(new Date(stats.weekStart).getTime() + 7 * 24 * 60 * 60 * 1000)
    });
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    res.status(500).json({ error: 'Failed to fetch usage stats' });
  }
});

// Scrape article from URL (no rate limit)
router.post('/scrape', scrapeArticleController);

// Generate posts from article (rate limited)
router.post('/generate', checkRateLimit, generatePostsController, trackPostGeneration);

// Scrape and generate in one call (rate limited - recommended)
router.post('/scrape-and-generate', checkRateLimit, scrapeAndGenerateController, trackPostGeneration);

// Refine a post with feedback (no rate limit - refinement is free)
router.post('/refine', refinePostController);

// Publish post to LinkedIn (requires auth)
router.post('/publish-to-linkedin', requireAuth, publishToLinkedInController);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'LinkedIn Post Generator API is running',
    timestamp: new Date().toISOString()
  });
});

export default router;
