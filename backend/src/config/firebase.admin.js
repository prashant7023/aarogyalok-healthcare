/**
 * config/firebase.admin.js
 *
 * Initialises Firebase Admin SDK for server-side push notifications.
 * Reads credentials from individual FIREBASE_* env vars (no JSON file needed).
 */
const admin = require('firebase-admin');

let _messaging = null;

function initFirebaseAdmin() {
    if (admin.apps.length) return admin.apps[0];

    const {
        FIREBASE_TYPE,
        FIREBASE_PROJECT_ID,
        FIREBASE_PRIVATE_KEY_ID,
        FIREBASE_PRIVATE_KEY,
        FIREBASE_CLIENT_EMAIL,
        FIREBASE_CLIENT_ID,
        FIREBASE_CLIENT_CERT_URL,
    } = process.env;

    if (!FIREBASE_PROJECT_ID || !FIREBASE_PRIVATE_KEY || !FIREBASE_CLIENT_EMAIL) {
        console.warn('⚠️  Firebase env vars missing — push notifications disabled.');
        return null;
    }

    try {
        const serviceAccount = {
            type: FIREBASE_TYPE || 'service_account',
            project_id: FIREBASE_PROJECT_ID,
            private_key_id: FIREBASE_PRIVATE_KEY_ID,
            // dotenv stores \n as literal \\n — convert back to real newlines
            private_key: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            client_email: FIREBASE_CLIENT_EMAIL,
            client_id: FIREBASE_CLIENT_ID,
            auth_uri: 'https://accounts.google.com/o/oauth2/auth',
            token_uri: 'https://oauth2.googleapis.com/token',
            auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
            client_x509_cert_url: FIREBASE_CLIENT_CERT_URL,
            universe_domain: 'googleapis.com',
        };

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });

        console.log('✅ Firebase Admin SDK initialized');
        return admin.app();
    } catch (e) {
        console.error('❌ Firebase Admin init failed:', e.message);
        return null;
    }
}

function getFirebaseMessaging() {
    if (_messaging) return _messaging;
    const app = initFirebaseAdmin();
    if (!app) return null;
    _messaging = admin.messaging();
    return _messaging;
}

/**
 * Send a push notification to one or more FCM tokens.
 * Automatically removes invalid (expired/revoked) tokens from the user document.
 */
async function sendPushToTokens(tokens, { title, body, data = {} }, userDoc = null) {
    const msg = getFirebaseMessaging();
    if (!msg) {
        console.warn('[FCM] Firebase not initialized — skipping push.');
        return;
    }
    if (!tokens?.length) {
        console.warn('[FCM] No FCM tokens for user — push skipped.');
        return;
    }

    const dataPayload = {
        title: String(title),
        body: String(body),
        ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]))
    };

    const message = {
        // data-only payload so the SW can handle it manually
        data: dataPayload,
        // webpush.notification is required for Chrome background push to wake the service worker
        webpush: {
            headers: { Urgency: 'high' },
            notification: {
                title,
                body,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                requireInteraction: true,
                tag: data.reminderId || 'med-reminder',
            },
            fcmOptions: { link: '/' },
        },
        android: {
            notification: { title, body, icon: 'ic_launcher', sound: 'default', priority: 'high' },
            priority: 'high',
        },
        apns: {
            payload: { aps: { alert: { title, body }, sound: 'default', badge: 1 } },
        },
        tokens,
    };

    try {
        const response = await msg.sendEachForMulticast(message);
        console.log(`📲 FCM: ${response.successCount}✅ ${response.failureCount}❌`);

        // Remove stale tokens
        if (userDoc && response.failureCount > 0) {
            const stale = [];
            response.responses.forEach((r, i) => {
                if (!r.success && (
                    r.error?.code === 'messaging/registration-token-not-registered' ||
                    r.error?.code === 'messaging/invalid-registration-token'
                )) stale.push(tokens[i]);
            });
            if (stale.length) {
                userDoc.fcmTokens = userDoc.fcmTokens.filter((t) => !stale.includes(t));
                await userDoc.save();
                console.log(`🗑️  Removed ${stale.length} stale token(s)`);
            }
        }
    } catch (e) {
        console.error('[FCM] sendPushToTokens error:', e.message);
    }
}

module.exports = { initFirebaseAdmin, getFirebaseMessaging, sendPushToTokens };
