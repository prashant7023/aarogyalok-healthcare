/**
 * hooks/useMedicationSocket.js
 *
 * Self-contained Socket.IO hook for the medication feature.
 * - Connects to the backend with the JWT token from auth store
 * - Joins the user's personal room (server-side via JWT middleware)
 * - Listens for `medication-reminder` events and calls onReminder(data)
 * - Cleans up on unmount
 *
 * NOT imported anywhere in App.jsx / main.jsx — called only from MedicationPage.
 */
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '../../auth/authStore';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export function useMedicationSocket({ onReminder }) {
    const token = useAuthStore((s) => s.token);
    const socketRef = useRef(null);

    useEffect(() => {
        if (!token) return;

        // Connect with JWT so server auto-joins us to `user-{userId}` room
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

        socket.on('medication-reminder', (data) => {
            console.log('[MedSocket] Reminder received:', data);
            if (onReminder) onReminder(data);
        });

        socket.on('connect_error', (err) => {
            console.warn('[MedSocket] Connection error:', err.message);
        });

        // Cleanup on unmount or token change
        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

    return socketRef;
}
