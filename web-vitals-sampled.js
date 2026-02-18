/**
 * Core Web Vitals with Smart Sampling
 * ENTERPRISE VERSION - GA4 Quota Protected
 * Version: 3.1.0
 */

import {onCLS, onFID, onLCP, onFCP, onTTFB, onINP} from 'web-vitals';

// ⭐ ENTERPRISE: Sampling Configuration
const SAMPLING_CONFIG = {
  // Production: 20% sampling (saves GA4 quota)
  production: 0.20,
  
  // Development: 100% sampling (full visibility)
  development: 1.0,
  
  // Staging: 50% sampling
  staging: 0.50
};

// Detect environment
const getEnvironment = () => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname.includes('dev.')) return 'development';
  if (hostname.includes('staging.')) return 'staging';
  return 'production';
};

const environment = getEnvironment();
const SAMPLE_RATE = SAMPLING_CONFIG[environment];

// Check if this session should be sampled
const shouldSample = () => {
  // Check session storage first (consistent per session)
  const stored = sessionStorage.getItem('vitals_sampled');
  if (stored !== null) {
    return stored === 'true';
  }
  
  // Decide for this session
  const sampled = Math.random() < SAMPLE_RATE;
  sessionStorage.setItem('vitals_sampled', sampled);
  return sampled;
};

const IS_SAMPLED = shouldSample();

console.log(`[Web Vitals] Environment: ${environment}, Sampling: ${SAMPLE_RATE * 100}%, This session: ${IS_SAMPLED ? 'YES' : 'NO'}`);

/**
 * Send to analytics (with sampling)
 */
function sendToAnalytics(metric) {
  if (!IS_SAMPLED) {
    console.log('[Web Vitals] ⏭️ Skipped (not sampled):', metric.name);
    return;
  }
  
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
    sampled: true,
    sampleRate: SAMPLE_RATE
  });

  // Use sendBeacon (doesn't block page unload)
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics/vitals', body);
  } else {
    fetch('/api/analytics/vitals', {
      method: 'POST',
      body,
      headers: {'Content-Type': 'application/json'},
      keepalive: true
    }).catch(err => console.warn('[Web Vitals] Send failed:', err));
  }
}

/**
 * Send to Google Analytics 4 (with sampling)
 */
function sendToGA4(metric) {
  if (!IS_SAMPLED) return;
  
  if (typeof gtag === 'function') {
    gtag('event', metric.name, {
      event_category: 'Web Vitals',
      event_label: metric.id,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      metric_rating: metric.rating,
      metric_delta: Math.round(metric.delta),
      non_interaction: true,
      // ⭐ IMPORTANT: Mark as sampled
      sample_rate: SAMPLE_RATE
    });
  }
}

/**
 * Combined reporter
 */
function reportMetric(metric) {
  console.log('[Web Vitals]', metric.name, metric.value, metric.rating);
  
  sendToAnalytics(metric);
  sendToGA4(metric);
  
  // Cloudflare Web Analytics
  if (window.__cfBeacon) {
    window.__cfBeacon.push({
      event: 'webVitals',
      data: {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        sampled: IS_SAMPLED
      }
    });
  }
}

/**
 * Track all Core Web Vitals
 */
onCLS(reportMetric);
onFID(reportMetric);
onLCP(reportMetric);
onFCP(reportMetric);
onTTFB(reportMetric);
onINP(reportMetric);

/**
 * ⚠️ CRITICAL: Rate limiting for high-traffic tools
 * Some tools might trigger many measurements
 */
let lastReportTime = {};
const REPORT_THROTTLE_MS = 5000; // Don't report same metric more than once per 5s

function reportMetricThrottled(metric) {
  const now = Date.now();
  const lastTime = lastReportTime[metric.name] || 0;
  
  if (now - lastTime < REPORT_THROTTLE_MS) {
    console.log('[Web Vitals] ⏭️ Throttled:', metric.name);
    return;
  }
  
  lastReportTime[metric.name] = now;
  reportMetric(metric);
}

/**
 * Additional Performance Tracking (sampled)
 */
function trackAdditionalMetrics() {
  if (!IS_SAMPLED) return;
  
  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = performance.timing;
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
      const connectTime = perfData.responseEnd - perfData.requestStart;
      const renderTime = perfData.domComplete - perfData.domLoading;
      
      console.log('[Performance]', {
        pageLoadTime: `${pageLoadTime}ms`,
        connectTime: `${connectTime}ms`,
        renderTime: `${renderTime}ms`
      });
      
      if (typeof gtag === 'function') {
        gtag('event', 'page_performance', {
          page_load_time: pageLoadTime,
          connect_time: connectTime,
          render_time: renderTime,
          sample_rate: SAMPLE_RATE
        });
      }
    }, 0);
  });
}

trackAdditionalMetrics();

/**
 * Device Classification (once per session)
 */
function classifyDevice() {
  const memory = navigator.deviceMemory || 4;
  const connection = navigator.connection?.effectiveType || '4g';
  const cores = navigator.hardwareConcurrency || 4;
  
  let deviceClass = 'high-end';
  
  if (memory < 4 || cores < 4 || connection === '2g' || connection === 'slow-2g') {
    deviceClass = 'low-end';
  } else if (memory < 8 || cores < 8 || connection === '3g') {
    deviceClass = 'mid-range';
  }
  
  sessionStorage.setItem('device_class', deviceClass);
  
  return deviceClass;
}

const deviceClass = classifyDevice();

// Add device class to all metrics
const originalReportMetric = reportMetric;
reportMetric = function(metric) {
  metric.deviceClass = deviceClass;
  originalReportMetric(metric);
};

/**
 * Alert for poor performance (only in dev)
 */
if (environment === 'development') {
  const originalReport = reportMetric;
  reportMetric = function(metric) {
    if (metric.rating === 'poor') {
      console.warn(`⚠️ POOR ${metric.name}:`, metric.value, metric.rating);
      
      // Show visual alert
      const alert = document.createElement('div');
      alert.style.cssText = 'position:fixed;top:10px;right:10px;background:red;color:white;padding:10px;z-index:9999;border-radius:5px;';
      alert.textContent = `⚠️ Poor ${metric.name}: ${metric.value}`;
      document.body.appendChild(alert);
      setTimeout(() => alert.remove(), 5000);
    }
    originalReport(metric);
  };
}

/**
 * Export stats for debugging
 */
window.getWebVitalsStats = () => ({
  environment,
  sampleRate: SAMPLE_RATE,
  isSampled: IS_SAMPLED,
  deviceClass,
  sessionId: sessionStorage.getItem('vitals_session_id')
});

export {
  reportMetric,
  reportMetricThrottled,
  SAMPLE_RATE,
  IS_SAMPLED,
  deviceClass
};
