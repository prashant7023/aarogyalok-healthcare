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
                // Register the service worker first
                const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

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
                    console.warn('[FCM] No registration token received.');
                    return;
                }

                console.log('[FCM] Token:', fcmToken);

                // Send token to backend to store against the user
                await api.put('/auth/fcm-token', { fcmToken });

            } catch (err) {
                console.error('[FCM] Token registration failed:', err.message);
            }
        }

        registerToken();

        // Foreground message handler — socket already handles this,
        // but FCM can also send data-only messages for other events
        const unsubscribe = onMessage(messaging, (payload) => {
            console.log('[FCM] Foreground message:', payload);
            // Foreground notifications are handled by ReminderToast via socket.
            // We could optionally show a browser Notification here too.
        });

        return () => unsubscribe();
    }, [authToken, user]);
}
