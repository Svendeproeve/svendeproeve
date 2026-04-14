'use client';

import useSWR from 'swr';
import { useAuth } from './useAuth';
import { useOrganizations } from './useOrganizations';
import { inboxApi, Inbox } from '@/lib/api';

interface UseInboxesOptions {
  userId?: string;
  userRole?: 'owner' | 'admin' | 'member';
}

export function useInboxes(options: UseInboxesOptions = {}) {
  const { userId, userRole } = options;
  const { token, isAuthenticated } = useAuth();
  const { currentOrg } = useOrganizations();

  const { data: allInboxes, error, isLoading, mutate } = useSWR<Inbox[]>(
    isAuthenticated && token && currentOrg ? ['inboxes', currentOrg.id, token] : null,
    ([, orgId, tok]: [string, string, string]) => inboxApi.list(orgId, tok),
    { revalidateOnFocus: false, revalidateOnReconnect: true }
  );

  // Fetch access list only for regular members
  const isMember = userRole === 'member';
  const { data: accessIds, isLoading: isLoadingAccess } = useSWR<string[]>(
    isMember && isAuthenticated && token && currentOrg && userId
      ? ['inbox-access', currentOrg.id, userId, token]
      : null,
    ([, orgId, uid, tok]: [string, string, string, string]) =>
      inboxApi.getMemberAccess(orgId, uid, tok),
    { revalidateOnFocus: false, revalidateOnReconnect: true }
  );

  const inboxes = (() => {
    if (!allInboxes) return [];
    if (isMember) {
      if (isLoadingAccess || accessIds === undefined) return [];
      return allInboxes.filter(inbox => accessIds.includes(inbox.id));
    }
    return allInboxes;
  })();

  return {
    inboxes,
    currentOrg,
    isLoading: isLoading || (isMember && isLoadingAccess),
    error,
    mutate,
  };
}
