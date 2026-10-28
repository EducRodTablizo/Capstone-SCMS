import { UserProfile } from '../auth/AuthContext';
import { apiClient, ApiError } from './apiClient';

export interface LoginResponse {
  statusCode: number;
  message: string;
  token?: string;
  user?: UserProfile;
  error?: string;
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      return await apiClient.post<LoginResponse>(
        '/auth/login',
        { email, password },
        { skipAuthRedirect: true }
      );
    } catch (err: any) {
      if (err instanceof ApiError) {
        return {
          statusCode: err.statusCode,
          message: err.message,
          error: err.data?.error || 'AuthError',
        };
      }
      return {
        statusCode: 500,
        message: 'Unable to connect to SCMS Authentication Service. Please check your network.',
        error: 'NetworkError',
      };
    }
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    }
  },

  async getMe(): Promise<UserProfile | null> {
    try {
      const data = await apiClient.get<{ user?: UserProfile }>('/auth/me', {
        skipAuthRedirect: true,
      });
      return data?.user || null;
    } catch {
      return null;
    }
  },
};
