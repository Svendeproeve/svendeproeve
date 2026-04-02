'use client';

import useSWR from 'swr';
import { useAuth } from './useAuth';
import { organizationApi, Organization } from '@/lib/api';

export function useOrganizations() {
  const { token, isAuthenticated } = useAuth();

  const { data: organizations, error, isLoading, mutate } = useSWR<Organization[]>(
    isAuthenticated && token ? ['organizations', token] : null,
    ([_, token]) => organizationApi.list(token),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  const hasOrganizations = organizations && organizations.length > 0;

  return {
    organizations: organizations || [],
    hasOrganizations,
    isLoading,
    error,
    mutate,
  };
}
