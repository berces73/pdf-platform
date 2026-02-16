/**
 * Core Web Vitals Monitoring
 * Real User Metrics (RUM) tracking
 * Version: 3.0.0
 */

/**
 * Method 1: Using web-vitals library (Recommended)
 * npm install web-vitals
 */

import {onCLS, onFID, onLCP, onFCP, onTTFB, onINP} from 'web-vitals';

// Send to analytics endpoint
function sendToAnalytics(metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: Date.now()
  });

  // Use sendBeacon if available (doesn't block page unload)
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics/vitals', body);
  } else {
    // Fallback to fetch
    fetch('/api/analytics/vitals', {
      method: 'POST',
      body,
      headers: {'Content-Type': 'application/json'},
      keepalive: true
    });
  }
}

// Send to Google Analytics 4
function sendToGA4(metric) {
  if (typeof gtag === 'function') {
    gtag('event', metric.name, {
      event_category: 'Web Vitals',
      event_label: metric.id,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      metric_rating: metric.rating,
      non_interaction: true
    });
  }
}

// Combined sender
function reportMetric(metric) {
  console.log('[Web Vitals]', metric.name, metric.value, metric.rating);
  
  // Send to both endpoints
  sendToAnalytics(metric);
  sendToGA4(metric);
  
  // Send to Cloudflare Web Analytics (if available)
  if (window.__cfBeacon) {
    window.__cfBeacon.push({
      event: 'webVitals',
      data: {
        name: metric.name,
        value: metric.value,
        rating: metric.rating
      }
    });
  }
}

// Track all Core Web Vitals
onCLS(reportMetric);
onFID(reportMetric);
onLCP(reportMetric);
onFCP(reportMetric);
onTTFB(reportMetric);
onINP(reportMetric); // New: Interaction to Next Paint

/**
 * Method 2: Native Performance Observer (No dependencies)
 */

function initWebVitalsMonitoring() {
  // Largest Contentful Paint (LCP)
  if ('PerformanceObserver' in window) {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      const metric = {
        name: 'LCP',
        value: lastEntry.renderTime || lastEntry.loadTime,
        rating: getRating('LCP', lastEntry.renderTime || lastEntry.loadTime),
        element: lastEntry.element
      };
      
      reportMetric(metric);
    });
    
    lcpObserver.observe({type: 'largest-contentful-paint', buffered: true});
  }

  // First Input Delay (FID)
  if ('PerformanceObserver' in window) {
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const metric = {
          name: 'FID',
          value: entry.processingStart - entry.startTime,
          rating: getRating('FID', entry.processingStart - entry.startTime),
          target: entry.target
        };
        
        reportMetric(metric);
      });
    });
    
    fidObserver.observe({type: 'first-input', buffered: true});
  }

  // Cumulative Layout Shift (CLS)
  let clsValue = 0;
  let clsEntries = [];
  
  if ('PerformanceObserver' in window) {
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          clsEntries.push(entry);
        }
      });
    });
    
    clsObserver.observe({type: 'layout-shift', buffered: true});
    
    // Report CLS on page unload
    addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        const metric = {
          name: 'CLS',
          value: clsValue,
          rating: getRating('CLS', clsValue),
          entries: clsEntries
        };
        
        reportMetric(metric);
      }
    });
  }

  // First Contentful Paint (FCP)
  if ('PerformanceObserver' in window) {
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
      
      if (fcpEntry) {
        const metric = {
          name: 'FCP',
          value: fcpEntry.startTime,
          rating: getRating('FCP', fcpEntry.startTime)
        };
        
        reportMetric(metric);
      }
    });
    
    fcpObserver.observe({type: 'paint', buffered: true});
  }

  // Time to First Byte (TTFB)
  if ('performance' in window && 'navigation' in performance) {
    const navigationEntry = performance.getEntriesByType('navigation')[0];
    if (navigationEntry) {
      const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
      
      const metric = {
        name: 'TTFB',
        value: ttfb,
        rating: getRating('TTFB', ttfb)
      };
      
      reportMetric(metric);
    }
  }
}

/**
 * Rating helper (Good/Needs Improvement/Poor)
 */
