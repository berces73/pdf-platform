// ============================================
// IndexNow - Instant Indexing
// Supports: Bing, Yandex, Seznam.cz, Naver
// ============================================

/**
 * IndexNow Key File
 * Save this as: /YOUR_INDEXNOW_KEY.txt
 * Content: YOUR_INDEXNOW_KEY
 */

// Example key (replace with your own):
// File: /a1b2c3d4e5f6g7h8i9j0.txt
// Content: a1b2c3d4e5f6g7h8i9j0

/**
 * IndexNow Submission Function
 * Call this after publishing/updating content
 */

const INDEXNOW_KEY = 'YOUR_INDEXNOW_KEY_HERE'; // Replace with your key
const INDEXNOW_HOST = 'domain.com'; // Your domain
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

/**
 * Submit single URL to IndexNow
 */
async function submitToIndexNow(url) {
  const payload = {
    host: INDEXNOW_HOST,
    key: INDEXNOW_KEY,
    keyLocation: `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`,
    urlList: [url]
  };

  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log('[IndexNow] ✅ Submitted:', url);
      return true;
    } else {
      console.error('[IndexNow] ❌ Failed:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('[IndexNow] ❌ Error:', error);
    return false;
  }
}

/**
 * Submit multiple URLs to IndexNow (batch)
 * Max 10,000 URLs per request
 */
async function submitBatchToIndexNow(urls) {
  // IndexNow limits: max 10,000 URLs per request
  const chunks = [];
  for (let i = 0; i < urls.length; i += 10000) {
    chunks.push(urls.slice(i, i + 10000));
  }

  const results = [];
  for (const chunk of chunks) {
    const payload = {
      host: INDEXNOW_HOST,
      key: INDEXNOW_KEY,
      keyLocation: `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`,
      urlList: chunk
    };

    try {
      const response = await fetch(INDEXNOW_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify(payload)
      });

      results.push({
        success: response.ok,
        status: response.status,
        count: chunk.length
      });

      console.log(`[IndexNow] Batch submitted: ${chunk.length} URLs, Status: ${response.status}`);
    } catch (error) {
      console.error('[IndexNow] Batch error:', error);
      results.push({
        success: false,
        error: error.message,
        count: chunk.length
      });
    }
  }

  return results;
}

/**
 * Auto-submit on page publish/update
 * Add this to your CMS or build process
 */
function autoSubmitOnPublish() {
  // Get current page URL
  const currentUrl = window.location.href;
  
  // Only submit on production
  if (window.location.hostname === INDEXNOW_HOST) {
    submitToIndexNow(currentUrl);
  }
}

/**
 * Sitemap-based bulk submission
 * Run this after sitemap update
 */
async function submitSitemapUrls(sitemapUrl) {
  try {
    const response = await fetch(sitemapUrl);
    const xmlText = await response.text();
    
    // Parse sitemap XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    const urlElements = xmlDoc.getElementsByTagName('loc');
    
    const urls = Array.from(urlElements).map(el => el.textContent);
    
    console.log(`[IndexNow] Found ${urls.length} URLs in sitemap`);
    
    // Submit in batches
    return await submitBatchToIndexNow(urls);
  } catch (error) {
    console.error('[IndexNow] Sitemap submission error:', error);
    return false;
  }
}

// ============================================
// USAGE EXAMPLES
// ============================================

// Example 1: Submit current page
// submitToIndexNow(window.location.href);

// Example 2: Submit specific URL
// submitToIndexNow('https://domain.com/pdf-birlestir');

// Example 3: Submit multiple URLs
// const urls = [
//   'https://domain.com/',
//   'https://domain.com/pdf-birlestir',
//   'https://domain.com/pdf-sikistir'
// ];
// submitBatchToIndexNow(urls);

// Example 4: Submit all URLs from sitemap
// submitSitemapUrls('https://domain.com/sitemap.xml');

