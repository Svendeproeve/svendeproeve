"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Box,
  Typography,
  Button,
  Container,
  CircularProgress,
} from "@mui/material";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
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
      {/* Navbar + Hero share the same gradient background */}
      <Box
        sx={{
          background:
            "linear-gradient(160deg, #1e6ab5 0%, #1a4d8f 35%, #0f2d5e 65%, #081a3a 100%)",
          pb: { xs: 10, md: 14 },
        }}
      >
        {/* Navbar — floating box aligned with page container */}
        <Container
          maxWidth="lg"
          sx={{ pt: { xs: 2, md: 2.5 }, px: { xs: 2, md: 3 } }}
        >
          <Box
            component="nav"
            sx={{
              px: { xs: 2.5, md: 4 },
              py: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              bgcolor: "#1B1B1B",
              borderRadius: 4.5,
            }}
          >
            <Typography
              sx={{
                color: "white",
                fontWeight: 700,
                fontSize: "1.4rem",
                letterSpacing: "-0.3px",
              }}
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
              >
                About
              </Typography>
              <Button
                variant="outlined"
                size="small"
                data-testid="login-button"
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

        {/* Hero content */}
        <Container maxWidth="lg" sx={{ px: { xs: 3, md: 6 } }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: { xs: 0, md: 8 },
              flexDirection: { xs: "column", md: "row" },
              pt: { xs: 4, md: 6 },
            }}
          >
            {/* Left: text content */}
            <Box sx={{ flex: 1 }}>
              <Typography
                data-testid="landing-title"
                sx={{
                  color: "white",
                  fontWeight: 800,
                  fontSize: { xs: "2.4rem", md: "3.5rem" },
                  lineHeight: 1.05,
                  textTransform: "uppercase",
                  mb: 2.5,
                  letterSpacing: "-0.5px",
                }}
              >
                AI-Powered Email Management System
              </Typography>
              <Typography
                data-testid="landing-tagline"
                sx={{
                  color: "rgba(255,255,255,0.65)",
                  fontSize: "0.78rem",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  mb: 5,
                }}
              >
                Optimize your workflows with AI
              </Typography>
              <Button
                variant="outlined"
                size="large"
                data-testid="get-started-button"
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

            {/* Right: illustration placeholder — plain text, no box */}
            <Box
              sx={{
                flex: 1,
                display: { xs: "none", md: "flex" },
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Image
                src="/illustrations/hero.svg"
                alt="Hero Illustration"
                width={400}
                height={300}
                style={{ objectFit: "contain", opacity: 0.8 }}
              />
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Trusted By Section */}
      <Box
        sx={{ bgcolor: "#222222", py: { xs: 5, md: 6 }, px: { xs: 3, md: 6 } }}
      >
        <Typography
          sx={{
            color: "rgba(255,255,255,0.5)",
            fontSize: "0.7rem",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            textAlign: "center",
            mb: 4,
          }}
        >
          Trusted by Global Leaders
        </Typography>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Image
            src="/logos/tec.png"
            alt="TEC"
            width={120}
            height={60}
            style={{ objectFit: "contain", opacity: 0.7 }}
          />
        </Box>
      </Box>

      {/* Testimonial Section */}
      <Box
        sx={{ bgcolor: "#1a1a1a", py: { xs: 6, md: 8 }, px: { xs: 3, md: 6 } }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{ bgcolor: "#111111", borderRadius: 2, p: { xs: 4, md: 6 } }}
          >
            <Image
              src="/logos/tec.png"
              alt="TEC"
              width={120}
              height={60}
              style={{ objectFit: "contain", opacity: 0.7, marginBottom: 16 }}
            />
            <Typography
              sx={{
                color: "white",
                fontWeight: 700,
                fontSize: { xs: "0.85rem", md: "1rem" },
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                mb: 1.5,
              }}
            >
              Sortr has helped our problem with forgetting
            </Typography>
            <Typography
              sx={{
                color: "rgba(255,255,255,0.45)",
                fontSize: "0.875rem",
                lineHeight: 1.6,
              }}
            >
              If this were an school exam we would give this project a grade of
              12.
            </Typography>
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
              color: "white",
              fontWeight: 700,
              fontSize: "1.2rem",
              letterSpacing: "-0.3px",
            }}
          >
            Sortr
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
