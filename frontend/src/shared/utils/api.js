import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Attach JWT automatically
api.interceptors.request.use((config) => {
    const stored = localStorage.getItem('auth-store');
    if (stored) {
        try {
            const { state } = JSON.parse(stored);
            if (state?.token) config.headers.Authorization = `Bearer ${state.token}`;
        } catch (_) { }
    }
    return config;
});

export default api;
