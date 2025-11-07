import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Scrapes article content from a given URL
 * @param {string} url - The URL to scrape
 * @returns {Promise<Object>} - Article data including title, content, author, etc.
 */
export async function scrapeArticle(url) {
  try {
    // Fetch the HTML content
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 15000
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .advertisement, .ad, .social-share').remove();

    // Try multiple selectors to find article content
    let title = $('h1').first().text().trim() ||
                $('title').text().trim() ||
                $('meta[property="og:title"]').attr('content') ||
                '';

    // Find article body - try common selectors
    let content = '';
    const contentSelectors = [
      'article',
      '[role="article"]',
      '.article-content',
      '.post-content',
      '.entry-content',
      'main',
      '.content'
    ];

    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text().trim();
        if (content.length > 200) break; // Found substantial content
      }
    }

    // Fallback: get all paragraph text
    if (!content || content.length < 200) {
      content = $('p').map((i, el) => $(el).text().trim()).get().join('\n\n');
    }

    // Extract metadata
    const author = $('meta[name="author"]').attr('content') ||
                   $('[rel="author"]').text().trim() ||
                   $('.author-name').text().trim() ||
                   'Unknown';

    const publishDate = $('meta[property="article:published_time"]').attr('content') ||
                        $('time').attr('datetime') ||
                        '';

    const description = $('meta[name="description"]').attr('content') ||
                       $('meta[property="og:description"]').attr('content') ||
                       '';

    // Clean up content
    content = content
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/\n{3,}/g, '\n\n')  // Remove excessive newlines
      .trim();

    if (!content || content.length < 100) {
      throw new Error('Could not extract sufficient content from the article');
    }

    return {
      url,
      title,
      content,
      author,
      publishDate,
      description,
      wordCount: content.split(/\s+/).length,
      scrapedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Scraping error:', error.message);
    throw new Error(`Failed to scrape article: ${error.message}`);
  }
}

/**
 * Validates if a URL is accessible and likely contains an article
 * @param {string} url - The URL to validate
 * @returns {Promise<boolean>} - Whether the URL is valid
 */
export async function validateUrl(url) {
  try {
    // Basic URL validation
    new URL(url);

    // Check if URL is accessible
    const response = await axios.head(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    return response.status === 200;
  } catch (error) {
    return false;
  }
}
