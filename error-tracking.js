/**
 * Error Tracking & Monitoring
 * Production-ready logging and error reporting
 * Version: 1.0.0
 */

/**
 * ============================================
 * 1. SENTRY INTEGRATION (Recommended)
 * ============================================
 */

// Install: npm install @sentry/browser
// import * as Sentry from "@sentry/browser";

function initSentry() {
  if (typeof Sentry !== 'undefined') {
    Sentry.init({
      dsn: "YOUR_SENTRY_DSN_HERE",
      environment: window.location.hostname.includes('localhost') ? 'development' : 'production',
      release: "pdf-platform@2.1.0",
      
      // Performance Monitoring
      tracesSampleRate: 0.1, // 10% of transactions
      
      // Session Replay
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      
      // Error Filtering
      beforeSend(event, hint) {
        // Filter out expected errors
        const error = hint.originalException;
        
        // Ignore ResizeObserver errors (browser quirk)
        if (error && error.message && error.message.includes('ResizeObserver')) {
          return null;
        }
        
        // Ignore network errors from ad blockers
        if (error && error.message && error.message.includes('blocked by client')) {
          return null;
        }
        
        // Add custom context
        event.contexts = event.contexts || {};
        event.contexts.custom = {
          userAgent: navigator.userAgent,
          screenResolution: `${screen.width}x${screen.height}`,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          online: navigator.onLine,
          cookiesEnabled: navigator.cookieEnabled
        };
        
        return event;
      },
      
      // Error grouping
      integrations: [
        new Sentry.BrowserTracing({
          tracingOrigins: ["domain.com", /^\//],
        }),
        new Sentry.Replay({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
    });
    
    console.log('[Sentry] Initialized ✅');
  }
}

/**
 * ============================================
 * 2. CUSTOM ERROR LOGGER (No dependencies)
 * ============================================
 */

class ErrorLogger {
  constructor(options = {}) {
    this.endpoint = options.endpoint || '/api/errors';
    this.maxQueueSize = options.maxQueueSize || 50;
    this.flushInterval = options.flushInterval || 30000; // 30 seconds
    this.queue = [];
    
    this.init();
  }
  
  init() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.log({
        type: 'error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error ? {
          name: event.error.name,
          message: event.error.message,
          stack: event.error.stack
        } : null
      });
    });
    
    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.log({
        type: 'unhandledRejection',
        reason: event.reason,
        promise: 'Promise'
      });
    });
    
    // Console errors
    const originalError = console.error;
    console.error = (...args) => {
      this.log({
        type: 'consoleError',
        message: args.join(' ')
      });
      originalError.apply(console, args);
    };
    
    // Resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.log({
          type: 'resourceError',
          tagName: event.target.tagName,
          src: event.target.src || event.target.href
        });
      }
    }, true);
    
    // Periodic flush
    setInterval(() => this.flush(), this.flushInterval);
    
    // Flush on page unload
    window.addEventListener('beforeunload', () => this.flush(true));
    
    console.log('[ErrorLogger] Initialized ✅');
  }
  
  log(error) {
    const entry = {
      ...error,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      online: navigator.onLine
    };
    
    this.queue.push(entry);
    
    // Flush if queue is full
    if (this.queue.length >= this.maxQueueSize) {
      this.flush();
    }
    
    // Log to console in development
    if (window.location.hostname === 'localhost') {
      console.error('[ErrorLogger]', entry);
    }
  }
  
  async flush(sync = false) {
    if (this.queue.length === 0) return;
    
    const errors = [...this.queue];
    this.queue = [];
    
    const body = JSON.stringify({
      errors,
      session: this.getSessionId()
    });
    
    if (sync) {
      // Use sendBeacon for synchronous flush (page unload)
      navigator.sendBeacon(this.endpoint, body);
    } else {
      // Use fetch for async flush
      try {
        await fetch(this.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true
        });
      } catch (error) {
        console.error('[ErrorLogger] Flush failed:', error);
        // Put errors back in queue
        this.queue.unshift(...errors);
      }
    }
  }
  
  getSessionId() {
    let sessionId = sessionStorage.getItem('error-logger-session');
    if (!sessionId) {
      sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('error-logger-session', sessionId);
    }
    return sessionId;
  }
}

/**
 * ============================================
 * 3. SERVICE WORKER ERROR TRACKING
 * ============================================
 */

// Add to sw.js
/*
self.addEventListener('error', (event) => {
  console.error('[SW Error]', event.error);
  
  // Send to analytics
  fetch('/api/errors/sw', {
    method: 'POST',
    body: JSON.stringify({
      type: 'sw_error',
      message: event.error.message,
      stack: event.error.stack,
      timestamp: new Date().toISOString()
    }),
    keepalive: true
  });
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW Unhandled Rejection]', event.reason);
  
  fetch('/api/errors/sw', {
    method: 'POST',
    body: JSON.stringify({
      type: 'sw_rejection',
      reason: event.reason,
      timestamp: new Date().toISOString()
    }),
    keepalive: true
  });
});
*/

