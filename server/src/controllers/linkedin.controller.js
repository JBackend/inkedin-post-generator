import { publishPost, validatePostContent } from '../services/linkedin.service.js';

/**
 * POST /api/publish-to-linkedin
 * Publishes a post to user's LinkedIn account
 */
export async function publishToLinkedInController(req, res) {
  try {
    const { postContent } = req.body;

    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please connect your LinkedIn account.'
      });
    }

    // Validate post content
    const validation = validatePostContent(postContent);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    // Publish to LinkedIn
    const result = await publishPost(req.user.id, postContent);

    res.json(result);

  } catch (error) {
    console.error('Publish to LinkedIn controller error:', error);

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to publish to LinkedIn'
    });
  }
}
