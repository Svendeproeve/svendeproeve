"use client";

import { useState } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizations } from "@/hooks/useOrganizations";
import ProfileSection from "./ProfileSection";
import PasswordSection from "./PasswordSection";
import DeleteAccountSection from "./DeleteAccountSection";
import OrganizationsSection from "./OrganizationsSection";

type Section = "profile" | "password" | "organizations" | "delete";

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isLoadingAuth } = useAuth();
  const { isLoading: isLoadingOrgs } = useOrganizations();

  const [activeSection, setActiveSection] = useState<Section>("profile");

  if (isLoadingAuth || isLoadingOrgs) {
    return (
      <DashboardLayout userName={user?.full_name}>
        <Box />
      </DashboardLayout>
    );
  }

  if (!isAuthenticated || !user) {
    router.push("/login");
    return null;
  }

  const menuItems: { id: Section; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "password", label: "Password" },
    { id: "organizations", label: "Organizations" },
    { id: "delete", label: "Delete Account" },
  ];

  return (
    <DashboardLayout userName={user?.full_name}>
      <Typography variant="h4" sx={{ mb: 4, color: "white" }}>
        Account Settings
      </Typography>

      <Box sx={{ display: "flex", gap: 3 }}>
        {/* Sidebar Menu */}
        <Box
          sx={{
            width: 200,
            bgcolor: "#2c2c2c",
            borderRadius: 1,
            height: "fit-content",
          }}
        >
          <List sx={{ p: 1 }}>
            {menuItems.map((item) => (
              <ListItem key={item.id} disablePadding>
                <ListItemButton
                  selected={activeSection === item.id}
                  onClick={() => setActiveSection(item.id)}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    "&.Mui-selected": {
                      bgcolor:
                        item.id === "delete"
                          ? "rgba(244, 67, 54, 0.1)"
                          : "rgba(255,255,255,0.1)",
                      "&:hover": {
                        bgcolor:
                          item.id === "delete"
                            ? "rgba(244, 67, 54, 0.15)"
                            : "rgba(255,255,255,0.15)",
                      },
                    },
                    "&:hover": {
                      bgcolor:
                        item.id === "delete"
                          ? "rgba(244, 67, 54, 0.05)"
                          : "rgba(255,255,255,0.05)",
                    },
                  }}
                >
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      sx: {
                        color:
                          item.id === "delete"
                            ? activeSection === item.id
                              ? "#f44336"
                              : "rgba(244, 67, 54, 0.7)"
                            : activeSection === item.id
                              ? "white"
                              : "text.secondary",
                        fontWeight: activeSection === item.id ? 600 : 400,
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>

        {/* Content Area */}
        <Box sx={{ flex: 1 }}>
          {activeSection === "profile" && <ProfileSection />}
          {activeSection === "password" && <PasswordSection />}
          {activeSection === "organizations" && <OrganizationsSection />}
          {activeSection === "delete" && <DeleteAccountSection />}
        </Box>
      </Box>
    </DashboardLayout>
  );
}
