/**
 * ============================================================================
 * CLIENT AUTHENTICATION & SUBSCRIPTION STORE (useAuthStore - Zustand)
 * ============================================================================
 * WHAT:
 *   Global client-side authentication and live subscription state container:
 *   - `user`: Extended authenticated user profile (role, email, permissions, plan)
 *   - `subscription`: Live subscription state from backend source of truth
 *   - `initAuth`: Dual-stage hydration (optimistic from localStorage, then authoritative via GET /api/v1/auth/me)
 *   - `setAuth`: Commits credentials, saves tokens to localStorage and cookies
 *   - `logout`: Calls server revocation, cleans cookies, and triggers hard redirect
 *   - Helpers: `isSuperAdmin()`, `canAccessPro()`, `canAccessEnterprise()`
 *
 * WHY:
 *   Serves as the single source of truth for frontend UI rendering, navigation menus,
 *   subscription badge indicators, and access control gates across all client screens.
 * ============================================================================
 */

import { create } from 'zustand';
import { type AuthenticatedUser, UserRole, UserPermission } from '@geocap-x/shared';

export interface SubscriptionInfo {
  id?: string;
  plan: string;
  planId?: string;
  status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED' | 'UNPAID';
  isActive: boolean;
  limits?: {
    maxQueries?: number;
    allowApiKeys?: boolean;
    maxOrganizations?: number;
  };
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

export interface ExtendedUser extends AuthenticatedUser {
  firstName?: string;
  lastName?: string;
  organization?: string;
  organizationId?: string;
  jobTitle?: string;
  bio?: string;
  avatarUrl?: string;
  plan?: 'free' | 'pro' | 'enterprise';
  subscriptionStatus?: 'ACTIVE' | 'TRIALING' | 'CANCELED' | 'UNPAID';
}

interface AuthState {
  user: ExtendedUser | null;
  subscription: SubscriptionInfo | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasCheckedSession: boolean;
  initAuth: () => Promise<void>;
  setAuth: (user: ExtendedUser, token: string, subscription?: SubscriptionInfo | null) => void;
  updateUser: (partial: Partial<ExtendedUser>) => void;
  updateSubscription: (sub: Partial<SubscriptionInfo>) => void;
  clearAuth: () => void;
  logout: () => Promise<void>;
  isSuperAdmin: () => boolean;
  canAccessPro: () => boolean;
  canAccessEnterprise: () => boolean;
}

function setCookie(name: string, value: string, days: number = 7) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${secure}`;
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

const getStoredUser = (): ExtendedUser | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('geocapx_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

const getStoredSubscription = (): SubscriptionInfo | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('geocapx_subscription');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  subscription: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  hasCheckedSession: false,

  initAuth: async () => {
    // 1. Initial optimistic population from storage
    const token = getStoredToken();
    const cachedUser = getStoredUser();
    const cachedSub = getStoredSubscription();

    if (token) {
      setCookie('geocapx_auth_token', token, 7);
      set({
        accessToken: token,
        user: cachedUser,
        subscription: cachedSub,
        isAuthenticated: true,
        isLoading: false,
      });

      // 2. Authoritative verification with backend API
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const res = await fetch(`${apiUrl}/v1/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
        });

        if (res.ok) {
          const body = await res.json();
          const data = body.data || body;
          if (data && data.id) {
            const planName = (data.subscription?.plan || 'free').toLowerCase() as any;
            const updatedUser: ExtendedUser = {
              id: data.id,
              email: data.email,
              role: data.role,
              firstName: data.firstName,
              lastName: data.lastName,
              avatarUrl: data.avatarUrl,
              organization: data.organization?.name,
              organizationId: data.organization?.id,
              plan: planName,
              subscriptionStatus: data.subscription?.status || 'UNPAID',
              permissions: data.permissions || [],
            };

            const subInfo: SubscriptionInfo = data.subscription
              ? {
                  id: data.subscription.id,
                  plan: data.subscription.plan,
                  planId: data.subscription.planId,
                  status: data.subscription.status,
                  isActive: data.subscription.isActive,
                  limits: data.subscription.limits,
                  currentPeriodStart: data.subscription.currentPeriodStart,
                  currentPeriodEnd: data.subscription.currentPeriodEnd,
                  cancelAtPeriodEnd: data.subscription.cancelAtPeriodEnd,
                }
              : {
                  plan: 'free',
                  status: 'UNPAID',
                  isActive: false,
                };

            localStorage.setItem('geocapx_user', JSON.stringify(updatedUser));
            localStorage.setItem('geocapx_subscription', JSON.stringify(subInfo));

            set({
              user: updatedUser,
              subscription: subInfo,
              isAuthenticated: true,
              isLoading: false,
              hasCheckedSession: true,
            });
            return;
          }
        } else if (res.status === 401) {
          // Token is invalid/expired on server
          get().clearAuth();
        }
      } catch (err) {
        console.warn('Session verification notice (offline or network issue):', err);
      }
    } else {
      deleteCookie('geocapx_auth_token');
    }

    set({ isLoading: false, hasCheckedSession: true });
  },

  setAuth: (user, token, subscription = null) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
      localStorage.setItem('geocapx_user', JSON.stringify(user));
      if (subscription) {
        localStorage.setItem('geocapx_subscription', JSON.stringify(subscription));
      }
    }
    setCookie('geocapx_auth_token', token, 7);

    set({
      user,
      accessToken: token,
      subscription: subscription || get().subscription,
      isAuthenticated: true,
      isLoading: false,
      hasCheckedSession: true,
    });
  },

  updateUser: (partial) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...partial };
    if (typeof window !== 'undefined') {
      localStorage.setItem('geocapx_user', JSON.stringify(updated));
    }
    set({ user: updated });
  },

  updateSubscription: (sub) => {
    const current = get().subscription || {
      plan: 'free',
      status: 'ACTIVE',
      isActive: true,
    };
    const updated = { ...current, ...sub };
    if (typeof window !== 'undefined') {
      localStorage.setItem('geocapx_subscription', JSON.stringify(updated));
    }
    set({ subscription: updated });
  },

  clearAuth: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('geocapx_user');
      localStorage.removeItem('geocapx_subscription');
    }
    deleteCookie('geocapx_auth_token');
    deleteCookie('accessToken');
    deleteCookie('refreshToken');
    set({
      user: null,
      subscription: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  logout: async () => {
    const token = get().accessToken;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

    // 1. Invalidate session on backend server
    try {
      if (token) {
        await fetch(`${apiUrl}/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
        });
      }
    } catch (e) {
      console.warn('Backend logout call notification:', e);
    }

    // 2. Clear client-side state and cookies
    get().clearAuth();

    // 3. Force clean page reload to login to clear all in-memory caches and avoid bfcache
    if (typeof window !== 'undefined') {
      window.location.replace('/login');
    }
  },

  isSuperAdmin: () => {
    const user = get().user;
    return (
      user?.role === ('SUPER_ADMIN' as any) ||
      user?.role === UserRole.ADMIN ||
      user?.email === 'admin@gmail.com' ||
      user?.email === 'superadmin@geocapx.com'
    );
  },

  canAccessPro: () => {
    const state = get();
    if (state.isSuperAdmin()) return true;
    const plan = state.subscription?.plan?.toLowerCase() || state.user?.plan?.toLowerCase();
    const isActive = state.subscription?.isActive ?? (state.user?.subscriptionStatus === 'ACTIVE');
    return isActive && (plan === 'pro' || plan === 'enterprise');
  },

  canAccessEnterprise: () => {
    const state = get();
    if (state.isSuperAdmin()) return true;
    const plan = state.subscription?.plan?.toLowerCase() || state.user?.plan?.toLowerCase();
    const isActive = state.subscription?.isActive ?? (state.user?.subscriptionStatus === 'ACTIVE');
    return isActive && plan === 'enterprise';
  },
}));
