import { API_BASE_URL, apiFetch } from '../swr-config';

export interface SignupData {
  email: string;
  password: string;
  full_name: string;
}

export interface SigninData {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    full_name?: string;
    created_at: string;
  };
}

export const authApi = {
  signup: async (data: SignupData): Promise<AuthResponse> => {
    const res = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Signup failed');
    }
    return res.json();
  },

  signin: async (data: SigninData): Promise<AuthResponse> => {
    const res = await fetch(`${API_BASE_URL}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Signin failed');
    }
    return res.json();
  },

  getMe: async (token: string) => {
    const res = await apiFetch('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to get user');
    return res.json();
  },
};
