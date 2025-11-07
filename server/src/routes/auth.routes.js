import express from 'express';
import passport from 'passport';

const router = express.Router();

/**
 * GET /auth/linkedin
 * Initiates LinkedIn OAuth flow
 */
router.get('/linkedin', passport.authenticate('linkedin'));

/**
 * GET /auth/linkedin/callback
 * LinkedIn OAuth callback handler
 */
router.get('/linkedin/callback', 
  passport.authenticate('linkedin', { 
    failureRedirect: 'http://localhost:5173/login?error=auth_failed',
    session: true
  }),
  (req, res) => {
    // Successful authentication, redirect to home
    const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/`);
  }
);

/**
 * GET /auth/failure
 * OAuth failure handler
 */
router.get('/failure', (req, res) => {
  console.error('OAuth failure:', req.query);
  const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const error = req.query.error || 'authentication_failed';
  res.redirect(`${frontendUrl}/login?auth=failure&error=${encodeURIComponent(error)}`);
});

/**
 * GET /auth/status
 * Check if user is authenticated
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    authenticated: !!req.user,
    user: req.user || null
  });
});

/**
 * POST /auth/logout
 * Logout user
 */
router.post('/logout', (req, res) => {
  try {
    req.logout(() => {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ success: false, error: 'Failed to destroy session' });
        }
        res.clearCookie('linkedin_post_generator.sid');
        return res.json({ success: true });
      });
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to logout' });
  }
});

export default router;
