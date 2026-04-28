"use client";

import useSWR from "swr";
import { useAuth } from "./useAuth";
import { organizationApi, Organization } from "@/lib/api";

const CURRENT_ORG_KEY = "current_org_id";

export function getStoredOrgId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CURRENT_ORG_KEY);
}

export function setStoredOrgId(orgId: string) {
  localStorage.setItem(CURRENT_ORG_KEY, orgId);
}

export function useOrganizations() {
  const { token, isAuthenticated, user, isLoading: authLoading } = useAuth();
  const isSuperuser = user?.is_superuser ?? false;

  const swrKey =
    isAuthenticated && token
      ? isSuperuser
        ? ["organizations-all", token]
        : ["organizations", token]
      : null;

  const {
    data: organizations,
    error,
    isLoading: orgLoading,
    mutate,
  } = useSWR<Organization[]>(
    swrKey,
    ([key, tok]: [string, string]) =>
      key === "organizations-all"
        ? organizationApi.listAll(tok)
        : organizationApi.list(tok),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    },
  );

  const orgs = organizations || [];
  const hasOrganizations = orgs.length > 0;

  const storedOrgId = getStoredOrgId();
  const currentOrg = orgs.find((o) => o.id === storedOrgId) ?? orgs[0];

  return {
    organizations: orgs,
    hasOrganizations,
    currentOrg,
    isSuperuser,
    isLoading: authLoading || orgLoading,
    error,
    mutate,
  };
}
