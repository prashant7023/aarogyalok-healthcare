import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../../shared/utils/api';

const useAuthStore = create(
    persist(
        (set) => ({
            user: null,
            token: null,

            login: async (email, password) => {
                const res = await api.post('/auth/login', { email, password });
                const { user, token } = res.data.data;
                set({ user, token });
            },

            register: async (name, email, password, role) => {
                const res = await api.post('/auth/register', { name, email, password, role });
                const { user, token } = res.data.data;
                set({ user, token });
            },

            logout: () => set({ user: null, token: null }),
        }),
        { name: 'auth-store' }
    )
);

export default useAuthStore;
