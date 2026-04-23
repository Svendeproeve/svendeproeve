import { API_BASE_URL } from '../swr-config';

export interface UpdateProfileData {
  full_name: string;
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
}

export const userApi = {
  updateProfile: async (
    userId: string,
    data: UpdateProfileData,
    token: string
  ): Promise<{ message: string }> => {
    const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to update profile');
    }
    return res.json();
  },

  changePassword: async (
    userId: string,
    data: ChangePasswordData,
    token: string
  ): Promise<{ message: string }> => {
    const res = await fetch(`${API_BASE_URL}/users/${userId}/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to change password');
    }
    return res.json();
  },

  deleteAccount: async (
    userId: string,
    token: string
  ): Promise<{ message: string }> => {
    const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to delete account');
    }
    return res.json();
  },
};
