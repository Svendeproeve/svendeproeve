"use client";

import { useState, useEffect } from "react";
import { Box, TextField, Button, Typography, Link } from "@mui/material";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSnackbar } from "@/contexts/SnackbarContext";

export default function RegisterPage() {
  const router = useRouter();
  const { signup, isAuthenticated, isLoading: authLoading } = useAuth();
  const { showSnackbar } = useSnackbar();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [justSignedUp, setJustSignedUp] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated && !justSignedUp) {
      router.push("/onboarding");
    }
  }, [isAuthenticated, authLoading, justSignedUp, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName || !email || !password || !confirmPassword) {
      showSnackbar("All fields are required", "error");
      return;
    }

    if (password.length < 8) {
      showSnackbar("Password must be at least 8 characters", "error");
      return;
    }

    if (password !== confirmPassword) {
      showSnackbar("Passwords do not match", "error");
      return;
    }

    setIsLoading(true);

    try {
      setJustSignedUp(true);
      await signup({ full_name: fullName, email, password });
      router.push("/onboarding");
    } catch (err: any) {
      showSnackbar(err.message || "Signup failed. Please try again.", "error");
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
        data-testid="register-title"
        sx={{
          fontFamily: "var(--font-inria-serif), serif",
          fontWeight: 700,
          letterSpacing: "-0.15em",
          fontSize: "3rem",
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
          maxWidth: 300,
        }}
      >
        <Typography
          variant="body1"
          sx={{ mb: 1, color: "white", fontWeight: 500 }}
        >
          Full Name
        </Typography>
        <TextField
          fullWidth
          type="text"
          placeholder="John Doe"
          variant="outlined"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={isLoading}
          required
          inputProps={{ "data-testid": "register-fullname-input" }}
          sx={{ mb: 2 }}
        />

        <Typography
          variant="body1"
          sx={{ mb: 1, color: "white", fontWeight: 500 }}
        >
          Email
        </Typography>
        <TextField
          fullWidth
          type="email"
          placeholder="you@example.com"
          variant="outlined"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          inputProps={{ "data-testid": "register-email-input" }}
          sx={{ mb: 2 }}
        />

        <Typography
          variant="body1"
          sx={{ mb: 1, color: "white", fontWeight: 500 }}
        >
          Password
        </Typography>
        <TextField
          fullWidth
          type="password"
          placeholder="••••••••••••••••"
          variant="outlined"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          inputProps={{ "data-testid": "register-password-input" }}
          sx={{ mb: 2 }}
        />

        <Typography
          variant="body1"
          sx={{ mb: 1, color: "white", fontWeight: 500 }}
        >
          Confirm Password
        </Typography>
        <TextField
          fullWidth
          type="password"
          placeholder="••••••••••••••••"
          variant="outlined"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading}
          inputProps={{ "data-testid": "register-confirm-password-input" }}
          sx={{ mb: 2 }}
        />

        <Button
          fullWidth
          type="submit"
          variant="contained"
          disabled={isLoading}
          data-testid="register-submit-button"
          sx={{
            py: 1.5,
            fontSize: "1.1rem",
            fontWeight: 600,
            textTransform: "none",
          }}
        >
          {isLoading ? "Creating account..." : "Register"}
        </Button>

        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            You have an account already?{" "}
            <Link
              component={NextLink}
              href="/login"
              sx={{ color: "white", textDecoration: "underline" }}
            >
              Login here!
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
