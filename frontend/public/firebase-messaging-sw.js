/**
 * firebase-messaging-sw.js
 *
 * Firebase Cloud Messaging Service Worker — MUST live in /public so it is
 * served from the root path (/firebase-messaging-sw.js).
 *
 * Handles background push notifications when the tab is closed/hidden.
 */

// Use the compat library inside service workers (importScripts style)
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Firebase config — must be hardcoded here as env vars are not available in SWs
firebase.initializeApp({
    apiKey: 'AIzaSyAbRE532r8yIoaA8MFUEnO4JmT0u4tvjxY',
    authDomain: 'healthcare-3f705.firebaseapp.com',
    projectId: 'healthcare-3f705',
    storageBucket: 'healthcare-3f705.firebasestorage.app',
    messagingSenderId: '46868697500',
    appId: '1:46868697500:web:e92015d2ed2f82fe2c7859',
    measurementId: 'G-F0EH301NF4',
});

const messaging = firebase.messaging();

// Background message handler — fires when app is not in foreground
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message received:', payload);

    const data = payload.data || {};
    const title = data.title || '💊 Medication Reminder';
    const body = data.body || `Time to take ${data.medicineName || 'your medication'}`;

    self.registration.showNotification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: data.reminderId || 'med-reminder',
        requireInteraction: true, // stays visible until user interacts
        actions: [
            { action: 'taken', title: '✅ Taken' },
            { action: 'snooze', title: '⏰ Snooze 5 min' },
        ],
        data: data,
    });
});

// Handle notification click (Taken / Snooze actions)
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'taken' || event.action === 'snooze') {
        const data = event.notification.data || {};
        const action = event.action;
        // Open the app and pass action in URL query
        event.waitUntil(
            clients.openWindow(`/?reminder=${data.reminderId}&action=${action}`)
        );
    } else {
        // Default click — just open the app
        event.waitUntil(clients.openWindow('/'));
    }
});
