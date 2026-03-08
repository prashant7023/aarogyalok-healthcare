/**
 * src/lib/firebase.js
 * Initialises Firebase app + Cloud Messaging for web push notifications.
 * All config values come from .env (VITE_FIREBASE_*)
 */
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Singleton — don't re-initialize on hot-reload
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

let messaging = null;
try {
    // Messaging is only available in browser contexts that support service workers
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        messaging = getMessaging(app);
    }
} catch (e) {
    console.warn('[FCM] Messaging not available:', e.message);
}

export { app, messaging, getToken, onMessage };
