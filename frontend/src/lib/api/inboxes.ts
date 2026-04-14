import { API_BASE_URL } from '../swr-config';

export interface Inbox {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  color?: string;
  mail_account_ids?: string[];
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface InboxCreateData {
  name: string;
  description?: string;
  color?: string;
  mail_account_ids?: string[];
}

export interface InboxUpdateData {
  name?: string;
  description?: string;
  color?: string;
  mail_account_ids?: string[];
}

export const inboxApi = {
  list: async (orgId: string, token: string): Promise<Inbox[]> => {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/categories`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch inboxes');
    return res.json();
  },

  create: async (orgId: string, data: InboxCreateData, token: string): Promise<Inbox> => {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to create inbox');
    }
    return res.json();
  },

  update: async (orgId: string, inboxId: string, data: InboxUpdateData, token: string): Promise<Inbox> => {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/categories/${inboxId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to update inbox');
    }
    return res.json();
  },

  delete: async (orgId: string, inboxId: string, token: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/categories/${inboxId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to delete inbox');
    }
  },

  getMemberAccess: async (orgId: string, memberUserId: string, token: string): Promise<string[]> => {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/categories/members/${memberUserId}/access`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch member inbox access');
    const data = await res.json();
    return data.category_ids;
  },

  setMemberAccess: async (orgId: string, memberUserId: string, inboxIds: string[], token: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/categories/members/${memberUserId}/access`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ category_ids: inboxIds }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to update inbox access');
    }
  },
};
