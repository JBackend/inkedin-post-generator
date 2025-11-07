import express from 'express';
import {
  scrapeArticleController,
  generatePostsController,
  scrapeAndGenerateController,
  refinePostController
} from '../controllers/post.controller.js';
import { publishToLinkedInController } from '../controllers/linkedin.controller.js';
import { requireAuth } from '../middleware/session.js';

const router = express.Router();

// Scrape article from URL
router.post('/scrape', scrapeArticleController);

// Generate posts from article
router.post('/generate', generatePostsController);

// Scrape and generate in one call (recommended)
router.post('/scrape-and-generate', scrapeAndGenerateController);

// Refine a post with feedback
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
