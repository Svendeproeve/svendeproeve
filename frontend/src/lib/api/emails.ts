import { API_BASE_URL } from '../swr-config';

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
  getUncategorizedCount: async (orgId: string, token: string): Promise<{ count: number }> => {
    const res = await fetch(
      `${API_BASE_URL}/organizations/${orgId}/emails/uncategorized-count`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
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
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/emails/categorize`, {
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
};
