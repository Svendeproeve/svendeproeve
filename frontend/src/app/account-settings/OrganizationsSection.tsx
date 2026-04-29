"use client";

import { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Divider,
} from "@mui/material";
import { useAuth } from "@/hooks/useAuth";
import {
  useOrganizations,
  getStoredOrgId,
} from "@/hooks/useOrganizations";
import { organizationApi } from "@/lib/api";
import { useSnackbar } from "@/contexts/SnackbarContext";
import type { Organization } from "@/lib/api/organizations";

export default function OrganizationsSection() {
  const { user, token } = useAuth();
  const { organizations, mutate } = useOrganizations();
  const { showSnackbar } = useSnackbar();

  const [leaveTarget, setLeaveTarget] = useState<Organization | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

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

  const sortedOrgs = [...organizations].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <Box>
      <Card sx={{ bgcolor: "#2c2c2c" }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, color: "white" }}>
            Organizations
          </Typography>

          {sortedOrgs.length === 0 ? (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              You are not a member of any organization.
            </Typography>
          ) : (
            <Box>
              {sortedOrgs.map((org, index) => {
                const isOwner = org.owner_user_id === user?.id;
                return (
                  <Box key={org.id}>
                    {index > 0 && (
                      <Divider sx={{ bgcolor: "rgba(255,255,255,0.1)", my: 1.5 }} />
                    )}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box>
                        <Typography sx={{ color: "white", fontWeight: 500 }}>
                          {org.name}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                          <Chip
                            label={isOwner ? "Owner" : "Member"}
                            size="small"
                            sx={{
                              bgcolor: isOwner
                                ? "rgba(25, 118, 210, 0.15)"
                                : "rgba(255,255,255,0.1)",
                              color: isOwner ? "#1976d2" : "text.secondary",
                              height: 20,
                              fontSize: "0.7rem",
                            }}
                          />
                        </Box>
                      </Box>

                      {!isOwner && (
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          onClick={() => setLeaveTarget(org)}
                          data-testid={`leave-org-settings-${org.id}`}
                          sx={{ textTransform: "none" }}
                        >
                          Leave
                        </Button>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </CardContent>
      </Card>

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
          >
            {isLeaving ? "Leaving..." : "Leave"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
