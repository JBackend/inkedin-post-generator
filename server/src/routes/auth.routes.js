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
  (req, res, next) => {
    // Custom callback to handle the redirect after authentication
    passport.authenticate('linkedin', { 
      failureRedirect: '/auth/failure',
      session: true
    })(req, res, (err) => {
      if (err) {
        console.error('Authentication error:', err);
        return res.redirect(`/auth/failure?error=${encodeURIComponent(err.message)}`);
      }
      
      // Get the return URL from the user's session or default to home
      const returnTo = req.user?.returnTo || '/';
      const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      
      // Clear the returnTo from the user object
      if (req.user) {
        req.user.returnTo = undefined;
      }
      
      // Redirect to the frontend with success status
      res.redirect(`${frontendUrl}${returnTo}?auth=success`);
    });
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
  // If we have a user in the session, return it
  if (req.user) {
    return res.json({
      success: true,
      authenticated: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        profilePhoto: req.user.profile_photo,
        linkedinId: req.user.linkedin_id
      }
    });
  }
  
  // No user in session
  res.json({
    success: true,
    authenticated: false,
    user: null
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
