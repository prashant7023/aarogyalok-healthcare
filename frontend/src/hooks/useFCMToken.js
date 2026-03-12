/**
 * hooks/useFCMToken.js
 *
 * Requests notification permission, gets an FCM registration token,
 * sends it to the backend to store against the current user, and
 * listens for foreground messages (tab is open).
 *
 * Call this once from AppLayout or a top-level component.
 */
import { useEffect } from 'react';
import { messaging, getToken, onMessage } from '../lib/firebase';
import useAuthStore from '../features/auth/authStore';
import api from '../shared/utils/api';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export function useFCMToken() {
    const { token: authToken, user } = useAuthStore();

    useEffect(() => {
        if (!authToken || !user || !messaging) return;

        async function registerToken() {
            try {
                if (!VAPID_KEY || VAPID_KEY === 'YOUR_VAPID_KEY_HERE') {
                    console.error('[FCM] VITE_FIREBASE_VAPID_KEY is not set in .env — go to Firebase Console → Project Settings → Cloud Messaging → Web Push certificates.');
                    return;
                }

                if (!('serviceWorker' in navigator)) {
                    console.warn('[FCM] Service workers not supported in this browser.');
                    return;
                }

                // Register the service worker, then wait for it to become active.
                // navigator.serviceWorker.ready resolves with the ACTIVE registration —
                // getToken() requires an active SW, not an installing/waiting one.
                await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                const swReg = await navigator.serviceWorker.ready;

                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    console.warn('[FCM] Notification permission denied.');
                    return;
                }

                const fcmToken = await getToken(messaging, {
                    vapidKey: VAPID_KEY,
                    serviceWorkerRegistration: swReg,
                });

                if (!fcmToken) {
                    console.error('[FCM] No registration token received — check VAPID key and Firebase project config.');
                    return;
                }

                console.log('[FCM] Token registered:', fcmToken);

                // Send token to backend to store against the user
                const saveRes = await api.put('/auth/fcm-token', { fcmToken });
                console.log(`[FCM] Token saved to backend. DB token count: ${saveRes.data.tokenCount}`);

            } catch (err) {
                console.error('[FCM] Token registration failed:', err.message, err);
            }
        }

        registerToken();

        // Foreground message handler — when tab is open FCM delivers here, NOT to the SW.
        // We must manually show the OS notification ourselves.
        const unsubscribe = onMessage(messaging, (payload) => {
            console.log('[FCM] Foreground message:', payload);
            const data  = payload.data         || {};
            const notif = payload.notification || {};
            // FCM sends title/body in both notification and data fields
            const title = data.title || notif.title || '💊 Medication Reminder';
            const body  = data.body  || notif.body  || `Time to take ${data.medicineName || 'your medication'}`;

            if (Notification.permission === 'granted') {
                navigator.serviceWorker.ready
                    .then((reg) => reg.showNotification(title, {
                        body,
                        // No icon: avoids 404 causing silent failure
                        tag: data.reminderId || 'med-reminder',
                        requireInteraction: true,
                        data,
                    }))
                    .catch((err) => console.error('[FCM] showNotification failed:', err));
            }
        });

        return () => unsubscribe();
    }, [authToken, user]);
}
