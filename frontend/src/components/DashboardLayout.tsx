'use client';

import { ReactNode, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
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
} from '@mui/material';
import { IoSpeedometerOutline, IoMailOutline, IoPeopleOutline, IoLogOutOutline, IoChevronUp, IoChevronDown, IoAddCircleOutline, IoServerOutline } from 'react-icons/io5';
import { IconType } from 'react-icons';
import Link from 'next/link';
import { getInboxColor } from '@/lib/inboxes';
import { useAuth } from '@/hooks/useAuth';
import { useInboxes } from '@/hooks/useInboxes';

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
    label: 'Dashboard',
    icon: IoSpeedometerOutline,
    href: '/dashboard',
  },
{
    label: 'Mail Accounts',
    icon: IoServerOutline,
    href: '/mail-account-management',
    requiresAdmin: true,
  },
  {
    label: 'Manage Categories',
    icon: IoAddCircleOutline,
    href: '/inbox-management',
    requiresAdmin: true,
  },
  {
    label: 'User Management',
    icon: IoPeopleOutline,
    href: '/user-management',
    requiresAdmin: true,
  },
];

interface DashboardLayoutProps {
  children: ReactNode;
  userName?: string;
  userRole?: 'owner' | 'admin' | 'member';
}

export default function DashboardLayout({ children, userName, userRole }: DashboardLayoutProps) {
  const [openMenus, setOpenMenus] = useState<{ [key: string]: boolean }>({});
  const { signout, user } = useAuth();
  const { inboxes, currentOrg } = useInboxes({ userId: user?.id, userRole });
  const pathname = usePathname();

  useEffect(() => {
    if (inboxes.length > 0 && inboxes.length < 10) {
      setOpenMenus(prev => ({ ...prev, Categories: true }));
    }
  }, [inboxes.length]);

  const inboxMenuItem: MenuItem = {
    label: 'Categories',
    icon: IoMailOutline,
    submenu: inboxes.map((inbox, i) => ({
      label: inbox.name,
      href: `/inbox/${inbox.id}`,
      color: getInboxColor(i),
    })),
  };

  const menuItems: MenuItem[] = [
    staticMenuItems[0], // Dashboard
    inboxMenuItem,
    ...staticMenuItems.slice(1),
  ];

  // Filter menu items based on user role
  const visibleMenuItems = menuItems.filter(item => {
    if (item.requiresAdmin && userRole === 'member') {
      return false;
    }
    return true;
  });

  const toggleMenu = (label: string) => {
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            bgcolor: '#222222',
            borderRight: 'none',
            overflow: 'hidden',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
            {currentOrg?.name || ''}
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
                  component={hasSubmenu ? 'div' : Link}
                  href={item.href}
                  onClick={hasSubmenu ? () => toggleMenu(item.label) : undefined}
                  sx={{
                    color: 'white',
                    borderRadius: 1,
                    mb: 0.5,
                    cursor: 'pointer',
                    bgcolor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                    '&:hover': { bgcolor: isActive ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)' },
                  }}
                >
                  <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                    <Icon size={20} />
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                  {hasSubmenu && (isOpen ? <IoChevronUp size={20} /> : <IoChevronDown size={20} />)}
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
                              pl: '56px',
                              pr: 1,
                              py: 0.75,
                              color: isSubActive ? 'white' : 'rgba(255,255,255,0.55)',
                              borderLeft: `3px solid ${subItem.color}`,
                              mb: 0.25,
                              background: isSubActive
                                ? `linear-gradient(to right, ${subItem.color}18, transparent)`
                                : 'transparent',
                              '&:hover': {
                                background: `linear-gradient(to right, ${subItem.color}12, transparent)`,
                                color: 'white',
                              },
                            }}
                          >
                            <ListItemText
                              primary={subItem.label}
                              primaryTypographyProps={{ fontSize: '0.875rem' }}
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

        <Box sx={{ mt: 'auto', p: 2 }}>
          <Link href="/onboarding" style={{ textDecoration: 'none' }}>
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(255,255,255,0.25)',
                fontSize: '0.7rem',
                cursor: 'pointer',
                '&:hover': { color: 'rgba(255,255,255,0.45)' },
              }}
            >
              + Create or select organization
            </Typography>
          </Link>
        </Box>
      </Drawer>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            height: 60,
            bgcolor: '#2c2c2c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 3,
          }}
        >
          <Box sx={{ flexGrow: 1, textAlign: 'center' }}>
            <Typography variant="h5" sx={{ fontFamily: 'var(--font-inria-serif), serif', color: 'white', fontWeight: 700, letterSpacing: '-0.15em', fontSize: '3rem' }}>
              Sortr
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {userName && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {userName}
              </Typography>
            )}
            <IconButton
              size="small"
              sx={{ color: 'white' }}
              onClick={signout}
              data-testid="logout-button"
            >
              <IoLogOutOutline size={20} />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ flexGrow: 1, bgcolor: 'background.default', p: 3 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
