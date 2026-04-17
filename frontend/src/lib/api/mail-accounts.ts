import { apiFetch } from '../swr-config';

export interface MailAccount {
  id: string;
  org_id: string;
  name: string;
  imap_host: string;
  imap_port: number;
  imap_username: string;
  use_ssl: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_use_ssl: boolean;
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
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_use_ssl: boolean;
}

export interface MailAccountUpdateData {
  name?: string;
  imap_host?: string;
  imap_port?: number;
  imap_username?: string;
  imap_password?: string;
  use_ssl?: boolean;
  smtp_host?: string;
  smtp_port?: number;
  smtp_username?: string;
  smtp_password?: string;
  smtp_use_ssl?: boolean;
}

export interface MailAccountSmtpTestData {
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_use_ssl: boolean;
}

type ImapTestData = Pick<MailAccountCreateData, 'imap_host' | 'imap_port' | 'imap_username' | 'imap_password' | 'use_ssl'>;

export const mailAccountApi = {
  list: async (orgId: string, token: string): Promise<MailAccount[]> => {
    const res = await apiFetch(`/organizations/${orgId}/mail-accounts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch mail accounts');
    return res.json();
  },

  test: async (orgId: string, data: ImapTestData, token: string): Promise<{ ok: boolean; error?: string }> => {
    const res = await apiFetch(`/organizations/${orgId}/mail-accounts/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to test IMAP connection');
    return res.json();
  },

  testSmtp: async (orgId: string, data: MailAccountSmtpTestData, token: string): Promise<{ ok: boolean; error?: string }> => {
    const res = await apiFetch(`/organizations/${orgId}/mail-accounts/test-smtp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to test SMTP connection');
    return res.json();
  },

  create: async (orgId: string, data: MailAccountCreateData, token: string): Promise<MailAccount> => {
    const res = await apiFetch(`/organizations/${orgId}/mail-accounts`, {
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
    const res = await apiFetch(`/organizations/${orgId}/mail-accounts/${mailAccountId}`, {
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

  testStatus: async (orgId: string, mailAccountId: string, token: string): Promise<{
    imap: { ok: boolean; error?: string };
    smtp: { ok: boolean; error?: string } | null;
  }> => {
    const res = await apiFetch(`/organizations/${orgId}/mail-accounts/${mailAccountId}/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch account status');
    return res.json();
  },

  delete: async (orgId: string, mailAccountId: string, token: string): Promise<void> => {
    const res = await apiFetch(`/organizations/${orgId}/mail-accounts/${mailAccountId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to delete mail account');
    }
  },
};
