"use client";

import useSWR from "swr";
import { useAuth } from "./useAuth";
import { useOrganizations } from "./useOrganizations";
import { categoryApi, Category } from "@/lib/api";

interface UseCategoriesOptions {
  userId?: string;
  userRole?: "owner" | "admin" | "member";
}

export function useCategories(options: UseCategoriesOptions = {}) {
  const { userId, userRole } = options;
  const { token, isAuthenticated } = useAuth();
  const { currentOrg } = useOrganizations();

  const {
    data: allCategories,
    error,
    isLoading,
    mutate,
  } = useSWR<Category[]>(
    isAuthenticated && token && currentOrg
      ? ["categories", currentOrg.id, token]
      : null,
    ([, orgId, tok]: [string, string, string]) => categoryApi.list(orgId, tok),
    { revalidateOnFocus: false, revalidateOnReconnect: true },
  );

  const isMember = userRole === "member";
  const { data: accessIds, isLoading: isLoadingAccess } = useSWR<string[]>(
    isMember && isAuthenticated && token && currentOrg && userId
      ? ["category-access", currentOrg.id, userId, token]
      : null,
    ([, orgId, uid, tok]: [string, string, string, string]) =>
      categoryApi.getMemberAccess(orgId, uid, tok),
    { revalidateOnFocus: false, revalidateOnReconnect: true },
  );

  const categories = (() => {
    if (!allCategories) return [];
    if (isMember) {
      if (isLoadingAccess || accessIds === undefined) return [];
      return allCategories.filter((category) =>
        accessIds.includes(category.id),
      );
    }
    return allCategories;
  })();

  return {
    categories,
    currentOrg,
    isLoading: isLoading || (isMember && isLoadingAccess),
    error,
    mutate,
  };
}
