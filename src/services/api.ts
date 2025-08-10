
import type { ApiResponse } from '@/types';
import { supabase } from '@/integrations/supabase/client';

class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  // Retrieve the current Supabase access token for authenticated requests
  private async getAccessToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token || null;

    // Fallback to legacy custom token if present (avoids breaking existing flows)
    const legacy = token ?? localStorage.getItem('auth-token') ?? null;
    return legacy;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const token = await this.getAccessToken();

    const config: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    if (import.meta.env.DEV) {
      console.debug('[api] →', options.method || 'GET', url, { hasAuth: Boolean(token) });
    }

    const start = performance.now();
    const response = await fetch(url, { ...config, keepalive: true });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      if (import.meta.env.DEV) {
        console.error('[api] ✖', response.status, url, text);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (import.meta.env.DEV) {
      const ms = Math.round(performance.now() - start);
      console.debug('[api] ✓', url, `${ms}ms`);
    }
    return data;
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const queryString = params ? new URLSearchParams(params).toString() : '';
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // File upload
  async uploadFile<T>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.keys(additionalData).forEach(key => {
        formData.append(key, String(additionalData[key]));
      });
    }

    const token = await this.getAccessToken();
    const url = `${this.baseURL}${endpoint}`;

    if (import.meta.env.DEV) {
      console.debug('[api upload] → POST', url, { hasAuth: Boolean(token) });
    }

    const start = performance.now();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        // Do not set Content-Type for FormData; browser will set with boundary
      },
      body: formData,
      keepalive: true,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      if (import.meta.env.DEV) {
        console.error('[api upload] ✖', response.status, url, text);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (import.meta.env.DEV) {
      const ms = Math.round(performance.now() - start);
      console.debug('[api upload] ✓', url, `${ms}ms`);
    }
    return data;
  }
}

export const apiClient = new ApiClient();

// Specific API services
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    apiClient.post('/auth/login', credentials),
  register: (data: { email: string; password: string; name: string }) =>
    apiClient.post('/auth/register', data),
  logout: () => apiClient.post('/auth/logout'),
  refreshToken: () => apiClient.post('/auth/refresh'),
  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    apiClient.post('/auth/reset-password', { token, password }),
};

export const userApi = {
  getProfile: () => apiClient.get('/user/profile'),
  updateProfile: (data: any) => apiClient.put('/user/profile', data),
  getUsers: (params?: any) => apiClient.get('/users', params),
  uploadAvatar: (file: File) => apiClient.uploadFile('/user/avatar', file),
};
