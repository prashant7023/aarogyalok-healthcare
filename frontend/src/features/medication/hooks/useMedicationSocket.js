/**
 * hooks/useMedicationSocket.js
 *
 * FIX: Uses a ref for `onReminder` so the socket listener always calls
 * the latest version of the callback — avoids stale closure causing
 * 2nd+ notifications to be silently dropped.
 */
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '../../auth/authStore';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export function useMedicationSocket({ onReminder }) {
    const token = useAuthStore((s) => s.token);
    const socketRef = useRef(null);

    // ✅ FIX: Keep a ref that always points to the latest onReminder callback.
    // The socket listener reads from the ref, so it never goes stale even when
    // the parent re-renders and passes a new function reference.
    const onReminderRef = useRef(onReminder);
    useEffect(() => {
        onReminderRef.current = onReminder;
    }, [onReminder]);

    useEffect(() => {
        if (!token) return;

        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[MedSocket] Connected:', socket.id);
        });

        // Always reads the latest callback via ref — never stale
        socket.on('medication-reminder', (data) => {
            console.log('[MedSocket] Reminder received:', data);
            if (onReminderRef.current) onReminderRef.current(data);
        });

        socket.on('connect_error', (err) => {
            console.warn('[MedSocket] Connection error:', err.message);
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [token]);

    return socketRef;
}
