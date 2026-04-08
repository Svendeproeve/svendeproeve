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
