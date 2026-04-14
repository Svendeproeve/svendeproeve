import { API_BASE_URL } from '../swr-config';

export interface Category {
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

export interface CategoryCreateData {
  name: string;
  description?: string;
  color?: string;
  mail_account_ids?: string[];
}

export interface CategoryUpdateData {
  name?: string;
  description?: string;
  color?: string;
  mail_account_ids?: string[];
}

export interface Email {
  id: string;
  org_id: string;
  sender: string;
  to: string;
  date: string;
  subject: string;
  body: string;
  message_id: string;
  thread_id: string;
  category_id: string | null;
  case_status: string;
  created_at: string;
}

export const categoryApi = {
  list: async (orgId: string, token: string): Promise<Category[]> => {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/categories`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch categories');
    return res.json();
  },

  create: async (orgId: string, data: CategoryCreateData, token: string): Promise<Category> => {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to create category');
    }
    return res.json();
  },

  update: async (orgId: string, categoryId: string, data: CategoryUpdateData, token: string): Promise<Category> => {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/categories/${categoryId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to update category');
    }
    return res.json();
  },

  delete: async (orgId: string, categoryId: string, token: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/categories/${categoryId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to delete category');
    }
  },

  getMemberAccess: async (orgId: string, memberUserId: string, token: string): Promise<string[]> => {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/categories/members/${memberUserId}/access`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch member category access');
    const data = await res.json();
    return data.category_ids;
  },

  setMemberAccess: async (orgId: string, memberUserId: string, categoryIds: string[], token: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/categories/members/${memberUserId}/access`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ category_ids: categoryIds }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to update category access');
    }
  },

  listEmails: async (orgId: string, categoryId: string, token: string): Promise<Email[]> => {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/emails?category_id=${encodeURIComponent(categoryId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch emails');
    return res.json();
  },
};
