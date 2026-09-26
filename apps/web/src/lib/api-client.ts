/**
 * ============================================================================
 * FRONTEND HTTP API CLIENT (apiClient - Axios)
 * ============================================================================
 * WHAT:
 *   Configured Axios HTTP client for communicating with the NestJS API Gateway
 *   (`NEXT_PUBLIC_API_URL`, default `http://localhost:3001/api`).
 *   - Request Interceptor: Automatically injects Bearer JWT from `authStore` or localStorage.
 *   - Response Interceptor: Unwraps `response.data` and handles 401 Unauthorized
 *     by clearing state and showing a toast notification.
 *
 * WHY:
 *   Standardizes API communication, authorization header injection, and global
 *   error handling across all React components and custom SWR/React Query hooks.
 * ============================================================================
 */

import axios from 'axios';
import { useAuthStore } from './store/authStore';
import { useNotificationStore } from './store/notificationStore';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token =
      useAuthStore.getState().accessToken ||
      (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.error?.message || error.message || 'An unexpected error occurred';

    if (status === 401) {
      useAuthStore.getState().clearAuth();
    }

    useNotificationStore.getState().addToast({
      type: 'error',
      title: status ? `Error (${status})` : 'Network Error',
      message,
    });

    return Promise.reject(error);
  }
);
