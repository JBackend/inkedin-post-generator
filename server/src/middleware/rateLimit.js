import { getPool } from '../database/db.js';

// Rate limit constants
const LIMITS = {
  ANONYMOUS: 3,      // 3 total generations for anonymous users
  AUTHENTICATED: 3,  // 3 articles per week for authenticated users
  PREMIUM: Infinity  // Unlimited for premium users
};

/**
 * Check if a week has passed since the week_start timestamp
 */
function isNewWeek(weekStart) {
  if (!weekStart) return true;

  const now = new Date();
  const start = new Date(weekStart);
  const daysSinceStart = (now - start) / (1000 * 60 * 60 * 24);

  return daysSinceStart >= 7;
}

/**
 * Reset user's weekly post count
 */
async function resetWeeklyCount(userId) {
  try {
    const pool = getPool();
    await pool.query(
      'UPDATE users SET post_count = 0, week_start = NOW() WHERE id = $1',
      [userId]
    );
  } catch (error) {
    console.error('Error resetting weekly count:', error);
    throw error;
  }
}

/**
 * Increment user's post count
 */
async function incrementPostCount(userId) {
  try {
    const pool = getPool();
    await pool.query(
      'UPDATE users SET post_count = post_count + 1, updated_at = NOW() WHERE id = $1',
      [userId]
    );
  } catch (error) {
    console.error('Error incrementing post count:', error);
    throw error;
  }
}

/**
 * Get user's current usage stats
 */
export async function getUserUsageStats(userId) {
  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT post_count, week_start, subscription_tier FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];

    // Check if we need to reset the weekly counter
    if (isNewWeek(user.week_start)) {
      await resetWeeklyCount(userId);
      return {
        postCount: 0,
        weekStart: new Date(),
        subscriptionTier: user.subscription_tier,
        limit: user.subscription_tier === 'premium' ? LIMITS.PREMIUM : LIMITS.AUTHENTICATED
      };
    }

    return {
      postCount: user.post_count,
      weekStart: user.week_start,
      subscriptionTier: user.subscription_tier,
      limit: user.subscription_tier === 'premium' ? LIMITS.PREMIUM : LIMITS.AUTHENTICATED
    };
  } catch (error) {
    console.error('Error getting user usage stats:', error);
    throw error;
  }
}

/**
 * Middleware to check rate limits before generation
 */
export async function checkRateLimit(req, res, next) {
  try {
    // If user is authenticated, check database limits
    if (req.user && req.user.id) {
      const stats = await getUserUsageStats(req.user.id);

      if (!stats) {
        return res.status(404).json({
          error: 'User not found',
          limitExceeded: false
        });
      }

      // Premium users have unlimited access
      if (stats.subscriptionTier === 'premium') {
        req.usageStats = stats;
        return next();
      }

      // Check if authenticated user has exceeded their limit
      if (stats.postCount >= stats.limit) {
        return res.status(429).json({
          error: 'Weekly limit exceeded',
          limitExceeded: true,
          tier: 'authenticated',
          limit: stats.limit,
          current: stats.postCount,
          resetsAt: new Date(new Date(stats.weekStart).getTime() + 7 * 24 * 60 * 60 * 1000),
          message: `You've used all ${stats.limit} free articles this week. Upgrade to premium for unlimited access.`
        });
      }

      // User is within limits
      req.usageStats = stats;
      return next();
    } else {
      // Anonymous user - check via header/body for client-side count
      const anonymousCount = parseInt(req.headers['x-anonymous-count'] || req.body.anonymousCount || 0);

      if (anonymousCount >= LIMITS.ANONYMOUS) {
        return res.status(429).json({
          error: 'Anonymous limit exceeded',
          limitExceeded: true,
          tier: 'anonymous',
          limit: LIMITS.ANONYMOUS,
          current: anonymousCount,
          message: `You've used all ${LIMITS.ANONYMOUS} free generations. Sign in with LinkedIn for more.`
        });
      }

      req.usageStats = {
        postCount: anonymousCount,
        tier: 'anonymous',
        limit: LIMITS.ANONYMOUS
      };

      return next();
    }
  } catch (error) {
    console.error('Error in rate limit middleware:', error);
    return res.status(500).json({
      error: 'Error checking rate limits',
      limitExceeded: false
    });
  }
}

/**
 * Middleware to track post generation (call after successful generation)
 */
export async function trackPostGeneration(req, res, next) {
  try {
    // Only track for authenticated users (anonymous tracked client-side)
    if (req.user && req.user.id) {
      await incrementPostCount(req.user.id);
    }
    next();
  } catch (error) {
    console.error('Error tracking post generation:', error);
    // Don't block the response if tracking fails
    next();
  }
}

export default {
  checkRateLimit,
  trackPostGeneration,
  getUserUsageStats,
  LIMITS
};
