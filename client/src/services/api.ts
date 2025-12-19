// Use relative URLs in production (same domain as frontend)
  const API_BASE_URL = import.meta.env.VITE_API_URL ||
    (import.meta.env.MODE === 'production' ? '/api' :
  'http://localhost:3002/api');
  const AUTH_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '/auth')
   ||
    (import.meta.env.MODE === 'production' ? '/auth' :
  'http://localhost:3002/auth');


export interface Article {
  url: string;
  title: string;
  content: string;
  author: string;
  publishDate: string;
  description: string;
  wordCount: number;
  scrapedAt: string;
}

export interface LinkedInPost {
  angle: string;
  whyThisWorks?: string;
  hook: string;
  post: string;
  hashtags: string[];
}

export interface ArticleAnalysis {
  summary: string;
  keyPoints: string;
  tags: string[];
}

export interface User {
  id: number;
  name: string;
  email: string;
  profilePhoto: string;
}

export interface AuthStatus {
  authenticated: boolean;
  user: User | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type VoiceProfile = 'critical-observer' | 'thought-leader' | 'storyteller';

/**
 * Scrapes and generates LinkedIn posts from a URL in one call
 */
export async function scrapeAndGenerate(
  url: string,
  variations: number = 5,
  voiceProfile: VoiceProfile = 'critical-observer'
): Promise<{ article: Article; posts: LinkedInPost[]; analysis: ArticleAnalysis }> {
  const response = await fetch(`${API_BASE_URL}/scrape-and-generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ url, variations, voiceProfile }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to scrape and generate posts');
  }

  return {
    article: data.article,
    posts: data.posts,
    analysis: data.analysis,
  };
}

/**
 * Scrapes an article from URL
 */
export async function scrapeArticle(url: string): Promise<Article> {
  const response = await fetch(`${API_BASE_URL}/scrape`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to scrape article');
  }

  return data.article;
}

/**
 * Generates LinkedIn posts from article
 */
export async function generatePosts(
  article: Article,
  variations: number = 5,
  voiceProfile: VoiceProfile = 'critical-observer'
): Promise<LinkedInPost[]> {
  const response = await fetch(`${API_BASE_URL}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ article, variations, voiceProfile }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to generate posts');
  }

  return data.posts;
}

/**
 * Refines a post based on feedback
 */
export async function refinePost(
  post: string,
  feedback: string,
  voiceProfile: VoiceProfile = 'critical-observer'
): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/refine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ post, feedback, voiceProfile }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to refine post');
  }

  return data.refinedPost;
}

/**
 * Check authentication status
 */
export async function checkAuthStatus(): Promise<AuthStatus> {
  const response = await fetch(`${AUTH_BASE_URL}/status`, {
    credentials: 'include'
  });
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to check auth status');
  }

  return {
    authenticated: data.authenticated,
    user: data.user
  };
}

/**
 * Get LinkedIn OAuth URL
 */
export function getLinkedInLoginUrl(returnTo: string = window.location.pathname): string {
  const state = JSON.stringify({ returnTo });
  return `${AUTH_BASE_URL}/linkedin?state=${encodeURIComponent(state)}`;
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
  const response = await fetch(`${AUTH_BASE_URL}/logout`, {
    method: 'POST',
    credentials: 'include'
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to logout');
  }
}

/**
 * Publish post to LinkedIn
 */
export async function publishToLinkedIn(postContent: string): Promise<{ postUrl: string; postId: string }> {
  const response = await fetch(`${API_BASE_URL}/publish-to-linkedin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ postContent }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to publish to LinkedIn');
  }

  return {
    postUrl: data.postUrl,
    postId: data.postId
  };
}
