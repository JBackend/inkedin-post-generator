import { useState, useEffect } from 'react';
import './App.css';
import { scrapeAndGenerate, publishToLinkedIn, checkAuthStatus, getLinkedInLoginUrl, logout, getUsageStats, type Article, type LinkedInPost, type ArticleAnalysis, type VoiceProfile, type User, type UsageStats, type RateLimitError } from './services/api';

type Step = 'input' | 'loading' | 'review' | 'published';

interface DraftData {
  url: string;
  voiceProfile: VoiceProfile;
  article: Article | null;
  post: LinkedInPost | null;
  cachedPosts: Partial<Record<VoiceProfile, LinkedInPost>>;
  editedPost: string;
  timestamp: number;
}

const DRAFT_STORAGE_KEY = 'linkedin-post-draft';
const ANONYMOUS_COUNT_KEY = 'linkedin-post-anonymous-count';

function App() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // App state
  const [url, setUrl] = useState('');
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile>('critical-observer');
  const [step, setStep] = useState<Step>('input');
  const [article, setArticle] = useState<Article | null>(null);
  const [_analysis, setAnalysis] = useState<ArticleAnalysis | null>(null);
  const [post, setPost] = useState<LinkedInPost | null>(null);
  const [cachedPosts, setCachedPosts] = useState<Partial<Record<VoiceProfile, LinkedInPost>>>({});
  const [editedPost, setEditedPost] = useState('');
  const [error, setError] = useState('');
  const [_publishing, setPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);

  // Rate limiting state
  const [anonymousPostCount, setAnonymousPostCount] = useState(0);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [showRateLimitDialog, setShowRateLimitDialog] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitError | null>(null);

  // Handle OAuth callback and check auth status on mount
  useEffect(() => {
    const checkAuthAndHandleCallback = async () => {
      // Check if this is a callback from LinkedIn
      const urlParams = new URLSearchParams(window.location.search);
      const authStatus = urlParams.get('auth');
      
      // Handle successful authentication
      if (authStatus === 'success') {
        // Clear the auth status from URL
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        
        // Check auth status to get the latest user data
        await checkAuth();
        
        // Check for pending post
        const pendingPost = sessionStorage.getItem('pendingPost');
        if (pendingPost) {
          try {
            const { content, article: savedArticle, voiceProfile: savedVoiceProfile } = JSON.parse(pendingPost);
            setEditedPost(content);
            if (savedArticle) setArticle(savedArticle);
            if (savedVoiceProfile) setVoiceProfile(savedVoiceProfile);

            // Restore post object for review section to render
            if (content) {
              setPost({ post: content, angle: '', hook: '', hashtags: [] });
              setStep('review');
              // Note: User will need to click "Publish to LinkedIn" again
              // This is better UX than auto-publishing without confirmation
            }
          } catch (e) {
            console.error('Error processing pending post:', e);
          } finally {
            sessionStorage.removeItem('pendingPost');
          }
        }
      } 
      // Handle auth failure
      else if (authStatus === 'failure') {
        const error = urlParams.get('error');
        setError(error || 'Authentication failed. Please try again.');
        // Clear the error from URL
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
      
      // Always check auth status on mount
      checkAuth();
    };

    checkAuthAndHandleCallback();
  }, []);

  const checkAuth = async () => {
    try {
      const status = await checkAuthStatus();
      setIsAuthenticated(status.authenticated);
      setUser(status.user);

      // If authenticated, fetch usage stats
      if (status.authenticated) {
        try {
          const stats = await getUsageStats();
          setUsageStats(stats);
        } catch (err) {
          console.error('Failed to fetch usage stats:', err);
        }
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  // Load anonymous post count from localStorage on mount
  useEffect(() => {
    try {
      const savedCount = localStorage.getItem(ANONYMOUS_COUNT_KEY);
      if (savedCount) {
        setAnonymousPostCount(parseInt(savedCount, 10));
      }
    } catch (err) {
      console.error('Failed to load anonymous count:', err);
    }
  }, []);

  // Save anonymous post count to localStorage whenever it changes
  useEffect(() => {
    if (!isAuthenticated && anonymousPostCount > 0) {
      try {
        localStorage.setItem(ANONYMOUS_COUNT_KEY, anonymousPostCount.toString());
      } catch (err) {
        console.error('Failed to save anonymous count:', err);
      }
    }
  }, [anonymousPostCount, isAuthenticated]);

  // Draft persistence functions
  const saveDraft = () => {
    if (!url || !article || !post) return; // Only save if we have generated content

    const draft: DraftData = {
      url,
      voiceProfile,
      article,
      post,
      cachedPosts,
      editedPost,
      timestamp: Date.now()
    };

    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      console.log('Draft saved to localStorage');
    } catch (err) {
      console.error('Failed to save draft:', err);
    }
  };

  const loadDraft = () => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!savedDraft) return null;

      const draft: DraftData = JSON.parse(savedDraft);

      // Check if draft is less than 24 hours old
      const hoursSinceSave = (Date.now() - draft.timestamp) / (1000 * 60 * 60);
      if (hoursSinceSave > 24) {
        clearDraft();
        return null;
      }

      return draft;
    } catch (err) {
      console.error('Failed to load draft:', err);
      return null;
    }
  };

  const restoreDraft = (draft: DraftData) => {
    setUrl(draft.url);
    setVoiceProfile(draft.voiceProfile);
    setArticle(draft.article);
    setPost(draft.post);
    setCachedPosts(draft.cachedPosts);
    setEditedPost(draft.editedPost);
    setStep('review');
    setShowDraftBanner(false);
    console.log('Draft restored');
  };

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      console.log('Draft cleared from localStorage');
    } catch (err) {
      console.error('Failed to clear draft:', err);
    }
  };

  // Check for existing draft on mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft && step === 'input') {
      setShowDraftBanner(true);
    }
  }, []);

  // Auto-save draft whenever relevant state changes
  useEffect(() => {
    // Only save when we have content and we're in review step
    if (url && article && post && step === 'review') {
      const timeoutId = setTimeout(() => {
        saveDraft();
      }, 1000); // Debounce: save 1 second after state changes

      return () => clearTimeout(timeoutId);
    }
  }, [url, article, post, cachedPosts, editedPost, voiceProfile, step]);

  const handleLogin = (eventOrReturnTo?: React.MouseEvent | string) => {
    try {
      // Handle both direct calls and event-based calls
      const returnTo = typeof eventOrReturnTo === 'string' 
        ? eventOrReturnTo 
        : window.location.pathname;
        
      // Encode the return URL in the state parameter
      const state = JSON.stringify({ returnTo });
      window.location.href = getLinkedInLoginUrl(state);
    } catch (err) {
      console.error('Error during login:', err);
      setError('Failed to start authentication. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsAuthenticated(false);
      setUser(null);
      // Reset state
      handleReset();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleGenerate = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setError('');
    setStep('loading');

    try {
      const result = await scrapeAndGenerate(url, 1, voiceProfile, anonymousPostCount);
      const generatedPost = result.posts[0] || null;

      setArticle(result.article);
      setAnalysis(result.analysis);
      setPost(generatedPost);
      setEditedPost(generatedPost?.post || '');

      // Cache the generated post
      if (generatedPost) {
        setCachedPosts(prev => ({
          ...prev,
          [voiceProfile]: generatedPost
        }));
      }

      // Increment usage counter
      if (!isAuthenticated) {
        setAnonymousPostCount(prev => prev + 1);
      } else {
        // Refresh usage stats for authenticated users
        try {
          const stats = await getUsageStats();
          setUsageStats(stats);
        } catch (err) {
          console.error('Failed to refresh usage stats:', err);
        }
      }

      setStep('review');
    } catch (err) {
      // Handle rate limit errors
      if (err instanceof Error && (err as any).rateLimitInfo) {
        const rateLimitError = (err as any).rateLimitInfo as RateLimitError;
        setRateLimitInfo(rateLimitError);
        setShowRateLimitDialog(true);
        setError('');
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
      setStep('input');
    }
  };

  const handleRegenerateWithVoice = async (newVoiceProfile: VoiceProfile) => {
    if (!url) return;

    setVoiceProfile(newVoiceProfile);
    setError('');

    // Check if this persona is already cached
    if (cachedPosts[newVoiceProfile]) {
      // Use cached version instantly (no API call, no rate limit increment)
      const cachedPost = cachedPosts[newVoiceProfile];
      setPost(cachedPost);
      setEditedPost(cachedPost.post);
      return;
    }

    // Not cached, generate new post
    setStep('loading');

    try {
      const result = await scrapeAndGenerate(url, 1, newVoiceProfile, anonymousPostCount);
      const generatedPost = result.posts[0] || null;

      setPost(generatedPost);
      setEditedPost(generatedPost?.post || '');

      // Cache the new post
      if (generatedPost) {
        setCachedPosts(prev => ({
          ...prev,
          [newVoiceProfile]: generatedPost
        }));
      }

      // Increment usage counter
      if (!isAuthenticated) {
        setAnonymousPostCount(prev => prev + 1);
      } else {
        // Refresh usage stats for authenticated users
        try {
          const stats = await getUsageStats();
          setUsageStats(stats);
        } catch (err) {
          console.error('Failed to refresh usage stats:', err);
        }
      }

      setStep('review');
    } catch (err) {
      // Handle rate limit errors
      if (err instanceof Error && (err as any).rateLimitInfo) {
        const rateLimitError = (err as any).rateLimitInfo as RateLimitError;
        setRateLimitInfo(rateLimitError);
        setShowRateLimitDialog(true);
        setError('');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to regenerate post');
      }
      setStep('review');
    }
  };

  const handlePublishClick = async () => {
    if (!isAuthenticated) {
      try {
        // Save the current post to session storage before redirecting to login
        const postData = {
          content: editedPost,
          article,
          voiceProfile
        };
        
        sessionStorage.setItem('pendingPost', JSON.stringify(postData));
        
        // Get the current path to return to after auth
        const returnTo = window.location.pathname;
        handleLogin(returnTo);
      } catch (err) {
        console.error('Error saving post for later:', err);
        setError('Failed to save post. Please try again.');
      }
      return;
    }
    
    // If already authenticated, show confirmation dialog
    setShowConfirmDialog(true);
  };

  const handlePublish = async () => {
    try {
      setPublishing(true);
      const result = await publishToLinkedIn(editedPost);
      setPublishedUrl(result.postUrl);
      setStep('published');
      clearDraft(); // Clear draft after successful publish
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish to LinkedIn');
    } finally {
      setPublishing(false);
    }
  };

  const handleConfirmPublish = async () => {
    setShowConfirmDialog(false);
    await handlePublish();
  };

  const handleCancelPublish = () => {
    setShowConfirmDialog(false);
  };

  const handleReset = () => {
    setUrl('');
    setStep('input');
    setArticle(null);
    setAnalysis(null);
    setPost(null);
    setCachedPosts({} as Record<VoiceProfile, LinkedInPost>);
    setEditedPost('');
    setError('');
    setPublishedUrl('');
    setShowConfirmDialog(false);
    setShowDraftBanner(false);
    clearDraft(); // Clear saved draft when starting over
  };

  if (authLoading) {
    return (
      <div className="app">
        <div className="loading-section">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>LinkedIn Post Generator</h1>
          <div className="auth-section">
            {isAuthenticated && (
              <div className="user-info">
                {user?.profilePhoto && (
                  <img
                    src={user.profilePhoto}
                    alt={user.name}
                    className="user-avatar"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <span className="user-name">Hi, {user?.name || 'User'}</span>
                <button onClick={handleLogout} className="btn btn-link">
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        {showDraftBanner && (
          <div className="draft-banner">
            <div className="draft-banner-content">
              <span className="draft-icon">💾</span>
              <div className="draft-text">
                <strong>Draft found!</strong>
                <p>You have an unsaved draft from your last session.</p>
              </div>
              <div className="draft-actions">
                <button
                  onClick={() => {
                    const draft = loadDraft();
                    if (draft) restoreDraft(draft);
                  }}
                  className="btn btn-primary"
                >
                  Resume Draft
                </button>
                <button
                  onClick={() => {
                    clearDraft();
                    setShowDraftBanner(false);
                  }}
                  className="btn btn-secondary"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="input-section">
            <div className="input-group">
              <input
                type="url"
                placeholder="Paste article URL here..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
                className="url-input"
              />
              <button onClick={handleGenerate} className="btn btn-primary">
                Generate Post
              </button>
            </div>

            {/* Usage Stats Indicator */}
            {!isAuthenticated && (
              <div className="info-banner">
                <span className="info-icon">ℹ️</span>
                <span>
                  {anonymousPostCount}/{3} free generations used.
                  {anonymousPostCount >= 3 ? ' Sign in with LinkedIn for more!' : ''}
                </span>
              </div>
            )}
            {isAuthenticated && usageStats && usageStats.tier !== 'premium' && (
              <div className="info-banner">
                <span className="info-icon">📊</span>
                <span>
                  {usageStats.current || 0}/{usageStats.limit} articles this week.
                  {usageStats.resetsAt && ` Resets ${new Date(usageStats.resetsAt).toLocaleDateString()}`}
                </span>
              </div>
            )}

            {error && <div className="error">{error}</div>}

            <div className="voice-profile-section">
              <h3>Voice Profile</h3>
              <div className="voice-options">
                <label className={`voice-option ${voiceProfile === 'critical-observer' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="voiceProfile"
                    value="critical-observer"
                    checked={voiceProfile === 'critical-observer'}
                    onChange={(e) => setVoiceProfile(e.target.value as VoiceProfile)}
                  />
                  <div className="voice-details">
                    <div className="voice-name">
                      Critical Observer
                      <span className="voice-tooltip" title="Example: 'According to recent data from McKinsey, companies that...'">ⓘ</span>
                    </div>
                    <div className="voice-description">
                      Data-driven skeptic who leads with stats, cites sources, and uses historical parallels. 250-300 words.
                    </div>
                  </div>
                </label>

                <label className={`voice-option ${voiceProfile === 'thought-leader' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="voiceProfile"
                    value="thought-leader"
                    checked={voiceProfile === 'thought-leader'}
                    onChange={(e) => setVoiceProfile(e.target.value as VoiceProfile)}
                  />
                  <div className="voice-details">
                    <div className="voice-name">
                      Thought Leader
                      <span className="voice-tooltip" title="Example: 'The future of work isn't about remote vs office. It's about autonomy.'">ⓘ</span>
                    </div>
                    <div className="voice-description">
                      Bold visionary who challenges paradigms with short, punchy insights. 150-200 words.
                    </div>
                  </div>
                </label>

                <label className={`voice-option ${voiceProfile === 'storyteller' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="voiceProfile"
                    value="storyteller"
                    checked={voiceProfile === 'storyteller'}
                    onChange={(e) => setVoiceProfile(e.target.value as VoiceProfile)}
                  />
                  <div className="voice-details">
                    <div className="voice-name">
                      Storyteller
                      <span className="voice-tooltip" title="Example: 'Three years ago, I made a mistake that taught me everything about leadership...'">ⓘ</span>
                    </div>
                    <div className="voice-description">
                      Warm narrator who shares personal experiences and lessons learned. 200-250 words.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {!isAuthenticated && (
              <div className="info-banner">
                <span className="info-icon">💡</span>
                <span>Generate posts for free. Connect LinkedIn when ready to publish.</span>
              </div>
            )}

            <div className="help-text">
              <p>Paste a URL to any article, blog post, or web page.</p>
              <p>We'll analyze the content and generate a LinkedIn post in your selected voice.</p>
            </div>
          </div>
        {step === 'loading' && (
          <div className="loading-section">
            <div className="spinner"></div>
            <p>Analyzing article and generating post...</p>
            <p className="loading-subtext">This may take 10-20 seconds</p>
          </div>
        )}
        {step === 'review' && article && post && (
          <div className="review-section">
            <div className="article-info">
              <h2>{article.title}</h2>
              <p className="article-meta">
                By {article.author} • {article.wordCount} words
              </p>
            </div>

            <div className="voice-tabs">
              <span className="voice-tabs-label">
                Try a different voice:
                <span className="voice-counter">
                  {Object.keys(cachedPosts).length}/3 generated
                </span>
              </span>
              <div className="voice-pills">
                <button
                  className={`voice-pill ${voiceProfile === 'critical-observer' ? 'active' : ''} ${cachedPosts['critical-observer'] ? 'cached' : ''}`}
                  onClick={() => handleRegenerateWithVoice('critical-observer')}
                  disabled={step !== 'review'}
                  title="Data-driven analysis with stats and sources"
                >
                  Critical Observer
                  {cachedPosts['critical-observer'] && <span className="cached-indicator">✓</span>}
                </button>
                <button
                  className={`voice-pill ${voiceProfile === 'thought-leader' ? 'active' : ''} ${cachedPosts['thought-leader'] ? 'cached' : ''}`}
                  onClick={() => handleRegenerateWithVoice('thought-leader')}
                  disabled={step !== 'review'}
                  title="Bold insights and industry perspective"
                >
                  Thought Leader
                  {cachedPosts['thought-leader'] && <span className="cached-indicator">✓</span>}
                </button>
                <button
                  className={`voice-pill ${voiceProfile === 'storyteller' ? 'active' : ''} ${cachedPosts['storyteller'] ? 'cached' : ''}`}
                  onClick={() => handleRegenerateWithVoice('storyteller')}
                  disabled={step !== 'review'}
                  title="Personal stories and experiences"
                >
                  Storyteller
                  {cachedPosts['storyteller'] && <span className="cached-indicator">✓</span>}
                </button>
              </div>
            </div>

            <div className="post-editor">
              <div className="post-header">
                <h3>Edit your post</h3>
              </div>
              <textarea
                value={editedPost}
                onChange={(e) => setEditedPost(e.target.value)}
                className="post-textarea"
                rows={15}
              />
              <div className="word-count">
                {editedPost.trim().split(/\s+/).filter(w => w.length > 0).length} words
              </div>
            </div>

            {error && <div className="error">{error}</div>}

            <div className="action-buttons">
              <button onClick={handleReset} className="btn btn-secondary">
                Start Over
              </button>
              {isAuthenticated ? (
                <button onClick={handlePublishClick} className="btn btn-primary">
                  Publish to LinkedIn
                </button>
              ) : (
                <button
                  onClick={handlePublishClick}
                  className="btn btn-primary"
                  title="Connect your LinkedIn account to publish"
                >
                  Connect LinkedIn to Publish
                </button>
              )}
            </div>
          </div>
        )}
        {showConfirmDialog && (
          <div className="modal-overlay" onClick={handleCancelPublish}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Confirm Publish</h2>
              <p>Are you sure you want to publish this post to LinkedIn?</p>
              <div className="post-preview">
                <div className="post-preview-text">{editedPost}</div>
              </div>
              <div className="modal-actions">
                <button onClick={handleCancelPublish} className="btn btn-secondary">
                  Cancel
                </button>
                <button onClick={handleConfirmPublish} className="btn btn-primary">
                  Publish Now
                </button>
              </div>
            </div>
          </div>
        )}
        {step === 'published' && (
          <div className="success-section">
            <div className="success-icon">✓</div>
            <h2>Published to LinkedIn!</h2>
            <p>Your post has been successfully published to LinkedIn.</p>
            {publishedUrl && (
              <a href={publishedUrl} target="_blank" rel="noopener noreferrer" className="notion-link">
                View on LinkedIn →
              </a>
            )}
            <button onClick={handleReset} className="btn btn-primary">
              Create Another Post
            </button>
          </div>
        )}
      </main>

      {/* Rate Limit Dialog */}
      {showRateLimitDialog && rateLimitInfo && (
        <div className="modal-overlay" onClick={() => setShowRateLimitDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>
              {rateLimitInfo.tier === 'anonymous' ? '🔒 Free Limit Reached' : '📊 Weekly Limit Reached'}
            </h2>
            <p>{rateLimitInfo.message}</p>

            <div className="limit-stats">
              <div className="stat">
                <span className="stat-label">Used:</span>
                <span className="stat-value">{rateLimitInfo.current}/{rateLimitInfo.limit}</span>
              </div>
              {rateLimitInfo.resetsAt && (
                <div className="stat">
                  <span className="stat-label">Resets:</span>
                  <span className="stat-value">{new Date(rateLimitInfo.resetsAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            <div className="modal-actions">
              {rateLimitInfo.tier === 'anonymous' ? (
                <>
                  <button
                    onClick={() => {
                      setShowRateLimitDialog(false);
                      handleLogin();
                    }}
                    className="btn btn-primary"
                  >
                    Sign in with LinkedIn
                  </button>
                  <button
                    onClick={() => setShowRateLimitDialog(false)}
                    className="btn btn-secondary"
                  >
                    Maybe Later
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowRateLimitDialog(false)}
                    className="btn btn-primary"
                  >
                    Upgrade to Premium
                  </button>
                  <button
                    onClick={() => setShowRateLimitDialog(false)}
                    className="btn btn-secondary"
                  >
                    OK
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
