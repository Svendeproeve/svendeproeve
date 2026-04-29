import { apiFetch, API_BASE_URL } from '../swr-config';

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
  invitation_status?: string;
}

export interface InviteMemberData {
  email: string;
  role: 'admin' | 'member';
}

export interface InviteDetail {
  org_name: string;
  invited_by_email: string;
  is_expired: boolean;
  already_responded: boolean;
}

export const organizationApi = {
  create: async (data: OrganizationCreateData, token: string): Promise<Organization> => {
    const res = await apiFetch('/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to create organization');
    }
    return res.json();
  },

  list: async (token: string): Promise<Organization[]> => {
    const res = await apiFetch('/organizations', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch organizations');
    return res.json();
  },

  listAll: async (token: string): Promise<Organization[]> => {
    const res = await apiFetch('/admin/organizations', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch all organizations');
    return res.json();
  },

  listMembers: async (orgId: string, token: string): Promise<Member[]> => {
    const res = await apiFetch(`/organizations/${orgId}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch members');
    return res.json();
  },

  updateMemberRole: async (orgId: string, userId: string, role: 'admin' | 'member', token: string): Promise<Member> => {
    const res = await apiFetch(`/organizations/${orgId}/members/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to update role');
    }
    return res.json();
  },

  removeMember: async (orgId: string, userId: string, token: string): Promise<void> => {
    const res = await apiFetch(`/organizations/${orgId}/members/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to remove member');
    }
  },

  inviteMember: async (orgId: string, data: InviteMemberData, token: string): Promise<Member> => {
    const res = await apiFetch(`/organizations/${orgId}/members/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to invite member');
    }
    return res.json();
  },

  leaveOrganization: async (orgId: string, token: string): Promise<void> => {
    const res = await apiFetch(`/organizations/${orgId}/leave`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to leave organization');
    }
  },
};

export const inviteApi = {
  getDetails: async (inviteToken: string): Promise<InviteDetail> => {
    const res = await fetch(`${API_BASE_URL}/invites/${inviteToken}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Invite not found');
    }
    return res.json();
  },

  accept: async (inviteToken: string, authToken: string): Promise<void> => {
    const res = await apiFetch(`/invites/${inviteToken}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to accept invite');
    }
  },

  decline: async (inviteToken: string, authToken: string): Promise<void> => {
    const res = await apiFetch(`/invites/${inviteToken}/decline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to decline invite');
    }
  },
};
