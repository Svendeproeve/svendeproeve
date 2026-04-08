import { API_BASE_URL } from './swr-config';

export interface SignupData {
  email: string;
  password: string;
  full_name?: string;
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

export interface OrganizationCreateData {
  name: string;
}

export interface Organization {
  id: string;
  name: string;
  owner_user_id: string;
  created_at: string;
}

export interface Member {
  user_id: string;
  user_email: string;
  user_full_name?: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
}

export interface InviteMemberData {
  email: string;
  role: 'admin' | 'member';
}

export const authApi = {
  signup: async (data: SignupData): Promise<AuthResponse> => {
    const res = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Signin failed');
    }

    return res.json();
  },

  getMe: async (token: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error('Failed to get user');
    }

    return res.json();
  },
};

export interface Inbox {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  mail_account_ids?: string[];
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface InboxCreateData {
  name: string;
  description?: string;
  mail_account_ids?: string[];
}

export interface InboxUpdateData {
  name?: string;
  description?: string;
  mail_account_ids?: string[];
}

export interface MailAccount {
  id: string;
  org_id: string;
  name: string;
  imap_host: string;
  imap_port: number;
  imap_username: string;
  use_ssl: boolean;
  created_at: string;
  updated_at: string;
}

export interface MailAccountCreateData {
  name: string;
  imap_host: string;
  imap_port: number;
  imap_username: string;
  imap_password: string;
  use_ssl: boolean;
}

export interface MailAccountUpdateData {
  name?: string;
  imap_host?: string;
  imap_port?: number;
  imap_username?: string;
  imap_password?: string;
  use_ssl?: boolean;
}

export const mailAccountApi = {
  list: async (orgId: string, token: string): Promise<MailAccount[]> => {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/mail-accounts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch mail accounts');
    return res.json();
  },

  test: async (orgId: string, data: Omit<MailAccountCreateData, 'name'>, token: string): Promise<{ ok: boolean; error?: string }> => {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/mail-accounts/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to test connection');
    return res.json();
  },

  create: async (orgId: string, data: MailAccountCreateData, token: string): Promise<MailAccount> => {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/mail-accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to create mail account');
    }
    return res.json();
  },

  update: async (orgId: string, mailAccountId: string, data: MailAccountUpdateData, token: string): Promise<MailAccount> => {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/mail-accounts/${mailAccountId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to update mail account');
    }
    return res.json();
  },

  delete: async (orgId: string, mailAccountId: string, token: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/mail-accounts/${mailAccountId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to delete mail account');
    }
  },
};

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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ category_ids: inboxIds }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to update inbox access');
    }
  },
};

export const organizationApi = {
  create: async (data: OrganizationCreateData, token: string): Promise<Organization> => {
    const res = await fetch(`${API_BASE_URL}/organizations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to create organization');
    }

    return res.json();
  },

  list: async (token: string): Promise<Organization[]> => {
    const res = await fetch(`${API_BASE_URL}/organizations`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch organizations');
    }

    return res.json();
  },

  listMembers: async (orgId: string, token: string): Promise<Member[]> => {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/members`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch members');
    }

    return res.json();
  },

  inviteMember: async (orgId: string, data: InviteMemberData, token: string): Promise<Member> => {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/members/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to invite member');
    }

    return res.json();
  },
};
