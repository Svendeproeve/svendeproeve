'use client';

import { ReactNode, useState } from 'react';
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
import { IoSpeedometer, IoMail, IoSettings, IoExtensionPuzzle, IoPeople, IoLogOut, IoChevronUp, IoChevronDown } from 'react-icons/io5';
import { IconType } from 'react-icons';
import Link from 'next/link';

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
}

const menuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    icon: IoSpeedometer,
    href: '/dashboard',
  },
  {
    label: 'Inboxes',
    icon: IoMail,
    submenu: [
      { label: 'Support', href: '/inbox/support', color: '#ff9800' },
      { label: 'Accounting', href: '/inbox/accounting', color: '#4caf50' },
      { label: 'HR', href: '/inbox/hr', color: '#9c27b0' },
    ],
  },
  {
    label: 'AI Settings',
    icon: IoSettings,
    href: '/ai-settings',
  },
  {
    label: 'Integration Settings',
    icon: IoExtensionPuzzle,
    href: '/integration-settings',
  },
  {
    label: 'User Management',
    icon: IoPeople,
    href: '/user-management',
  },
];

interface DashboardLayoutProps {
  children: ReactNode;
  userName?: string;
}

export default function DashboardLayout({ children, userName = 'John Doe' }: DashboardLayoutProps) {
  const [openMenus, setOpenMenus] = useState<{ [key: string]: boolean }>({});

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
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
            IT Factory
          </Typography>
        </Box>

        <List sx={{ px: 1 }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const hasSubmenu = !!item.submenu;
            const isOpen = openMenus[item.label] || false;

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
                    cursor: hasSubmenu ? 'pointer' : 'default',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
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
                      {item.submenu!.map((subItem) => (
                        <ListItem
                          key={subItem.label}
                          component={Link}
                          href={subItem.href}
                          sx={{
                            pl: 4,
                            color: 'white',
                            borderRadius: 1,
                            borderLeft: `3px solid ${subItem.color}`,
                            ml: 2,
                            mb: 0.5,
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
                          }}
                        >
                          <ListItemText primary={subItem.label} />
                        </ListItem>
                      ))}
                    </List>
                  </Collapse>
                )}
              </Box>
            );
          })}
        </List>
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
            <Typography variant="h5" sx={{ fontFamily: 'Georgia, serif', color: 'white' }}>
              Sortr
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              (Admin) {userName}
            </Typography>
            <IconButton size="small" sx={{ color: 'white' }}>
              <IoLogOut size={20} />
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
