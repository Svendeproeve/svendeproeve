"use client";

import { useState, useEffect, Suspense } from "react";
import { Box, TextField, Button, Typography, Link, Alert } from "@mui/material";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "@/lib/api/auth";
import { useSnackbar } from "@/contexts/SnackbarContext";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { showSnackbar } = useSnackbar();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      showSnackbar("Invalid or missing reset token", "error");
    }
  }, [token, showSnackbar]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      showSnackbar("Invalid or missing reset token", "error");
      return;
    }

    if (!newPassword || !confirmPassword) {
      showSnackbar("All fields are required", "error");
      return;
    }

    if (newPassword.length < 8) {
      showSnackbar("Password must be at least 8 characters long", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showSnackbar("Passwords do not match", "error");
      return;
    }

    setIsLoading(true);

    try {
      await authApi.resetPassword(token, newPassword);
      setIsSuccess(true);
      showSnackbar(
        "Password reset successfully! Redirecting to login...",
        "success",
      );
      setNewPassword("");
      setConfirmPassword("");

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      showSnackbar(
        err.message || "Password reset failed. Please try again.",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
      }}
    >
      <Typography
        variant="h1"
        sx={{
          fontSize: "4rem",
          mb: 8,
          color: "white",
        }}
      >
        Sortr
      </Typography>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          width: "100%",
          maxWidth: 400,
        }}
      >
        <Typography
          variant="h5"
          sx={{
            mb: 2,
            color: "white",
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          Set New Password
        </Typography>

        <Typography
          variant="body2"
          sx={{
            mb: 3,
            color: "text.secondary",
            textAlign: "center",
          }}
        >
          Enter your new password below.
        </Typography>

        <Typography
          variant="body1"
          sx={{ mb: 1, color: "white", fontWeight: 500 }}
        >
          New Password
        </Typography>
        <TextField
          fullWidth
          type="password"
          placeholder="••••••••••••••••"
          variant="outlined"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={isLoading || isSuccess}
          inputProps={{ "data-testid": "reset-password-new-password-input" }}
          sx={{ mb: 2 }}
        />

        <Typography
          variant="body1"
          sx={{ mb: 1, color: "white", fontWeight: 500 }}
        >
          Confirm New Password
        </Typography>
        <TextField
          fullWidth
          type="password"
          placeholder="••••••••••••••••"
          variant="outlined"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading || isSuccess}
          inputProps={{
            "data-testid": "reset-password-confirm-password-input",
          }}
          sx={{ mb: 2 }}
        />

        <Button
          fullWidth
          type="submit"
          variant="contained"
          disabled={isLoading || isSuccess}
          data-testid="reset-password-submit-button"
          sx={{
            py: 1.5,
            fontSize: "1.1rem",
            fontWeight: 600,
            textTransform: "none",
          }}
        >
          {isLoading
            ? "Resetting..."
            : isSuccess
              ? "Success!"
              : "Reset Password"}
        </Button>

        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Remember your password?{" "}
            <Link
              component={NextLink}
              href="/login"
              sx={{ color: "white", textDecoration: "underline" }}
            >
              Back to Login
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
