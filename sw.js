const CACHE_NAME = 'mishwar-driver-v1';
const urlsToCache = [
  './index.html',
  './manifest.json'
];

self.addEventListener('install', event => {
  console.log('✅ SW installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache).catch(err => console.log('Cache error:', err)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  console.log('✅ SW activated');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('googleapis') ||
      event.request.url.includes('gstatic') ||
      event.request.url.includes('onesignal')) {
    return;
  }
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          fetch(event.request).then(fetchResponse => {
            if (fetchResponse && fetchResponse.status === 200) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, fetchResponse.clone());
              });
            }
          }).catch(() => {});
          return response;
        }
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return response;
        }).catch(() => {
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
      })
  );
});

// ====== Push Notifications ======
self.addEventListener('push', event => {
  console.log('🔔 Push received!');
  let data = {
    title: '🛵 طلب جديد',
    body: 'عندك طلب جديد في انتظارك',
    icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
    tag: 'mishwar-order-' + Date.now(),
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: './index.html',
      timestamp: Date.now()
    },
    actions: [
      { action: 'open', title: '📱 افتح التطبيق' },
      { action: 'close', title: '✖️ إغلاق' }
    ]
  };
  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text() || data.body;
    }
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      requireInteraction: data.requireInteraction,
      vibrate: data.vibrate,
      data: data.data,
      actions: data.actions,
      dir: 'rtl',
      lang: 'ar'
    })
  );
});

self.addEventListener('notificationclick', event => {
  console.log('👆 Notification clicked:', event.action);
  event.notification.close();
  if (event.action === 'close') return;
  const urlToOpen = event.notification.data?.url || './index.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes('index.html') && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

self.addEventListener('notificationclose', event => {
  console.log('❌ Notification closed');
});

self.addEventListener('message', event => {
  console.log('💬 Message from page:', event.data);
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(event.data.title || '🛵 طلب جديد', {
      body: event.data.body || 'عندك طلب جديد',
      icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
      tag: 'mishwar-' + Date.now(),
      requireInteraction: true,
      vibrate: [200, 100, 200],
      dir: 'rtl',
      lang: 'ar',
      data: { url: './index.html' }
    });
  }
});
