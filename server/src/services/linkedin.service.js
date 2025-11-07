import axios from 'axios';
import { getUserAccessToken } from './auth.service.js';

/**
 * Publish a post to LinkedIn
 * @param {number} userId - User ID from database
 * @param {string} postContent - The text content to post
 * @returns {Promise<Object>} - LinkedIn post information
 */
export async function publishPost(userId, postContent) {
  try {
    // Get user's LinkedIn access token
    const accessToken = await getUserAccessToken(userId);

    // Get user's LinkedIn profile ID (sub)
    const profileInfo = await getLinkedInProfile(accessToken);
    const linkedInId = profileInfo.sub;

    // Create the post using LinkedIn UGC Post API
    const postData = {
      author: `urn:li:person:${linkedInId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: postContent
          },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };

    const response = await axios.post(
      'https://api.linkedin.com/v2/ugcPosts',
      postData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      }
    );

    // Extract post ID and construct URL
    const postId = response.data.id;
    const postUrl = constructLinkedInPostUrl(postId);

    console.log('✅ Successfully published to LinkedIn:', postUrl);

    return {
      success: true,
      postId,
      postUrl,
      message: 'Post published successfully to LinkedIn'
    };

  } catch (error) {
    console.error('LinkedIn publish error:', error.response?.data || error.message);

    // Handle specific error cases
    if (error.response?.status === 401) {
      throw new Error('LinkedIn authentication expired. Please reconnect your account.');
    } else if (error.response?.status === 403) {
      throw new Error('Insufficient permissions. Please ensure the app has w_member_social scope.');
    } else if (error.response?.data?.message) {
      throw new Error(`LinkedIn API error: ${error.response.data.message}`);
    } else {
      throw new Error(`Failed to publish to LinkedIn: ${error.message}`);
    }
  }
}

/**
 * Get LinkedIn profile information
 * @param {string} accessToken - LinkedIn access token
 * @returns {Promise<Object>} - Profile information
 */
async function getLinkedInProfile(accessToken) {
  try {
    const response = await axios.get(
      'https://api.linkedin.com/v2/userinfo',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error getting LinkedIn profile:', error.response?.data || error.message);
    throw new Error('Failed to get LinkedIn profile information');
  }
}

/**
 * Construct LinkedIn post URL from post ID
 * Format: https://www.linkedin.com/feed/update/urn:li:share:POST_ID
 */
function constructLinkedInPostUrl(postId) {
  // postId format: urn:li:share:1234567890
  // or urn:li:ugcPost:1234567890

  // Extract the ID portion
  const idMatch = postId.match(/:([\d]+)$/);
  if (idMatch) {
    return `https://www.linkedin.com/feed/update/${postId}`;
  }

  // Fallback: return profile activity URL
  return 'https://www.linkedin.com/feed/';
}

/**
 * Validate post content
 * LinkedIn has specific requirements for posts
 */
export function validatePostContent(content) {
  if (!content || typeof content !== 'string') {
    return { valid: false, error: 'Post content is required' };
  }

  const trimmed = content.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Post content cannot be empty' };
  }

  // LinkedIn max post length is 3000 characters
  if (trimmed.length > 3000) {
    return { valid: false, error: 'Post content exceeds 3000 characters' };
  }

  return { valid: true };
}
