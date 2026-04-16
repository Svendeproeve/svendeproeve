import { apiFetch } from '../swr-config';
import type { Email, EmailSeverity } from './categories';

export type { EmailSeverity };

export interface CategorizeEmailsPayload {
  limit?: number;
  force?: boolean;
}

export interface CategorizeEmailsResult {
  processed: number;
  categorized: number;
  uncategorised: number;
  skipped: number;
}

export const emailsApi = {
  /** Emails in one thread for a category, oldest first (requires category_id on the API). */
  listThreadEmails: async (
    orgId: string,
    categoryId: string,
    threadId: string,
    token: string
  ): Promise<Email[]> => {
    const params = new URLSearchParams({
      category_id: categoryId,
      thread_id: threadId,
    });
    const res = await apiFetch(`/organizations/${orgId}/emails?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch thread emails');
    }
    return res.json();
  },

  getUncategorizedCount: async (orgId: string, token: string): Promise<{ count: number }> => {
    const res = await apiFetch(`/organizations/${orgId}/emails/uncategorized-count`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch uncategorized count');
    }
    return res.json();
  },

  categorize: async (
    orgId: string,
    payload: CategorizeEmailsPayload,
    token: string
  ): Promise<CategorizeEmailsResult> => {
    const res = await apiFetch(`/organizations/${orgId}/emails/categorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        limit: payload.limit ?? 500,
        force: payload.force ?? false,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to categorize emails');
    }
    return res.json();
  },

  patchSeverity: async (
    orgId: string,
    emailId: string,
    severity: EmailSeverity,
    token: string
  ): Promise<Email> => {
    const res = await apiFetch(
      `/organizations/${orgId}/emails/${encodeURIComponent(emailId)}/severity`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ severity }),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update severity');
    }
    return res.json();
  },

  updateThreadStatus: async (
    orgId: string,
    threadId: string,
    status: 'open' | 'closed' | 'waiting_for_customer',
    token: string,
  ): Promise<{ status: string }> => {
    const res = await apiFetch(
      `/organizations/${orgId}/emails/threads/${encodeURIComponent(threadId)}/status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update thread status');
    }
    return res.json();
  },

  assignThread: async (
    orgId: string,
    threadId: string,
    assignedTo: string | null,
    token: string,
  ): Promise<{ assigned_to: string | null; assigned_to_name: string | null }> => {
    const res = await apiFetch(
      `/organizations/${orgId}/emails/threads/${encodeURIComponent(threadId)}/assign`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ assigned_to: assignedTo }),
      },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to assign thread');
    }
    return res.json();
  },

  updateThreadCategory: async (
    orgId: string,
    threadId: string,
    categoryId: string,
    token: string,
  ): Promise<{ thread_id: string; category_id: string; updated: string }> => {
    const res = await apiFetch(
      `/organizations/${orgId}/emails/threads/${encodeURIComponent(threadId)}/category`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ category_id: categoryId }),
      },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update thread category');
    }
    return res.json();
  },
};
