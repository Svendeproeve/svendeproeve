"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  CircularProgress,
  Box,
} from "@mui/material";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useCategories } from "@/hooks/useCategories";
import { organizationApi, emailsApi, Member, Email, Category } from "@/lib/api";
import { CaseStatusChip, SeverityChip } from "@/lib/email-status-chips";
import useSWR from "swr";

function formatDate(raw: string): string {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function categoryName(
  categories: Category[],
  categoryId: string | null | undefined,
): string {
  if (!categoryId) return "—";
  return categories.find((c) => c.id === categoryId)?.name ?? "—";
}

const SEVERITY_RANK: Record<string, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};
const STATUS_RANK: Record<string, number> = {
  open: 0,
  in_progress: 1,
  resolved: 2,
  closed: 3,
};

type EmailSortField =
  | "subject"
  | "sender"
  | "category"
  | "severity"
  | "case_status"
  | "date";

function emailSortValue(
  email: Email,
  field: EmailSortField,
  cats: Category[],
): string | number {
  switch (field) {
    case "subject":
      return (email.subject ?? "").toLowerCase();
    case "sender":
      return (email.sender ?? "").toLowerCase();
    case "category":
      return categoryName(cats, email.category_id).toLowerCase();
    case "severity":
      return SEVERITY_RANK[email.severity ?? ""] ?? -1;
    case "case_status":
      return STATUS_RANK[email.case_status ?? ""] ?? -1;
    case "date":
      return new Date(email.date || email.created_at).getTime();
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, user, token } = useAuth();
  const { currentOrg, hasOrganizations, isLoading } = useOrganizations();

  const { data: members } = useSWR<Member[]>(
    currentOrg && token ? ["members", currentOrg.id, token] : null,
    ([_, orgId, tok]) =>
      organizationApi.listMembers(orgId as string, tok as string),
    { revalidateOnFocus: false, revalidateOnReconnect: true },
  );

  const currentUserRole = members?.find((m) => m.user_id === user?.id)?.role;

  const [sortBy, setSortBy] = useState<EmailSortField>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = (field: EmailSortField) => {
    setSortDir(sortBy === field && sortDir === "asc" ? "desc" : "asc");
    setSortBy(field);
  };

  const { categories } = useCategories({
    userId: user?.id,
    userRole: currentUserRole,
  });

  const { data: assignedEmails, isLoading: isLoadingAssigned } = useSWR<
    Email[]
  >(
    currentOrg && token ? ["assigned-to-me", currentOrg.id, token] : null,
    ([_, orgId, tok]) =>
      emailsApi.listAssignedToMe(orgId as string, tok as string),
    { revalidateOnFocus: false },
  );

  const sortedEmails = useMemo(() => {
    if (!assignedEmails) return [];
    return [...assignedEmails].sort((a, b) => {
      const aVal = emailSortValue(a, sortBy, categories);
      const bVal = emailSortValue(b, sortBy, categories);
      if (bVal < aVal) return sortDir === "desc" ? -1 : 1;
      if (bVal > aVal) return sortDir === "desc" ? 1 : -1;
      return 0;
    });
  }, [assignedEmails, sortBy, sortDir, categories]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push("/login");
    } else if (!hasOrganizations) {
      router.push("/onboarding");
    }
  }, [isAuthenticated, hasOrganizations, isLoading, router]);

  if (isLoading || !isAuthenticated || !hasOrganizations) {
    return null;
  }

  return (
    <DashboardLayout userName={user?.full_name} userRole={currentUserRole}>
      <Typography
        variant="h4"
        data-testid="dashboard-greeting"
        sx={{ mb: 4, color: "white" }}
      >
        Goodmorning, {user?.full_name || "User"}!
      </Typography>

      <Typography variant="h5" sx={{ mb: 2, color: "white" }}>
        Your Threads
      </Typography>

      {isLoadingAssigned ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer sx={{ bgcolor: "background.paper", borderRadius: 1 }}>
          <Table>
            <TableHead>
              <TableRow>
                {(
                  [
                    ["subject", "Subject"],
                    ["sender", "From"],
                    ["category", "Category"],
                    ["severity", "Severity"],
                    ["case_status", "Status"],
                    ["date", "Date"],
                  ] as [EmailSortField, string][]
                ).map(([field, label]) => (
                  <TableCell
                    key={field}
                    sx={{ color: "text.secondary", fontWeight: 600 }}
                  >
                    <TableSortLabel
                      active={sortBy === field}
                      direction={sortBy === field ? sortDir : "asc"}
                      onClick={() => handleSort(field)}
                    >
                      {label}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedEmails.length > 0 ? (
                sortedEmails.map((email) => (
                  <TableRow
                    key={email.id}
                    hover
                    onClick={() => {
                      if (email.category_id) {
                        router.push(
                          `/categories/${email.category_id}/thread/${email.id}`,
                        );
                      }
                    }}
                    sx={{
                      cursor: email.category_id ? "pointer" : "default",
                      "&:hover": { bgcolor: "rgba(255,255,255,0.03)" },
                    }}
                  >
                    <TableCell sx={{ color: "white" }}>
                      {email.subject || "(no subject)"}
                    </TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>
                      {email.sender}
                    </TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>
                      {categoryName(categories, email.category_id)}
                    </TableCell>
                    <TableCell>
                      <SeverityChip severity={email.severity} />
                    </TableCell>
                    <TableCell>
                      <CaseStatusChip caseStatus={email.case_status} />
                    </TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>
                      {formatDate(email.date || email.created_at)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    sx={{ color: "text.secondary", textAlign: "center", py: 4 }}
                  >
                    You are not assigned to any threads.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </DashboardLayout>
  );
}
