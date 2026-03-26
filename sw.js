// --- SERVICE WORKER FOR CLASS WEBSITE (PWA) ---
const CACHE_NAME = 'classweb-cache-v3'; // Version increment for updates
const FILES_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './Images/icon-192.png',
    './Images/icon-512.png',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// 1. INSTALLATION - Pre-caching core files
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Install');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Pre-caching offline pages');
                return cache.addAll(FILES_TO_CACHE);
            })
            .catch(error => {
                console.error('[Service Worker] Pre-caching failed:', error);
            })
    );
    self.skipWaiting(); // Make sure new SW takes over immediately
});

// 2. ACTIVATION - New cache version management
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activate');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Removing old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim(); // Immediately start controlling all pages
});

// 3. FETCH - Hybrid Strategy: Network with Cache Fallback
// This strategy ensures users always get the latest content from Google Sheets,
// but the PWA framework itself loads from cache for speed.
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return; // Only cache GET requests

    event.respondWith(
        // Always try the network first
        fetch(event.request)
            .then((response) => {
                // We have a successful network response
                // Clone it to put it in the cache while also sending it to the client
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => {
                // Network failed (we are offline) - try to serve from cache
                console.log('[Service Worker] Servicing from cache (offline):', event.request.url);
                return caches.match(event.request);
            })
    );
});

// 4. PUSH NOTIFICATIONS
self.addEventListener('push', (event) => {
    let data = { title: 'Class Website Update', body: 'New notification!' };

    if (event.data) {
        try {
            data = event.data.json();
        } catch (err) {
            console.warn('Push event with non-JSON data:', event.data.text());
            data = { title: 'Notification', body: event.data.text() };
        }
    }

    const options = {
        body: data.body,
        icon: 'Images/icon-192.png',
        badge: 'Images/icon-192.png',
        data: data.url || './index.html' // URL to open on click
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// 5. NOTIFICATION CLICK HANDLING
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    // Default to the main page if no specific URL is provided in the push data
    const urlToOpen = event.notification.data || './index.html';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // If the app is already open, focus that window
                for (const client of clientList) {
                    if (client.url.includes(urlToOpen) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // If not open, open a new window
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});
