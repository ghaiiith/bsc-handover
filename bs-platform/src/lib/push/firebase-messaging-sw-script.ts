import type { PublicFirebaseConfig } from '@/lib/push/firebase-config'
import { BRAND_FULL_NAME } from '@/lib/brand/constants'

const FIREBASE_CDN = '12.15.0'

/** Generates the FCM service worker script with Firebase config inlined synchronously. */
export function buildFirebaseMessagingSwScript(
  config: PublicFirebaseConfig
): string {
  const configJson = JSON.stringify(config)

  return `/* ${BRAND_FULL_NAME} FCM service worker */
importScripts('https://www.gstatic.com/firebasejs/${FIREBASE_CDN}/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/${FIREBASE_CDN}/firebase-messaging-compat.js');

var messaging = null;

function initMessaging(config) {
  if (!config || !config.projectId) return null;
  if (!firebase.apps.length) {
    firebase.initializeApp(config);
  }
  return firebase.messaging();
}

function showBackgroundNotification(payload) {
  var notification = payload.notification || {};
  var data = payload.data || {};
  var title = notification.title || '${BRAND_FULL_NAME}';
  return self.registration.showNotification(title, {
    body: notification.body || '',
    icon: '/logo-traced.svg',
    badge: '/logo-traced.svg',
    data: data,
  });
}

function bindMessaging(m) {
  if (!m) return;
  messaging = m;
  messaging.onBackgroundMessage(function (payload) {
    return showBackgroundNotification(payload);
  });
}

bindMessaging(initMessaging(${configJson}));

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', function (event) {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (event.data.type === 'FIREBASE_CONFIG' && event.data.config) {
    bindMessaging(initMessaging(event.data.config));
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ type: 'FIREBASE_READY' });
    }
  }

  if (event.data.type === 'PING') {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({
        type: 'PONG',
        ready: Boolean(messaging),
      });
    }
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = event.notification.data && event.notification.data.url;
  if (!url) return;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.indexOf(url) !== -1 && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
`
}
