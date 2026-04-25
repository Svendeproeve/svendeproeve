import { API_BASE_URL, apiFetch } from '../swr-config';
import { AuthResponse } from './auth';

export interface OrgInvitationPreview {
  org_name: string;
  role: 'admin' | 'member';
  invited_email: string;
  invited_by_email: string;
  user_exists: boolean;
}

export interface AcceptAndRegisterData {
  full_name?: string;
  password: string;
}

export const invitationApi = {
  getPreview: async (token: string): Promise<OrgInvitationPreview> => {
    const res = await fetch(`${API_BASE_URL}/invitations/${token}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Invitation not found');
    }
    return res.json();
  },

  accept: async (token: string, authToken: string): Promise<{ message: string }> => {
    const res = await apiFetch(`/invitations/${token}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to accept invitation');
    }
    return res.json();
  },

  acceptAndRegister: async (token: string, data: AcceptAndRegisterData): Promise<AuthResponse> => {
    const res = await fetch(`${API_BASE_URL}/invitations/${token}/accept-and-register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to create account');
    }
    return res.json();
  },

  decline: async (token: string): Promise<{ message: string }> => {
    const res = await fetch(`${API_BASE_URL}/invitations/${token}`, { method: 'DELETE' });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to decline invitation');
    }
    return res.json();
  },
};
