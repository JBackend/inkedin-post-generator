import { useState, useEffect } from 'react';
import './App.css';
import { scrapeAndGenerate, publishToLinkedIn, checkAuthStatus, getLinkedInLoginUrl, logout, type Article, type LinkedInPost, type ArticleAnalysis, type VoiceProfile, type User } from './services/api';

type Step = 'input' | 'loading' | 'review' | 'published';

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
  const [post, setPost] = useState<LinkedInPost | null>(null);
  const [cachedPosts, setCachedPosts] = useState<Partial<Record<VoiceProfile, LinkedInPost>>>({});
  const [editedPost, setEditedPost] = useState('');
  const [error, setError] = useState('');
  const [publishedUrl, setPublishedUrl] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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
    } catch (err) {
      console.error('Auth check failed:', err);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

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
      const result = await scrapeAndGenerate(url, 1, voiceProfile);
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

      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setStep('input');
    }
  };

  const handleRegenerateWithVoice = async (newVoiceProfile: VoiceProfile) => {
    if (!url) return;

    setVoiceProfile(newVoiceProfile);
    setError('');

    // Check if this persona is already cached
    if (cachedPosts[newVoiceProfile]) {
      // Use cached version instantly
      const cachedPost = cachedPosts[newVoiceProfile];
      setPost(cachedPost);
      setEditedPost(cachedPost.post);
      return;
    }

    // Not cached, generate new post
    setStep('loading');

    try {
      const result = await scrapeAndGenerate(url, 1, newVoiceProfile);
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

      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate post');
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
              <span className="voice-tabs-label">Try a different voice:</span>
              <div className="voice-pills">
                <button
                  className={`voice-pill ${voiceProfile === 'critical-observer' ? 'active' : ''}`}
                  onClick={() => handleRegenerateWithVoice('critical-observer')}
                  disabled={step !== 'review'}
                  title="Data-driven analysis with stats and sources"
                >
                  Critical Observer
                </button>
                <button
                  className={`voice-pill ${voiceProfile === 'thought-leader' ? 'active' : ''}`}
                  onClick={() => handleRegenerateWithVoice('thought-leader')}
                  disabled={step !== 'review'}
                  title="Bold insights and industry perspective"
                >
                  Thought Leader
                </button>
                <button
                  className={`voice-pill ${voiceProfile === 'storyteller' ? 'active' : ''}`}
                  onClick={() => handleRegenerateWithVoice('storyteller')}
                  disabled={step !== 'review'}
                  title="Personal stories and experiences"
                >
                  Storyteller
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
    </div>
  );
}

export default App;
