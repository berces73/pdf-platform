/**
 * IndexNow Smart Submission
 * ENTERPRISE VERSION - Anti-Spam
 * Only submits changed URLs, prevents duplicate submissions
 */

const INDEXNOW_KEY = 'YOUR_INDEXNOW_KEY_HERE';
const INDEXNOW_HOST = 'domain.com';
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

// Storage key for tracking submissions
const STORAGE_KEY = 'indexnow_submissions';
const COOLDOWN_HOURS = 24; // Don't resubmit same URL within 24h

/**
 * Track submitted URLs with timestamp
 */
class SubmissionTracker {
  constructor() {
    this.load();
  }
  
  load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      this.submissions = data ? JSON.parse(data) : {};
    } catch (e) {
      this.submissions = {};
    }
  }
  
  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.submissions));
    } catch (e) {
      console.warn('[IndexNow] Storage failed');
    }
  }
  
  wasRecentlySubmitted(url) {
    const lastSubmit = this.submissions[url];
    if (!lastSubmit) return false;
    
    const hoursSince = (Date.now() - lastSubmit) / (1000 * 60 * 60);
    return hoursSince < COOLDOWN_HOURS;
  }
  
  markSubmitted(url) {
    this.submissions[url] = Date.now();
    
    // Clean old entries (older than 7 days)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    Object.keys(this.submissions).forEach(key => {
      if (this.submissions[key] < sevenDaysAgo) {
        delete this.submissions[key];
      }
    });
    
    this.save();
  }
  
  markBatch(urls) {
    urls.forEach(url => this.markSubmitted(url));
  }
}

const tracker = new SubmissionTracker();

/**
 * Submit single URL (with deduplication)
 */
async function submitToIndexNow(url) {
  // Check if already submitted recently
  if (tracker.wasRecentlySubmitted(url)) {
    console.log('[IndexNow] ⏭️ Skipped (recently submitted):', url);
    return { skipped: true, reason: 'recently_submitted' };
  }
  
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

    if (response.ok || response.status === 202) {
      console.log('[IndexNow] ✅ Submitted:', url);
      tracker.markSubmitted(url);
      
      // Track success
      if (typeof gtag === 'function') {
        gtag('event', 'indexnow_submit', {
          event_category: 'SEO',
          event_label: url,
          value: 1
        });
      }
      
      return { success: true, url };
    } else {
      console.error('[IndexNow] ❌ Failed:', response.status, url);
      return { success: false, status: response.status, url };
    }
  } catch (error) {
    console.error('[IndexNow] ❌ Error:', error, url);
    return { success: false, error: error.message, url };
  }
}

/**
 * Submit only changed URLs from sitemap
 * Use this INSTEAD of submitting entire sitemap
 */