/**
 * ============================================
 * 4. ANALYTICS INTEGRATION
 * ============================================
 */

function trackError(error, level = 'error') {
  // Google Analytics 4
  if (typeof gtag === 'function') {
    gtag('event', 'exception', {
      description: error.message || String(error),
      fatal: level === 'error',
      error_type: error.name || 'UnknownError'
    });
  }
  
  // Cloudflare Web Analytics
  if (window.__cfBeacon) {
    window.__cfBeacon.push({
      event: 'error',
      data: {
        message: error.message,
        level
      }
    });
  }
}

/**
 * ============================================
 * 5. PDF PROCESSING ERROR HANDLING
 * ============================================
 */

async function processPDFWithErrorHandling(file) {
  try {
    // Your PDF processing code
    const result = await processPDF(file);
    return { success: true, result };
    
  } catch (error) {
    // Categorize error
    let errorType = 'unknown';
    let userMessage = 'Bir hata oluştu. Lütfen tekrar deneyin.';
    
    if (error.message.includes('password')) {
      errorType = 'password_protected';
      userMessage = 'Bu PDF şifre korumalıdır. Lütfen şifresiz bir dosya deneyin.';
    } else if (error.message.includes('corrupt')) {
      errorType = 'corrupted_file';
      userMessage = 'Dosya bozuk görünüyor. Lütfen başka bir dosya deneyin.';
    } else if (error.message.includes('memory')) {
      errorType = 'out_of_memory';
      userMessage = 'Dosya çok büyük. Daha küçük bir dosya deneyin.';
    } else if (error.message.includes('unsupported')) {
      errorType = 'unsupported_format';
      userMessage = 'Bu PDF formatı desteklenmiyor.';
    }
    
    // Log error
    errorLogger.log({
      type: 'pdf_processing_error',
      errorType,
      fileName: file.name,
      fileSize: file.size,
      error: {
        message: error.message,
        stack: error.stack
      }
    });
    
    // Track in analytics
    trackError(error, 'error');
    
    // Return user-friendly error
    return {
      success: false,
      error: {
        type: errorType,
        message: userMessage,
        technical: error.message
      }
    };
  }
}

/**
 * ============================================
 * 6. PERFORMANCE MONITORING
 * ============================================
 */

function monitorPerformance() {
  // Long tasks
  if ('PerformanceObserver' in window) {
    const longTaskObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.duration > 50) { // Tasks longer than 50ms
          console.warn('[Long Task]', entry.duration, entry.name);
          
          errorLogger.log({
            type: 'performance_warning',
            issue: 'long_task',
            duration: entry.duration,
            name: entry.name
          });
        }
      });
    });
    
    try {
      longTaskObserver.observe({ type: 'longtask', buffered: true });
    } catch (e) {
      // longtask not supported in all browsers
    }
  }
  
  // Memory usage (Chrome only)
  if (performance.memory) {
    setInterval(() => {
      const memoryUsage = {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576),
        total: Math.round(performance.memory.totalJSHeapSize / 1048576),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
      };
      
      // Warn if using > 80% of memory
      const usage = (memoryUsage.used / memoryUsage.limit) * 100;
      if (usage > 80) {
        console.warn('[Memory Warning]', `${usage.toFixed(1)}% used`, memoryUsage);
        
        errorLogger.log({
          type: 'performance_warning',
          issue: 'high_memory',
          usage,
          memory: memoryUsage
        });
      }
    }, 30000); // Check every 30 seconds
  }
}

/**
 * ============================================
 * 7. INITIALIZATION
 * ============================================
 */

let errorLogger;

function initErrorTracking() {
  // Initialize Sentry (if available)
  initSentry();
  
  // Initialize custom error logger
  errorLogger = new ErrorLogger({
    endpoint: '/api/errors',
    maxQueueSize: 50,
    flushInterval: 30000
  });
  
  // Monitor performance
  monitorPerformance();
  
  console.log('[Error Tracking] Initialized ✅');
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initErrorTracking);
} else {
  initErrorTracking();
}

/**
 * ============================================
 * 8. SERVER-SIDE ERROR ENDPOINT (Example)
 * ============================================
 */

/*
// Cloudflare Worker example
export default {
  async fetch(request) {
    if (request.method === 'POST' && request.url.includes('/api/errors')) {
      const body = await request.json();
      
      // Log to external service (e.g., Papertrail, Loggly)
      await fetch('YOUR_LOGGING_SERVICE_URL', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          service: 'pdf-platform',
          errors: body.errors
        })
      });
      
      return new Response('OK', { status: 200 });
    }
    
    return new Response('Not Found', { status: 404 });
  }
}
*/

export {
  ErrorLogger,
  initErrorTracking,
  trackError,
  processPDFWithErrorHandling,
  monitorPerformance
};