// ============================================
// CLOUDFLARE WORKER INTEGRATION
// ============================================

/**
 * Cloudflare Worker for automatic IndexNow submission
 * Deploy this as a Worker and trigger on content changes
 */

/*
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Only handle POST requests to /api/indexnow
  if (request.method !== 'POST' || !request.url.includes('/api/indexnow')) {
    return new Response('Not Found', { status: 404 })
  }

  const { url } = await request.json()

  if (!url) {
    return new Response('Missing URL', { status: 400 })
  }

  // Submit to IndexNow
  const indexNowResponse = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      host: 'domain.com',
      key: 'YOUR_KEY',
      keyLocation: 'https://domain.com/YOUR_KEY.txt',
      urlList: [url]
    })
  })

  return new Response(
    JSON.stringify({ 
      success: indexNowResponse.ok,
      status: indexNowResponse.status 
    }),
    { 
      headers: { 'Content-Type': 'application/json' },
      status: indexNowResponse.status 
    }
  )
}
*/

// ============================================
// NODE.JS / BUILD SCRIPT INTEGRATION
// ============================================

/**
 * Submit URLs during build/deployment
 * Add to package.json scripts:
 * "postbuild": "node scripts/indexnow-submit.js"
 */

/*
// scripts/indexnow-submit.js
const fetch = require('node-fetch');
const fs = require('fs');

const INDEXNOW_KEY = process.env.INDEXNOW_KEY;
const DOMAIN = process.env.DOMAIN;

async function submitBuiltPages() {
  // Read sitemap or build output
  const sitemap = fs.readFileSync('./dist/sitemap.xml', 'utf8');
  
  // Extract URLs
  const urlMatches = sitemap.match(/<loc>(.*?)<\/loc>/g);
  const urls = urlMatches.map(match => 
    match.replace(/<\/?loc>/g, '')
  );

  // Submit to IndexNow
  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      host: DOMAIN,
      key: INDEXNOW_KEY,
      keyLocation: `https://${DOMAIN}/${INDEXNOW_KEY}.txt`,
      urlList: urls
    })
  });

  console.log(`IndexNow submission: ${response.status}`);
  console.log(`Submitted ${urls.length} URLs`);
}

submitBuiltPages();
*/

// ============================================
// MONITORING & ANALYTICS
// ============================================

/**
 * Track IndexNow submissions
 */
function trackIndexNowSubmission(url, success) {
  if (typeof gtag === 'function') {
    gtag('event', 'indexnow_submit', {
      event_category: 'SEO',
      event_label: url,
      value: success ? 1 : 0
    });
  }
}

// ============================================
// RATE LIMITING
// ============================================

/**
 * IndexNow rate limits:
 * - Max 10,000 URLs per request
 * - No explicit rate limit, but be reasonable
 * - Recommended: Don't submit same URL more than once per day
 */

class IndexNowQueue {
  constructor() {
    this.queue = new Set();
    this.submitted = new Map();
  }

  add(url) {
    // Check if already submitted in last 24 hours
    const lastSubmit = this.submitted.get(url);
    if (lastSubmit && Date.now() - lastSubmit < 86400000) {
      console.log('[IndexNow] Skipping (already submitted today):', url);
      return false;
    }

    this.queue.add(url);
    return true;
  }

  async flush() {
    if (this.queue.size === 0) return;

    const urls = Array.from(this.queue);
    const success = await submitBatchToIndexNow(urls);

    if (success) {
      const now = Date.now();
      urls.forEach(url => {
        this.submitted.set(url, now);
        this.queue.delete(url);
      });
    }

    return success;
  }
}

// Usage
// const queue = new IndexNowQueue();
// queue.add('https://domain.com/new-page');
// await queue.flush();

export {
  submitToIndexNow,
  submitBatchToIndexNow,
  submitSitemapUrls,
  autoSubmitOnPublish,
  IndexNowQueue,
  trackIndexNowSubmission
};
