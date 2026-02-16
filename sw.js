/**
 * PDF Platform - Advanced Service Worker
 * Version: 2.1.0
 * Features: Offline support, Smart caching, Background sync
 */

const CACHE_VERSION = 'v2.1.0';
const CACHE_NAME = `pdf-platform-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;

// Critical assets to precache
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png',
  '/assets/logo.svg'
];

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only'
};

/**
 * Install Event - Precache critical assets
 */
self.addEventListener('install', event => {
  console.log('[SW] Installing version:', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Precaching critical assets');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Installation complete');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

/**
 * Activate Event - Clean old caches
 */
self.addEventListener('activate', event => {
  console.log('[SW] Activating version:', CACHE_VERSION);
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => {
              return name.startsWith('pdf-platform-') && name !== CACHE_NAME ||
                     name.startsWith('runtime-') && name !== RUNTIME_CACHE ||
                     name.startsWith('images-') && name !== IMAGE_CACHE;
            })
            .map(name => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        return self.clients.claim();
      })
  );
});

/**
 * Fetch Event - Serve from cache or network based on strategy
 */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;
  
  // Skip tracking/analytics requests
  if (url.hostname.includes('analytics') || 
      url.hostname.includes('googletagmanager')) {
    return;
  }
  
  // Determine strategy based on request
  let strategy = determineStrategy(request, url);
  
  event.respondWith(handleRequest(request, strategy));
});

/**
 * Determine caching strategy based on request
 */
function determineStrategy(request, url) {
  // API requests - network first
  if (url.pathname.startsWith('/api/')) {
    return CACHE_STRATEGIES.NETWORK_FIRST;
  }
  
  // Images - cache first with image cache
  if (request.destination === 'image') {
    return CACHE_STRATEGIES.CACHE_FIRST;
  }
  
  // Static assets - cache first
  if (request.destination === 'style' || 
      request.destination === 'script' || 
      request.destination === 'font') {
    return CACHE_STRATEGIES.CACHE_FIRST;
  }
  
  // Documents/HTML - network first
  if (request.destination === 'document') {
    return CACHE_STRATEGIES.NETWORK_FIRST;
  }
  
  // Default - stale while revalidate
  return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
}

/**
 * Handle Request with appropriate strategy
 */
async function handleRequest(request, strategy) {
  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return cacheFirst(request);
    
    case CACHE_STRATEGIES.NETWORK_FIRST:
      return networkFirst(request);
    
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request);
    
    case CACHE_STRATEGIES.NETWORK_ONLY:
      return fetch(request);
    
    default:
      return networkFirst(request);
  }
}

/**
 * Cache First Strategy
 * Try cache first, fallback to network
 */
async function cacheFirst(request) {
  const cacheName = request.destination === 'image' ? IMAGE_CACHE : CACHE_NAME;
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Cache first failed:', error);
    
    // Return offline fallback if available
    if (request.destination === 'document') {
      const offlinePage = await cache.match('/offline.html');
      if (offlinePage) return offlinePage;
    }
    
    return new Response('Offline - Asset not available', { 
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

/**
 * Network First Strategy
 * Try network first, fallback to cache
 */
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      // Don't cache if it's a tracking request
      const url = new URL(request.url);
      if (!url.search.includes('utm_') && 
          !url.search.includes('fbclid') && 
          !url.search.includes('gclid')) {
        cache.put(request, response.clone());
      }
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Network first failed, trying cache:', error);
    
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    // Return offline page for documents
    if (request.destination === 'document') {
      const offlinePage = await caches.open(CACHE_NAME);
      const offline = await offlinePage.match('/offline.html');
      if (offline) return offline;
    }
    
    return new Response('Offline', { 
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

/**
 * Stale While Revalidate Strategy
 * Return cache immediately, update cache in background
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(error => {
    console.error('[SW] Stale while revalidate update failed:', error);
    return cached;
  });
  
  return cached || fetchPromise;
}

/**
 * Background Sync - Queue failed requests
 */
self.addEventListener('sync', event => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-analytics') {
    event.waitUntil(syncAnalytics());
  }
});

async function syncAnalytics() {
  console.log('[SW] Syncing analytics data...');
  // Placeholder for analytics sync logic
  // Can be implemented to sync offline analytics
}

/**
 * Push Notifications (Future Enhancement)
 */
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'Yeni özellikler ve güncellemeler mevcut!',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'general-notification',
    requireInteraction: false,
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now()
    },
    actions: [
      {
        action: 'open',
        title: 'Aç'
      },
      {
        action: 'close',
        title: 'Kapat'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(
      data.title || 'PDF Platform',
      options
    )
  );
});

/**
 * Notification Click Handler
 */
self.addEventListener('notificationclick', event => {
  const notification = event.notification;
  const action = event.action;
  
  notification.close();
  
  if (action === 'close') {
    return;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUnmerged: true })
      .then(clientList => {
        // Check if there's already a window open
        for (let client of clientList) {
          if (client.url === notification.data.url && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(notification.data.url);
        }
      })
  );
});

/**
 * Message Handler - Communication with main thread
 */
self.addEventListener('message', event => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(RUNTIME_CACHE)
        .then(cache => cache.addAll(event.data.urls))
    );
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(names => {
        return Promise.all(
          names.map(name => caches.delete(name))
        );
      })
    );
  }
});

/**
 * Cache Size Management - Prevent cache overflow
 */
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    await limitCacheSize(cacheName, maxItems);
  }
}

// Periodically clean up caches
setInterval(() => {
  limitCacheSize(IMAGE_CACHE, 100);
  limitCacheSize(RUNTIME_CACHE, 50);
}, 3600000); // Every hour

console.log('[SW] Service Worker loaded successfully');
