import passport from 'passport';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import axios from 'axios';
import { query } from '../database/db.js';

/**
 * Configure Passport with LinkedIn OpenID Connect OAuth strategy
 *
 * LinkedIn OpenID Connect Documentation:
 * https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2
 */
export function configurePassport() {
  if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
    throw new Error('LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET must be set');
  }

  if (!process.env.LINKEDIN_CALLBACK_URL) {
    throw new Error('LINKEDIN_CALLBACK_URL must be set');
  }

  // Create LinkedIn OAuth2 strategy with OpenID Connect endpoints
  const linkedInStrategy = new OAuth2Strategy({
    authorizationURL: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenURL: 'https://www.linkedin.com/oauth/v2/accessToken',
    clientID: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    callbackURL: process.env.LINKEDIN_CALLBACK_URL,
    scope: ['openid', 'profile', 'email', 'w_member_social'],
    state: true
  }, async (accessToken, refreshToken, params, profile, done) => {
    try {
      // Fetch user profile from LinkedIn's OpenID Connect userinfo endpoint
      const userInfoResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const userInfo = userInfoResponse.data;
      console.log('Received LinkedIn userinfo:', JSON.stringify(userInfo, null, 2));

      // Extract user data from OpenID Connect format
      const linkedinId = userInfo.sub;
      const name = userInfo.name || `${userInfo.given_name || ''} ${userInfo.family_name || ''}`.trim();
      const email = userInfo.email || null;
      const profilePhoto = userInfo.picture || null;

      if (!linkedinId) {
        console.error('No user ID (sub) in userinfo response');
        return done(new Error('Invalid userinfo response'));
      }

      // Create or update user in database
      const user = await findOrCreateUser({
        linkedinId,
        accessToken,
        refreshToken,
        name,
        email,
        profilePhoto
      });

      console.log('✅ User authenticated:', user.id);
      return done(null, user);
    } catch (error) {
      console.error('Error in OAuth callback:', error.response?.data || error.message);
      return done(error);
    }
  });

  // Override the default userProfile method (not used in our callback, but required by passport-oauth2)
  linkedInStrategy.userProfile = function(accessToken, done) {
    axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    .then(response => done(null, response.data))
    .catch(err => done(err));
  };

  passport.use('linkedin', linkedInStrategy);

  // Serialize user to session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await getUserById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  console.log('✅ Passport LinkedIn OpenID Connect configured');
}

/**
 * Find or create user in database
 */
async function findOrCreateUser({ linkedinId, accessToken, refreshToken, name, email, profilePhoto }) {
  try {
    // Check if user exists
    const existingUser = await query(
      'SELECT * FROM users WHERE linkedin_id = $1',
      [linkedinId]
    );

    const tokenExpiresAt = new Date(Date.now() + (60 * 24 * 60 * 60 * 1000)); // 60 days

    if (existingUser.rows.length > 0) {
      // Update existing user's tokens
      const updated = await query(
        `UPDATE users
         SET linkedin_access_token = $1,
             linkedin_refresh_token = $2,
             token_expires_at = $3,
             name = $4,
             email = $5,
             profile_photo = $6,
             updated_at = NOW()
         WHERE linkedin_id = $7
         RETURNING *`,
        [accessToken, refreshToken, tokenExpiresAt, name, email, profilePhoto, linkedinId]
      );

      console.log('✅ Updated existing user:', updated.rows[0].id);
      return updated.rows[0];
    } else {
      // Create new user
      const newUser = await query(
        `INSERT INTO users (linkedin_id, linkedin_access_token, linkedin_refresh_token, token_expires_at, name, email, profile_photo)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [linkedinId, accessToken, refreshToken, tokenExpiresAt, name, email, profilePhoto]
      );

      console.log('✅ Created new user:', newUser.rows[0].id);
      return newUser.rows[0];
    }
  } catch (error) {
    console.error('Error in findOrCreateUser:', error);
    throw error;
  }
}

/**
 * Get user by ID
 */
export async function getUserById(id) {
  try {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    throw error;
  }
}

/**
 * Get user's LinkedIn access token
 * Checks if token is still valid
 */
export async function getUserAccessToken(userId) {
  try {
    const result = await query(
      'SELECT linkedin_access_token, token_expires_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = result.rows[0];

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(user.token_expires_at);

    if (expiresAt < now) {
      throw new Error('LinkedIn access token has expired. Please reconnect your account.');
    }

    return user.linkedin_access_token;
  } catch (error) {
    console.error('Error getting user access token:', error);
    throw error;
  }
}

/**
 * Update user's access token (for token refresh)
 */
export async function updateUserAccessToken(userId, accessToken, refreshToken) {
  try {
    const tokenExpiresAt = new Date(Date.now() + (60 * 24 * 60 * 60 * 1000)); // 60 days

    await query(
      `UPDATE users
       SET linkedin_access_token = $1,
           linkedin_refresh_token = $2,
           token_expires_at = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [accessToken, refreshToken, tokenExpiresAt, userId]
    );

    console.log('✅ Updated user access token:', userId);
  } catch (error) {
    console.error('Error updating user access token:', error);
    throw error;
  }
}
