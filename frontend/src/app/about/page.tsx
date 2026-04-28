"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Button,
  Container,
  CircularProgress,
} from "@mui/material";
import { useAuth } from "@/hooks/useAuth";

export default function AboutPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#0d1b2a",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#1a1a1a" }}>
      {/* Navbar + About content share the same gradient background */}
      <Box
        sx={{
          background:
            "linear-gradient(160deg, #1e6ab5 0%, #1a4d8f 35%, #0f2d5e 65%, #081a3a 100%)",
          minHeight: "100vh",
          pb: { xs: 10, md: 14 },
        }}
      >
        <Container
          maxWidth="lg"
          sx={{ pt: { xs: 2, md: 2.5 }, px: { xs: 2, md: 3 } }}
        >
          <Box
            component="nav"
            sx={{
              px: { xs: 2.5, md: 4 },
              py: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              bgcolor: "#1B1B1B",
              borderRadius: 4.5,
            }}
          >
            <Typography
              sx={{
                fontFamily: "var(--font-inria-serif), serif",
                color: "white",
                fontWeight: 700,
                letterSpacing: "-0.15em",
                fontSize: "2.5rem",
                cursor: "pointer",
              }}
              onClick={() => router.push("/")}
            >
              Sortr
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: { xs: 2, md: 4 },
              }}
            >
              <Typography
                sx={{
                  color: "rgba(255,255,255,0.85)",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  "&:hover": { color: "white" },
                }}
                onClick={() => router.push("/pricing")}
              >
                Pricing
              </Typography>
              <Typography
                sx={{
                  color: "rgba(255,255,255,0.85)",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  "&:hover": { color: "white" },
                }}
                onClick={() => router.push("/about")}
              >
                About
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => router.push("/login")}
                sx={{
                  textTransform: "none",
                  px: 2.5,
                  py: 0.6,
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  borderColor: "rgba(255,255,255,0.6)",
                  color: "white",
                  "&:hover": {
                    borderColor: "white",
                    bgcolor: "rgba(255,255,255,0.08)",
                  },
                }}
              >
                Log In
              </Button>
            </Box>
          </Box>
        </Container>

        {/* About content */}
        <Container maxWidth="lg" sx={{ px: { xs: 3, md: 6 } }}>
          <Box
            sx={{
              pt: { xs: 6, md: 10 },
              maxWidth: 800,
              mx: "auto",
            }}
          >
            <Typography
              sx={{
                color: "white",
                fontWeight: 800,
                fontSize: { xs: "2.4rem", md: "3.5rem" },
                lineHeight: 1.05,
                textTransform: "uppercase",
                mb: 4,
                letterSpacing: "-0.5px",
              }}
            >
              About Sortr
            </Typography>

            <Typography
              sx={{
                color: "rgba(255,255,255,0.85)",
                fontSize: "1.125rem",
                lineHeight: 1.8,
                mb: 4,
              }}
            >
              Sortr is a school project exam/svendeprøve made by Julius, Oskar
              and Noah. It sorts email using AI, via IMAP and SMTP connections,
              to connect to a existing mail-server.
            </Typography>

            <Button
              variant="outlined"
              size="large"
              onClick={() => router.push("/register")}
              sx={{
                textTransform: "uppercase",
                px: 4,
                py: 1.5,
                fontSize: "0.85rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                borderColor: "white",
                color: "white",
                "&:hover": {
                  borderColor: "white",
                  bgcolor: "rgba(255,255,255,0.1)",
                },
              }}
            >
              Get Started Now
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          bgcolor: "#1a1a1a",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          py: 3,
          px: { xs: 3, md: 6 },
        }}
      >
        <Container maxWidth="lg">
          <Typography
            sx={{
              fontFamily: "var(--font-inria-serif), serif",
              color: "white",
              fontWeight: 700,
              letterSpacing: "-0.15em",
              fontSize: "3rem",
            }}
          >
            Sortr
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
