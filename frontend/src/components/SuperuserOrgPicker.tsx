"use client";

import { useState } from "react";
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Popover,
  TextField,
  Typography,
} from "@mui/material";
import { Organization } from "@/lib/api";
import { setStoredOrgId } from "@/hooks/useOrganizations";

interface Props {
  currentOrg: Organization | undefined;
  organizations: Organization[];
}

export default function SuperuserOrgPicker({ currentOrg, organizations }: Props) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [search, setSearch] = useState("");

  const filtered = organizations.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelect = (orgId: string) => {
    setStoredOrgId(orgId);
    setAnchor(null);
    window.location.reload();
  };

  return (
    <>
      <Box
        component="button"
        onClick={(e) => setAnchor(e.currentTarget as HTMLElement)}
        sx={{ background: "none", border: "none", cursor: "pointer", p: 0, textAlign: "left" }}
      >
        <Typography variant="body2" sx={{ color: "primary.main", fontSize: "0.9rem" }}>
          {currentOrg?.name || "Select org"} ▾
        </Typography>
      </Box>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => { setAnchor(null); setSearch(""); }}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <Box sx={{ p: 1.5, width: 260 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Search organizations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <List dense sx={{ maxHeight: 320, overflow: "auto", mt: 0.5 }}>
            {filtered.map((org) => (
              <ListItem
                key={org.id}
                onClick={() => handleSelect(org.id)}
                sx={{
                  borderRadius: 1,
                  cursor: "pointer",
                  bgcolor: org.id === currentOrg?.id ? "action.selected" : "transparent",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <ListItemText
                  primary={org.name}
                  primaryTypographyProps={{ fontSize: "0.875rem" }}
                />
              </ListItem>
            ))}
            {filtered.length === 0 && (
              <ListItem>
                <ListItemText
                  primary="No results"
                  primaryTypographyProps={{ fontSize: "0.8rem", color: "text.secondary" }}
                />
              </ListItem>
            )}
          </List>
        </Box>
      </Popover>
    </>
  );
}
