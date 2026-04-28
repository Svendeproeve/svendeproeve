"use client";

import { ReactNode, useState } from "react";
import type { SxProps, Theme } from "@mui/material/styles";
import { usePathname } from "next/navigation";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Collapse,
} from "@mui/material";
import {
  IoSpeedometerOutline,
  IoMailOutline,
  IoPeopleOutline,
  IoLogOutOutline,
  IoChevronUp,
  IoChevronDown,
  IoAddCircleOutline,
  IoServerOutline,
} from "react-icons/io5";
import { IconType } from "react-icons";
import Link from "next/link";
import { getCategoryColor } from "@/lib/categories";
import { useAuth } from "@/hooks/useAuth";
import { useCategories } from "@/hooks/useCategories";

const drawerWidth = 220;

interface SubMenuItem {
  label: string;
  href: string;
  color: string;
}

interface MenuItem {
  label: string;
  icon: IconType;
  href?: string;
  submenu?: SubMenuItem[];
  requiresAdmin?: boolean;
}

const staticMenuItems: MenuItem[] = [
  {
    label: "Dashboard",
    icon: IoSpeedometerOutline,
    href: "/dashboard",
  },
  {
    label: "Mail Accounts",
    icon: IoServerOutline,
    href: "/mail-account-management",
    requiresAdmin: true,
  },
  {
    label: "Manage Categories",
    icon: IoAddCircleOutline,
    href: "/category-management",
    requiresAdmin: true,
  },
  {
    label: "User Management",
    icon: IoPeopleOutline,
    href: "/user-management",
    requiresAdmin: true,
  },
];

interface DashboardLayoutProps {
  children: ReactNode;
  userName?: string;
  userRole?: "owner" | "admin" | "member";
  /** Merged onto the main scroll area (default padding is 3). */
  contentSx?: SxProps<Theme>;
}

export default function DashboardLayout({
  children,
  userName,
  userRole,
  contentSx,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<{ [key: string]: boolean }>({
    Categories: true,
  });
  const { signout, user } = useAuth();
  const { categories, currentOrg } = useCategories({
    userId: user?.id,
    userRole,
  });

  const categoryMenuItem: MenuItem = {
    label: "Categories",
    icon: IoMailOutline,
    submenu: categories.map((category, i) => ({
      label: category.name,
      href: `/categories/${category.id}`,
      color: category.color || getCategoryColor(i),
    })),
  };

  const menuItems: MenuItem[] = [
    staticMenuItems[0], // Dashboard
    categoryMenuItem,
    ...staticMenuItems.slice(1),
  ];

  // Filter menu items based on user role
  const visibleMenuItems = menuItems.filter((item) => {
    if (item.requiresAdmin && userRole === "member") {
      return false;
    }
    return true;
  });

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            bgcolor: "#222222",
            borderRight: "none",
            overflow: "auto",
            height: "100%",
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", fontSize: "0.9rem" }}
          >
            {currentOrg?.name || ""}
          </Typography>
        </Box>

        <List sx={{ px: 1 }}>
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const hasSubmenu = !!item.submenu;
            const isOpen = openMenus[item.label] || false;

            const isActive = !hasSubmenu && item.href === pathname;

            return (
              <Box key={item.label}>
                <ListItem
                  component={hasSubmenu ? "div" : Link}
                  href={item.href}
                  onClick={
                    hasSubmenu ? () => toggleMenu(item.label) : undefined
                  }
                  sx={{
                    color: "white",
                    borderRadius: 1,
                    mb: 0.5,
                    cursor: "pointer",
                    bgcolor: isActive ? "rgba(255,255,255,0.1)" : "transparent",
                    "&:hover": {
                      bgcolor: isActive
                        ? "rgba(255,255,255,0.12)"
                        : "rgba(255,255,255,0.05)",
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: "white", minWidth: 40 }}>
                    <Icon size={20} />
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                  {hasSubmenu &&
                    (isOpen ? (
                      <IoChevronUp size={20} />
                    ) : (
                      <IoChevronDown size={20} />
                    ))}
                </ListItem>

                {hasSubmenu && (
                  <Collapse in={isOpen} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      {item.submenu!.map((subItem) => {
                        const isSubActive = pathname === subItem.href;
                        return (
                          <ListItem
                            key={subItem.label}
                            component={Link}
                            href={subItem.href}
                            sx={{
                              pl: "56px",
                              pr: 1,
                              py: 0.75,
                              color: isSubActive
                                ? "white"
                                : "rgba(255,255,255,0.55)",
                              borderLeft: `3px solid ${subItem.color}`,
                              mb: 0.25,
                              background: isSubActive
                                ? `linear-gradient(to right, ${subItem.color}18, transparent)`
                                : "transparent",
                              "&:hover": {
                                background: `linear-gradient(to right, ${subItem.color}12, transparent)`,
                                color: "white",
                              },
                            }}
                          >
                            <ListItemText
                              primary={subItem.label}
                              primaryTypographyProps={{ fontSize: "0.875rem" }}
                            />
                          </ListItem>
                        );
                      })}
                    </List>
                  </Collapse>
                )}
              </Box>
            );
          })}
        </List>

        <Box sx={{ mt: "auto", p: 2 }}>
          <Link
            href="/onboarding?switch=true"
            style={{ textDecoration: "none" }}
          >
            <Typography
              variant="caption"
              sx={{
                color: "rgba(255,255,255,0.25)",
                fontSize: "0.7rem",
                cursor: "pointer",
                "&:hover": { color: "rgba(255,255,255,0.45)" },
              }}
            >
              + Create or select organization
            </Typography>
          </Link>
        </Box>
      </Drawer>

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            flexShrink: 0,
            height: 60,
            bgcolor: "#2c2c2c",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 3,
          }}
        >
          <Box sx={{ flexGrow: 1, textAlign: "center" }}>
            <Typography
              variant="h5"
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
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {userName && (
              <Link href="/account-settings" style={{ textDecoration: "none" }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    cursor: "pointer",
                    "&:hover": { color: "white" },
                  }}
                >
                  {userName}
                </Typography>
              </Link>
            )}
            <IconButton
              size="small"
              sx={{ color: "white" }}
              onClick={signout}
              data-testid="logout-button"
            >
              <IoLogOutOutline size={20} />
            </IconButton>
          </Box>
        </Box>

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            bgcolor: "background.default",
            p: 3,
            display: "flex",
            flexDirection: "column",
            ...contentSx,
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
