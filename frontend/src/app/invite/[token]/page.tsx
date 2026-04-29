"use client";

import { useState, useEffect } from "react";
import { Box, Typography, Button, CircularProgress, Alert } from "@mui/material";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { inviteApi } from "@/lib/api/organizations";
import type { InviteDetail } from "@/lib/api/organizations";
import { useSnackbar } from "@/contexts/SnackbarContext";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const inviteToken = params.token as string;
  const { token: authToken, isAuthenticated, isLoading: authLoading } = useAuth();
  const { showSnackbar } = useSnackbar();

  const [invite, setInvite] = useState<InviteDetail | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isLoadingInvite, setIsLoadingInvite] = useState(true);
  const [isActing, setIsActing] = useState(false);

  useEffect(() => {
    inviteApi
      .getDetails(inviteToken)
      .then(setInvite)
      .catch((err) => setFetchError(err.message || "Invite not found"))
      .finally(() => setIsLoadingInvite(false));
  }, [inviteToken]);

  const handleAccept = async () => {
    if (!authToken) return;
    setIsActing(true);
    try {
      await inviteApi.accept(inviteToken, authToken);
      showSnackbar("Invitation accepted!", "success");
      router.push("/onboarding");
    } catch (err: any) {
      showSnackbar(err.message || "Failed to accept invite", "error");
      setIsActing(false);
    }
  };

  const handleDecline = async () => {
    if (!authToken) return;
    setIsActing(true);
    try {
      await inviteApi.decline(inviteToken, authToken);
      showSnackbar("Invitation declined", "info");
      router.push("/onboarding");
    } catch (err: any) {
      showSnackbar(err.message || "Failed to decline invite", "error");
      setIsActing(false);
    }
  };

  const loginUrl = `/login?redirect=/invite/${inviteToken}`;

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
      }}
    >
      <Typography
        variant="h1"
        sx={{
          fontFamily: "var(--font-inria-serif), serif",
          fontWeight: 700,
          letterSpacing: "-0.15em",
          fontSize: "3rem",
          mb: 6,
          color: "white",
        }}
      >
        Sortr
      </Typography>

      <Box sx={{ width: "100%", maxWidth: 440 }}>
        {isLoadingInvite || authLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        ) : fetchError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {fetchError}
          </Alert>
        ) : invite!.already_responded ? (
          <Alert severity="info">
            This invitation has already been responded to.
          </Alert>
        ) : invite!.is_expired ? (
          <Alert severity="warning">
            This invitation link has expired. Please ask to be re-invited.
          </Alert>
        ) : (
          <Box
            sx={{
              bgcolor: "#2c2c2c",
              borderRadius: 2,
              p: 4,
              textAlign: "center",
            }}
          >
            <Typography variant="h5" sx={{ color: "white", mb: 1 }}>
              You&apos;ve been invited to
            </Typography>
            <Typography
              variant="h4"
              sx={{ color: "white", fontWeight: 700, mb: 1 }}
            >
              {invite!.org_name}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 4 }}>
              Invited by {invite!.invited_by_email}
            </Typography>

            {!isAuthenticated ? (
              <>
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary", mb: 3 }}
                >
                  Please log in to accept or decline this invitation.
                </Typography>
                <Button
                  fullWidth
                  variant="contained"
                  href={loginUrl}
                  sx={{ py: 1.5, fontWeight: 600, textTransform: "none" }}
                >
                  Log in to respond
                </Button>
              </>
            ) : (
              <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  disabled={isActing}
                  onClick={handleAccept}
                  data-testid="invite-accept-button"
                  sx={{ py: 1.5, fontWeight: 600, textTransform: "none" }}
                >
                  {isActing ? "..." : "Accept"}
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  disabled={isActing}
                  onClick={handleDecline}
                  data-testid="invite-decline-button"
                  sx={{ py: 1.5, fontWeight: 600, textTransform: "none" }}
                >
                  {isActing ? "..." : "Decline"}
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
