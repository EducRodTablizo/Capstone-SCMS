import { UserProfile } from '../auth/AuthContext';

const API_BASE = 'http://localhost:3001/api/v1/auth';

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
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // SCMS-001 AC3: HttpOnly session cookie
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      return data;
    } catch (err) {
      return {
        statusCode: 500,
        message: 'Unable to connect to SCMS Authentication Service. Please check your network.',
        error: 'NetworkError',
      };
    }
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE}/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
  },

  async getMe(): Promise<UserProfile | null> {
    try {
      const response = await fetch(`${API_BASE}/me`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) return null;
      const data = await response.json();
      return data.user || null;
    } catch (err) {
      return null;
    }
  },
};
