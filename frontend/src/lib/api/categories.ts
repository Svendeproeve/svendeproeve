import { apiFetch } from '../swr-config';

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

export type EmailSeverity = 'critical' | 'non_critical';

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
  /** AI guess or user override; absent on legacy rows until set. */
  severity?: EmailSeverity | null;
  case_status: string;
  created_at: string;
  /** Mail account that received the message (IMAP poller), when known. */
  mail_account_id?: string | null;
  /** IMAP folder/mailbox (e.g. INBOX), when known. */
  mailbox?: string | null;
  mail_account_name?: string | null;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  is_outbound?: boolean;
  is_internal_note?: boolean;
}

export const categoryApi = {
  list: async (orgId: string, token: string): Promise<Category[]> => {
    const res = await apiFetch(`/organizations/${orgId}/categories`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch categories');
    return res.json();
  },

  create: async (orgId: string, data: CategoryCreateData, token: string): Promise<Category> => {
    const res = await apiFetch(`/organizations/${orgId}/categories`, {
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
    const res = await apiFetch(`/organizations/${orgId}/categories/${categoryId}`, {
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
    const res = await apiFetch(`/organizations/${orgId}/categories/${categoryId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to delete category');
    }
  },

  getMemberAccess: async (orgId: string, memberUserId: string, token: string): Promise<string[]> => {
    const res = await apiFetch(`/organizations/${orgId}/categories/members/${memberUserId}/access`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch member category access');
    const data = await res.json();
    return data.category_ids;
  },

  setMemberAccess: async (orgId: string, memberUserId: string, categoryIds: string[], token: string): Promise<void> => {
    const res = await apiFetch(`/organizations/${orgId}/categories/members/${memberUserId}/access`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ category_ids: categoryIds }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to update category access');
    }
  },

  listCategoryMembers: async (
    orgId: string,
    categoryId: string,
    token: string,
  ): Promise<{ user_id: string; user_email: string; user_full_name?: string; role: string }[]> => {
    const res = await apiFetch(
      `/organizations/${orgId}/categories/${encodeURIComponent(categoryId)}/members`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error('Failed to fetch category members');
    return res.json();
  },

  listEmails: async (orgId: string, categoryId: string, token: string): Promise<Email[]> => {
    const res = await apiFetch(`/organizations/${orgId}/emails?category_id=${encodeURIComponent(categoryId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch emails');
    return res.json();
  },
};
