"use client";

import { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { IoLogOutOutline } from "react-icons/io5";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  useOrganizations,
  setStoredOrgId,
  getStoredOrgId,
} from "@/hooks/useOrganizations";
import { organizationApi } from "@/lib/api";
import { useSnackbar } from "@/contexts/SnackbarContext";
import type { Organization } from "@/lib/api/organizations";

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forceSwitch = searchParams.get("switch") === "true";
  const { user, token, isAuthenticated, isLoading: authLoading, signout } = useAuth();
  const {
    organizations,
    isLoading: isLoadingOrgs,
    mutate,
  } = useOrganizations();
  const { showSnackbar } = useSnackbar();

  const [orgName, setOrgName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [leaveTarget, setLeaveTarget] = useState<Organization | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/login");
    } else if (!forceSwitch && !isLoadingOrgs && organizations.length === 1) {
      const storedOrgId = getStoredOrgId();
      const hasValidStoredOrg = organizations.some((o) => o.id === storedOrgId);
      if (hasValidStoredOrg) {
        router.push("/dashboard");
      }
    }
  }, [
    isAuthenticated,
    authLoading,
    isLoadingOrgs,
    organizations,
    router,
    forceSwitch,
  ]);

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orgName.trim()) {
      showSnackbar("Organization name is required", "error");
      return;
    }

    if (orgName.length < 2) {
      showSnackbar("Organization name must be at least 2 characters", "error");
      return;
    }

    if (!token) {
      showSnackbar("Not authenticated", "error");
      return;
    }

    setIsLoading(true);

    try {
      const created = await organizationApi.create({ name: orgName }, token);
      setStoredOrgId(created.id);
      await mutate();
      setOrgName("");
      setShowCreateForm(false);
      router.push("/dashboard");
    } catch (err: any) {
      showSnackbar(err.message || "Failed to create organization", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOrganization = (orgId: string) => {
    setStoredOrgId(orgId);
    router.push("/dashboard");
  };

  const handleLeaveConfirm = async () => {
    if (!leaveTarget || !token) return;
    setIsLeaving(true);
    try {
      await organizationApi.leaveOrganization(leaveTarget.id, token);
      showSnackbar(`Left ${leaveTarget.name}`, "success");
      const storedOrgId = getStoredOrgId();
      if (storedOrgId === leaveTarget.id) {
        localStorage.removeItem("current_org_id");
      }
      setLeaveTarget(null);
      await mutate();
    } catch (err: any) {
      showSnackbar(err.message || "Failed to leave organization", "error");
    } finally {
      setIsLeaving(false);
    }
  };

  if (authLoading || isLoadingOrgs || !isAuthenticated) return null;

  const storedOrgId = getStoredOrgId();
  const willAutoRedirect =
    !forceSwitch &&
    organizations.length === 1 &&
    organizations.some((o) => o.id === storedOrgId);
  if (willAutoRedirect) return null;

  const hasOrganizations = organizations.length > 0;
  const sortedOrganizations = [...organizations].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        px: 2,
        position: "relative",
      }}
    >
      <IconButton
        size="small"
        onClick={signout}
        data-testid="onboarding-logout-button"
        sx={{ position: "absolute", top: 16, right: 16, color: "white" }}
        title="Sign out"
      >
        <IoLogOutOutline size={22} />
      </IconButton>
      <Typography
        variant="h1"
        data-testid="onboarding-welcome-title"
        sx={{ fontSize: "4rem", mb: 2, color: "white" }}
      >
        Welcome to{" "}
        <Box
          component="span"
          sx={{
            fontFamily: "var(--font-inria-serif), serif",
            fontWeight: 700,
            letterSpacing: "-0.15em",
          }}
        >
          Sortr
        </Box>
      </Typography>

      <Typography
        variant="h6"
        data-testid="onboarding-subtitle"
        sx={{
          mb: 6,
          color: "text.secondary",
          textAlign: "center",
        }}
      >
        {hasOrganizations
          ? "Select or create an organization"
          : "Get started by creating an organization"}
      </Typography>

      <Box
        sx={{
          width: "100%",
          maxWidth: 600,
        }}
      >
        {/* Organization List */}
        {hasOrganizations && (
          <Card sx={{ mb: 3, bgcolor: "#2c2c2c" }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, color: "white" }}>
                Your Organizations
              </Typography>
              <List>
                {sortedOrganizations.map((org, index) => (
                  <Box key={org.id}>
                    {index > 0 && (
                      <Divider sx={{ bgcolor: "rgba(255,255,255,0.1)" }} />
                    )}
                    <ListItem
                      disablePadding
                      secondaryAction={
                        org.owner_user_id !== user?.id ? (
                          <Button
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLeaveTarget(org);
                            }}
                            data-testid={`leave-org-${org.id}`}
                            sx={{ textTransform: "none", mr: 1 }}
                          >
                            Leave
                          </Button>
                        ) : undefined
                      }
                    >
                      <ListItemButton
                        onClick={() => handleSelectOrganization(org.id)}
                        data-testid={`select-org-${org.id}`}
                        sx={{
                          "&:hover": { bgcolor: "rgba(255,255,255,0.05)" },
                          pr: org.owner_user_id !== user?.id ? 10 : undefined,
                        }}
                      >
                        <ListItemText
                          primary={org.name}
                          secondary={`Created ${new Date(org.created_at).toLocaleDateString()}`}
                          sx={{
                            "& .MuiListItemText-primary": { color: "white" },
                            "& .MuiListItemText-secondary": {
                              color: "text.secondary",
                            },
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  </Box>
                ))}
              </List>
            </CardContent>
          </Card>
        )}

        {/* No Organizations Message */}
        {!hasOrganizations && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Either create an organization or join by invite from organization
            owner.
          </Alert>
        )}

        {/* Create Organization Section */}
        {!showCreateForm ? (
          <Button
            fullWidth
            variant="contained"
            onClick={() => setShowCreateForm(true)}
            data-testid="show-create-org-button"
            sx={{
              py: 1.5,
              fontSize: "1.1rem",
              fontWeight: 600,
              textTransform: "none",
            }}
          >
            Create New Organization
          </Button>
        ) : (
          <Card sx={{ bgcolor: "#2c2c2c" }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, color: "white" }}>
                Create Organization
              </Typography>
              <Box component="form" onSubmit={handleCreateOrganization}>
                <Typography
                  variant="body1"
                  sx={{ mb: 1, color: "white", fontWeight: 500 }}
                >
                  Organization Name
                </Typography>
                <TextField
                  fullWidth
                  placeholder="My Company"
                  variant="outlined"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                  inputProps={{ "data-testid": "onboarding-org-name-input" }}
                  sx={{ mb: 2 }}
                />

                <Box sx={{ display: "flex", gap: 2 }}>
                  <Button
                    fullWidth
                    type="submit"
                    variant="contained"
                    disabled={isLoading}
                    data-testid="onboarding-create-org-button"
                    sx={{
                      py: 1.5,
                      fontSize: "1.1rem",
                      fontWeight: 600,
                      textTransform: "none",
                    }}
                  >
                    {isLoading ? "Creating..." : "Create"}
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => {
                      setShowCreateForm(false);
                      setOrgName("");
                    }}
                    disabled={isLoading}
                    sx={{
                      py: 1.5,
                      fontSize: "1.1rem",
                      fontWeight: 600,
                      textTransform: "none",
                    }}
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* Leave Organization Dialog */}
      <Dialog open={!!leaveTarget} onClose={() => setLeaveTarget(null)}>
        <DialogTitle>Leave organization?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to leave{" "}
            <strong>{leaveTarget?.name}</strong>? You will lose access and
            need a new invitation to rejoin.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLeaveTarget(null)} disabled={isLeaving}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleLeaveConfirm}
            disabled={isLeaving}
            data-testid="confirm-leave-org-button"
          >
            {isLeaving ? "Leaving..." : "Leave"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
