import { SWRConfiguration } from 'swr';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

/**
 * Authenticated API fetch. If the response is 401 and the request sent a Bearer token,
 * clear the session and redirect to login (expired or invalid JWT).
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = path.startsWith('http')
    ? path
    : `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(init?.headers ?? {});
  const hadBearer = Boolean(headers.get('Authorization')?.startsWith('Bearer '));

  const res = await fetch(url, { ...init, headers });

  if (res.status === 401 && hadBearer && typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    window.location.assign('/login');
    throw new Error('Session expired');
  }

  return res;
}

export const fetcher = async (url: string) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  const res = await apiFetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!res.ok) {
    const error: any = new Error('An error occurred while fetching the data.');
    error.info = await res.json();
    error.status = res.status;
    throw error;
  }

  return res.json();
};

export const swrConfig: SWRConfiguration = {
  fetcher,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  shouldRetryOnError: false,
};
