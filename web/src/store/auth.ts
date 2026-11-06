import { create } from 'zustand';
import { api } from '@/lib/api';
import type { MenuNode, UserMe } from '@/lib/types';

type AuthState = {
  token: string | null;
  user: UserMe | null;
  menus: MenuNode[];
  loading: boolean;
  setToken: (token: string | null) => void;
  logout: () => void;
  login: (payload: { username: string; password: string }) => Promise<void>;
  bootstrap: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: typeof window === 'undefined' ? null : localStorage.getItem('token'),
  user: null,
  menus: [],
  loading: false,
  setToken: (token) => {
    set({ token });
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem('token', token);
      else localStorage.removeItem('token');
    }
  },
  logout: () => {
    get().setToken(null);
    set({ user: null, menus: [] });
  },
  login: async (payload) => {
    set({ loading: true });
    try {
      const res = await api.post('/auth/login', payload);
      const token = res.data?.accessToken ?? res.data?.token ?? null;
      if (!token) throw new Error('登录失败：未返回 token');
      get().setToken(token);
      await get().bootstrap();
    } finally {
      set({ loading: false });
    }
  },
  bootstrap: async () => {
    set({ loading: true });
    try {
      const [meRes, menuRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/admin/my-menus'),
      ]);
      set({
        user: meRes.data ?? null,
        menus: Array.isArray(menuRes.data) ? menuRes.data : [],
      });
    } finally {
      set({ loading: false });
    }
  },
}));