function getRating(metric, value) {
  const thresholds = {
    LCP: [2500, 4000],      // Good: ≤2.5s, Poor: >4s
    FID: [100, 300],         // Good: ≤100ms, Poor: >300ms
    CLS: [0.1, 0.25],        // Good: ≤0.1, Poor: >0.25
    FCP: [1800, 3000],       // Good: ≤1.8s, Poor: >3s
    TTFB: [800, 1800],       // Good: ≤800ms, Poor: >1.8s
    INP: [200, 500]          // Good: ≤200ms, Poor: >500ms
  };

  const [good, poor] = thresholds[metric] || [0, 0];
  
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Additional Performance Metrics
 */
function trackAdditionalMetrics() {
  // Page Load Time
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
      
      // Send to analytics
      if (typeof gtag === 'function') {
        gtag('event', 'page_performance', {
          page_load_time: pageLoadTime,
          connect_time: connectTime,
          render_time: renderTime
        });
      }
    }, 0);
  });
  
  // Resource Loading Times
  if ('PerformanceObserver' in window) {
    const resourceObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.duration > 1000) { // Slow resources (>1s)
          console.warn('[Slow Resource]', entry.name, `${entry.duration}ms`);
          
          // Track slow resources
          if (typeof gtag === 'function') {
            gtag('event', 'slow_resource', {
              resource_url: entry.name,
              duration: Math.round(entry.duration),
              resource_type: entry.initiatorType
            });
          }
        }
      });
    });
    
    resourceObserver.observe({type: 'resource', buffered: true});
  }
}

/**
 * Device & Network Information
 */
function trackDeviceInfo() {
  const deviceInfo = {
    screenResolution: `${screen.width}x${screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    devicePixelRatio: window.devicePixelRatio,
    colorDepth: screen.colorDepth,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: navigator.deviceMemory || 'unknown',
    connectionType: navigator.connection?.effectiveType || 'unknown',
    saveData: navigator.connection?.saveData || false
  };
  
  console.log('[Device Info]', deviceInfo);
  
  // Warn if low-end device
  if (navigator.deviceMemory && navigator.deviceMemory < 4) {
    console.warn('[Performance] Low-end device detected. Consider serving lighter assets.');
  }
  
  // Warn if slow connection
  if (navigator.connection?.effectiveType === 'slow-2g' || 
      navigator.connection?.effectiveType === '2g') {
    console.warn('[Performance] Slow connection detected. Consider reducing asset sizes.');
  }
}

/**
 * Visual Stability Tracking
 */
function trackLayoutShifts() {
  let layoutShifts = [];
  
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (!entry.hadRecentInput) {
          layoutShifts.push({
            time: entry.startTime,
            value: entry.value,
            sources: entry.sources?.map(s => ({
              node: s.node,
              previousRect: s.previousRect,
              currentRect: s.currentRect
            }))
          });
          
          // Log significant shifts
          if (entry.value > 0.1) {
            console.warn('[Layout Shift]', entry.value, entry.sources);
          }
        }
      });
    });
    
    observer.observe({type: 'layout-shift', buffered: true});
    
    // Report summary on page hide
    addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && layoutShifts.length > 0) {
        const totalShift = layoutShifts.reduce((sum, shift) => sum + shift.value, 0);
        console.log('[Layout Shifts Summary]', {
          total: totalShift,
          count: layoutShifts.length,
          shifts: layoutShifts
        });
      }
    });
  }
}

/**
 * Initialize all monitoring
 */
function initPerformanceMonitoring() {
  // Core Web Vitals
  initWebVitalsMonitoring();
  
  // Additional metrics
  trackAdditionalMetrics();
  
  // Device info
  trackDeviceInfo();
  
  // Layout shifts
  trackLayoutShifts();
  
  console.log('[Performance Monitoring] Initialized ✅');
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPerformanceMonitoring);
} else {
  initPerformanceMonitoring();
}

/**
 * HTML Integration
 */
/*
<!-- Add to <head> -->
<script type="module">
  import {onCLS, onFID, onLCP} from 'https://unpkg.com/web-vitals@3?module';
  
  function sendToAnalytics(metric) {
    const body = JSON.stringify(metric);
    navigator.sendBeacon('/api/analytics/vitals', body);
  }
  
  onCLS(sendToAnalytics);
  onFID(sendToAnalytics);
  onLCP(sendToAnalytics);
</script>
*/

export {
  initWebVitalsMonitoring,
  initPerformanceMonitoring,
  trackAdditionalMetrics,
  trackDeviceInfo,
  trackLayoutShifts,
  reportMetric,
  getRating
};
