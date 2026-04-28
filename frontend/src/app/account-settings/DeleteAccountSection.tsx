"use client";

import { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { userApi } from "@/lib/api";
import { useSnackbar } from "@/contexts/SnackbarContext";

export default function DeleteAccountSection() {
  const router = useRouter();
  const { user, token, signout } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleDeleteAccount = async () => {
    if (!token || !user) return;

    setIsDeleting(true);
    try {
      await userApi.deleteAccount(user.id, token);
      // Sign out and redirect to landing page
      signout();
      router.push("/");
    } catch (err: any) {
      showSnackbar(err.message || "Failed to delete account", "error");
      setIsDeleting(false);
    }
  };

  const openConfirmDialog = () => {
    setConfirmText("");
    setShowConfirmDialog(true);
  };

  const handleConfirm = () => {
    if (confirmText !== "DELETE") {
      showSnackbar("Please type DELETE to confirm", "error");
      return;
    }
    setShowConfirmDialog(false);
    handleDeleteAccount();
  };

  return (
    <Box>
      <Card
        sx={{
          bgcolor: "#2c2c2c",
          borderColor: "#f44336",
          borderWidth: 1,
          borderStyle: "solid",
        }}
      >
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, color: "#f44336" }}>
            Delete Account
          </Typography>

          <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
            Deleting your account is permanent and cannot be undone. This will:
          </Typography>

          <Box component="ul" sx={{ mb: 3, pl: 3, color: "text.secondary" }}>
            <li>Delete all your personal data and profile</li>
            <li>
              <strong>Delete organizations you own</strong>, including:
              <Box component="ul" sx={{ mt: 0.5 }}>
                <li>All mail accounts in those organizations</li>
                <li>All categories, filters, and emails</li>
                <li>All members and their access</li>
              </Box>
            </li>
            <li>Remove you from organizations you don't own</li>
            <li>Unassign you from all threads in other organizations</li>
          </Box>

          <Typography
            variant="body2"
            sx={{ mb: 3, color: "#f44336", fontWeight: 600 }}
          >
            This action cannot be reversed. Please be certain.
          </Typography>

          <Button
            variant="outlined"
            color="error"
            onClick={openConfirmDialog}
            disabled={isDeleting}
            sx={{
              px: 4,
              py: 1.5,
              fontWeight: 600,
              textTransform: "none",
            }}
          >
            Delete My Account
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
      >
        <DialogTitle sx={{ color: "#f44336" }}>
          Confirm Account Deletion
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you absolutely sure you want to delete your account?
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
            Type <strong>DELETE</strong> to confirm:
          </Typography>
          <TextField
            fullWidth
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type DELETE"
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
          <Button
            onClick={handleConfirm}
            color="error"
            variant="contained"
            disabled={confirmText !== "DELETE"}
          >
            Delete Account
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