async function submitChangedUrls(changedUrls) {
  // Filter out recently submitted
  const toSubmit = changedUrls.filter(url => !tracker.wasRecentlySubmitted(url));
  
  if (toSubmit.length === 0) {
    console.log('[IndexNow] ℹ️ No new URLs to submit');
    return { skipped: changedUrls.length, submitted: 0 };
  }
  
  console.log(`[IndexNow] 📤 Submitting ${toSubmit.length} changed URLs (${changedUrls.length - toSubmit.length} skipped)`);
  
  // IndexNow allows up to 10,000 URLs per request
  const chunks = [];
  for (let i = 0; i < toSubmit.length; i += 10000) {
    chunks.push(toSubmit.slice(i, i + 10000));
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
      
      if (response.ok || response.status === 202) {
        console.log(`[IndexNow] ✅ Batch submitted: ${chunk.length} URLs`);
        tracker.markBatch(chunk);
        results.push({ success: true, count: chunk.length });
      } else {
        console.error(`[IndexNow] ❌ Batch failed: ${response.status}`);
        results.push({ success: false, status: response.status, count: chunk.length });
      }
    } catch (error) {
      console.error('[IndexNow] ❌ Batch error:', error);
      results.push({ success: false, error: error.message, count: chunk.length });
    }
    
    // Rate limiting: wait 100ms between chunks
    if (chunks.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return {
    submitted: results.filter(r => r.success).reduce((sum, r) => sum + r.count, 0),
    failed: results.filter(r => !r.success).reduce((sum, r) => sum + r.count, 0),
    skipped: changedUrls.length - toSubmit.length
  };
}

/**
 * ⚠️ ANTI-SPAM: Don't use this on every deploy!
 * Only use when you have actual URL changes
 */
async function submitSitemapUrlsSmart(sitemapUrl) {
  console.warn('[IndexNow] ⚠️ Submitting entire sitemap - use sparingly!');
  
  try {
    const response = await fetch(sitemapUrl);
    const xmlText = await response.text();
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    const urlElements = xmlDoc.getElementsByTagName('loc');
    
    const allUrls = Array.from(urlElements).map(el => el.textContent);
    
    // Only submit URLs not recently submitted
    return await submitChangedUrls(allUrls);
  } catch (error) {
    console.error('[IndexNow] Sitemap submission error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * RECOMMENDED: Submit on content publish/update
 */
function submitOnPublish() {
  // Only submit if this is a new/updated page
  const currentUrl = window.location.href;
  const isNewPage = document.documentElement.hasAttribute('data-new-page');
  const isUpdated = document.documentElement.hasAttribute('data-updated');
  
  if (isNewPage || isUpdated) {
    submitToIndexNow(currentUrl);
  }
}

/**
 * Build-time integration (Node.js)
 * Add to your CI/CD pipeline
 */
/*
// build-scripts/indexnow-deploy.js
const fs = require('fs');
const fetch = require('node-fetch');

async function submitChangedPages() {
  // Read your build manifest or git diff
  const changedFiles = getChangedFiles(); // Your implementation
  
  const changedUrls = changedFiles
    .filter(f => f.endsWith('.html'))
    .map(f => `https://domain.com${f.replace('dist', '').replace('.html', '')}`);
  
  if (changedUrls.length === 0) {
    console.log('No changed URLs to submit');
    return;
  }
  
  console.log(`Submitting ${changedUrls.length} changed URLs...`);
  
  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      host: 'domain.com',
      key: process.env.INDEXNOW_KEY,
      keyLocation: `https://domain.com/${process.env.INDEXNOW_KEY}.txt`,
      urlList: changedUrls
    })
  });
  
  console.log(`IndexNow: ${response.status} - ${changedUrls.length} URLs`);
}

submitChangedPages();
*/

/**
 * Cloudflare Worker Integration
 */
/*
// workers/indexnow.js
export default {
  async scheduled(event, env, ctx) {
    // Get changed URLs from KV storage
    const changedUrls = await env.CHANGED_URLS.get('urls', 'json') || [];
    
    if (changedUrls.length === 0) return;
    
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: 'domain.com',
        key: env.INDEXNOW_KEY,
        keyLocation: `https://domain.com/${env.INDEXNOW_KEY}.txt`,
        urlList: changedUrls
      })
    });
    
    // Clear after submission
    await env.CHANGED_URLS.put('urls', JSON.stringify([]));
  }
}

// Trigger: Cron schedule (0 0 * * *) - daily at midnight
*/

/**
 * Analytics Dashboard Data
 */
function getSubmissionStats() {
  const submissions = tracker.submissions;
  const urls = Object.keys(submissions);
  
  return {
    totalSubmissions: urls.length,
    last24h: urls.filter(url => 
      (Date.now() - submissions[url]) < 24 * 60 * 60 * 1000
    ).length,
    last7days: urls.filter(url => 
      (Date.now() - submissions[url]) < 7 * 24 * 60 * 60 * 1000
    ).length,
    oldestSubmission: Math.min(...Object.values(submissions)),
    newestSubmission: Math.max(...Object.values(submissions))
  };
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', submitOnPublish);
} else {
  submitOnPublish();
}

export {
  submitToIndexNow,
  submitChangedUrls,
  submitSitemapUrlsSmart,
  SubmissionTracker,
  getSubmissionStats
};
