'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Paper,
  Divider,
  TextField,
  IconButton,
  Checkbox,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useCategories } from '@/hooks/useCategories';
import { organizationApi, emailsApi, categoryApi, Member, Email } from '@/lib/api';
import { CaseStatusChip, SeverityChip } from '@/lib/email-status-chips';
import { stripReplyQuote } from '@/lib/strip-reply-quote';
import { apiFetch } from '@/lib/swr-config';
import useSWR from 'swr';

function formatDateTime(raw: string): string {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMailAccountLine(e: Email | undefined): string {
  if (!e) return '—';
  const name = e.mail_account_name?.trim();
  return name || '—';
}

/** Tighter shell padding + narrow gap to thread panel (see DashboardLayout contentSx + row gap). */
const threadContentSx = { p: 1.5 };

const REPLY_EMOJI_QUICK = ['👍', '❤️', '😊', '🎉', '👋', '🙏', '💬', '✅'] as const;

export default function ThreadPage({
  params,
}: {
  params: Promise<{ id: string; threadId: string }>;
}) {
  const { id: categoryId, threadId } = use(params);
  const router = useRouter();
  const { user, token, isLoading: isLoadingAuth } = useAuth();
  const { currentOrg } = useOrganizations();

  const { data: members, isLoading: isLoadingMembers } = useSWR<Member[]>(
    currentOrg && token ? ['members', currentOrg.id, token] : null,
    ([_, orgId, tok]) => organizationApi.listMembers(orgId as string, tok as string),
    { revalidateOnFocus: false }
  );

  const currentUserRole = members?.find(m => m.user_id === user?.id)?.role;

  const { categories, isLoading: isLoadingCategories } = useCategories({
    userId: user?.id,
    userRole: currentUserRole,
  });
  const category = categories.find(c => c.id === categoryId);

  const { data: emails, isLoading: isLoadingEmails } = useSWR<Email[]>(
    currentOrg && token && category ? ['thread-emails', currentOrg.id, categoryId, threadId, token] : null,
    ([_, orgId, catId, tid, tok]) =>
      emailsApi.listThreadEmails(orgId as string, catId as string, tid as string, tok as string),
    { revalidateOnFocus: false }
  );

  const titleSubject = useMemo(() => emails?.[0]?.subject?.trim() || '', [emails]);

  /** First message in the thread; fields like status/severity are shared across the thread. */
  const threadSample = emails?.[0];

  type CategoryMember = { user_id: string; user_email: string; user_full_name?: string; role: string };
  const { data: categoryMembers } = useSWR<CategoryMember[]>(
    currentOrg && token && category ? ['category-members', currentOrg.id, categoryId, token] : null,
    ([_, orgId, catId, tok]) =>
      categoryApi.listCategoryMembers(orgId as string, catId as string, tok as string),
    { revalidateOnFocus: false },
  );

  type ThreadCase = { assigned_to: string | null; assigned_to_name: string | null };
  const threadCaseKey = currentOrg && token && threadId
    ? ['thread-case', currentOrg.id, threadId, token]
    : null;
  const { data: threadCase, mutate: mutateThreadCase } = useSWR<ThreadCase>(
    threadCaseKey,
    async ([_, orgId, tid, tok]) => {
      const resp = await apiFetch(
        `/organizations/${orgId}/emails/threads/${encodeURIComponent(tid as string)}/case`,
        { headers: { Authorization: `Bearer ${tok as string}` } },
      );
      return resp.json();
    },
    { revalidateOnFocus: false },
  );

  const [assignLoading, setAssignLoading] = useState(false);
  const [assignFeedback, setAssignFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const handleAssign = async (userId: string | null) => {
    if (!currentOrg || !token || !threadId) return;
    setAssignLoading(true);
    setAssignFeedback(null);
    try {
      const updated = await emailsApi.assignThread(currentOrg.id, threadId, userId, token);
      mutateThreadCase(prev => ({ ...prev, ...updated }), false);
      const name = updated.assigned_to_name;
      setAssignFeedback({
        type: 'success',
        message: name ? `Assigned to ${name}` : 'Unassigned successfully',
      });
      setTimeout(() => setAssignFeedback(prev => prev?.type === 'success' ? null : prev), 3000);
    } catch (err) {
      setAssignFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to assign thread',
      });
    } finally {
      setAssignLoading(false);
    }
  };

  const [replyBody, setReplyBody] = useState('');
  const [replyInternalNote, setReplyInternalNote] = useState(false);
  const replyInputRef = useRef<HTMLTextAreaElement | null>(null);

  const insertReplyEmoji = (emoji: string) => {
    const el = replyInputRef.current;
    if (!el) {
      setReplyBody(s => (s ? `${s} ${emoji}` : emoji));
      return;
    }
    const start = el.selectionStart ?? replyBody.length;
    const end = el.selectionEnd ?? replyBody.length;
    const before = replyBody.slice(0, start);
    const after = replyBody.slice(end);
    const spacer = before.length > 0 && !before.endsWith(' ') && !before.endsWith('\n') ? ' ' : '';
    const inserted = `${before}${spacer}${emoji}${after}`;
    setReplyBody(inserted);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + spacer.length + emoji.length;
      el.setSelectionRange(pos, pos);
    });
  };

  useEffect(() => {
    if (!isLoadingAuth && !user) {
      router.replace('/login');
    }
  }, [isLoadingAuth, user, router]);

  if (isLoadingAuth || isLoadingMembers || isLoadingCategories) {
    return (
      <DashboardLayout
        userName={user?.full_name}
        userRole={currentUserRole}
        contentSx={threadContentSx}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout userName={undefined} userRole={undefined} contentSx={threadContentSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  if (!category) {
    return (
      <DashboardLayout
        userName={user.full_name}
        userRole={currentUserRole}
        contentSx={threadContentSx}
      >
        <Typography variant="h5" sx={{ color: 'text.secondary' }}>
          You do not have access to this category.
        </Typography>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      userName={user?.full_name}
      userRole={currentUserRole}
      contentSx={threadContentSx}
    >
      {isLoadingEmails ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            // Fill the dashboard scroll region (flex parent); only needed on wide layout.
            flex: { xs: 'none', lg: 1 },
            minHeight: { lg: 0 },
          }}
        >
          <Box sx={{ flexShrink: 0 }}>
            <Button
              component={Link}
              href={`/categories/${categoryId}`}
              size="small"
              startIcon={<ArrowBackIcon fontSize="small" />}
              sx={{
                color: 'text.secondary',
                mb: 2,
                fontSize: '0.8125rem',
                py: 0.25,
                minHeight: 32,
                textTransform: 'none',
              }}
            >
              Back to {category.name}
            </Button>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              {category.color && (
                <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: category.color, flexShrink: 0 }} />
              )}
              <Typography variant="h4" sx={{ color: 'white' }}>
                {titleSubject || '(no subject)'}
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              flex: { xs: 'none', lg: 1 },
              flexDirection: { xs: 'column', lg: 'row' },
              gap: { xs: 1.5, lg: 0.5 },
              alignItems: 'stretch',
              minHeight: { xs: 'auto', lg: 0 },
            }}
          >
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                minHeight: { xs: 'auto', lg: 0 },
                overflow: { xs: 'visible', lg: 'hidden' },
              }}
            >
              <Box
                sx={{
                  flex: { xs: 'none', lg: 1 },
                  minHeight: { xs: 'auto', lg: 0 },
                  overflow: { xs: 'visible', lg: 'auto' },
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                {!emails?.length ? (
                  <Typography sx={{ color: 'text.secondary' }}>No messages in this thread.</Typography>
                ) : (
                  emails.map(email => (
                    <Paper
                      key={email.id}
                      elevation={0}
                      sx={{
                        bgcolor: 'background.paper',
                        p: 2,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        flexShrink: 0,
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          justifyContent: 'space-between',
                          gap: 1,
                          mb: 1.5,
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          {email.sender || '—'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {formatDateTime(email.date || email.created_at)}
                        </Typography>
                      </Box>
                      <Divider sx={{ mb: 1.5, borderColor: 'rgba(255,255,255,0.08)' }} />
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'grey.100',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {stripReplyQuote(email.body || '') || '—'}
                      </Typography>
                    </Paper>
                  ))
                )}
              </Box>

              <Paper
                elevation={0}
                sx={{
                  flexShrink: 0,
                  p: 2,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  ...(category.color && {
                    borderLeft: '3px solid',
                    borderLeftColor: category.color,
                  }),
                }}
              >
                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{ color: 'text.primary', fontWeight: 600, mb: 0.5 }}
                  >
                    Reply to this thread
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Compose your reply below.
                  </Typography>
                </Box>

                <TextField
                  fullWidth
                  multiline
                  minRows={4}
                  maxRows={16}
                  placeholder="Type your message…"
                  value={replyBody}
                  onChange={e => setReplyBody(e.target.value)}
                  variant="outlined"
                  size="small"
                  inputRef={replyInputRef}
                  sx={{
                    mb: 1.5,
                    '& .MuiInputBase-input': { color: 'text.primary' },
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'action.hover',
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'divider',
                      },
                    },
                  }}
                />

                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                    rowGap: 1.5,
                  }}
                >
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, flex: '1 1 auto', minWidth: 0 }}>
                    {REPLY_EMOJI_QUICK.map(emoji => (
                      <IconButton
                        key={emoji}
                        type="button"
                        size="small"
                        onClick={() => insertReplyEmoji(emoji)}
                        sx={{
                          fontSize: '1.125rem',
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                          color: 'text.primary',
                          '&:hover': {
                            bgcolor: 'action.selected',
                            borderColor: 'text.secondary',
                          },
                        }}
                        aria-label={`Insert ${emoji}`}
                      >
                        {emoji}
                      </IconButton>
                    ))}
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 1.5,
                      flexShrink: 0,
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={replyInternalNote}
                          onChange={e => setReplyInternalNote(e.target.checked)}
                          size="small"
                          color="primary"
                        />
                      }
                      label="Internal note"
                      sx={{
                        m: 0,
                        userSelect: 'none',
                        '& .MuiFormControlLabel-label': { fontSize: '0.875rem' },
                      }}
                    />
                    <Button
                      type="button"
                      variant="contained"
                      color="primary"
                      size="medium"
                      disabled={!replyBody.trim()}
                      endIcon={<SendRoundedIcon sx={{ fontSize: 20 }} />}
                      onClick={() => {
                        /* Reply API not wired yet — pass replyInternalNote when implemented */
                      }}
                      sx={{
                        minHeight: 40,
                        px: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        boxShadow: 2,
                        ...(category.color && {
                          backgroundColor: category.color,
                          '&:hover': {
                            backgroundColor: category.color,
                            filter: 'brightness(0.92)',
                          },
                        }),
                      }}
                    >
                      Send
                    </Button>
                  </Box>
                </Box>
              </Paper>
            </Box>

            <Paper
              elevation={0}
              sx={{
                width: { xs: '100%', lg: 280 },
                flexShrink: 0,
                alignSelf: 'stretch',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'background.paper',
                p: 2,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 2 }}>
                Thread
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: '1 1 auto' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.25 }}>
                    Status
                  </Typography>
                  <CaseStatusChip caseStatus={threadSample?.case_status} />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.25 }}>
                    Severity
                  </Typography>
                  <SeverityChip severity={threadSample?.severity} />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.25 }}>
                    Category
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'grey.100' }}>
                    {category.name}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.25 }}>
                    Mail Account
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'grey.100' }}>
                    {formatMailAccountLine(threadSample)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.25 }}>
                    Assigned to
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={threadCase?.assigned_to ?? '__none__'}
                      onChange={e => {
                        const v = e.target.value as string;
                        handleAssign(v === '__none__' ? null : v);
                      }}
                      disabled={assignLoading || !categoryMembers}
                      displayEmpty
                      sx={{
                        fontSize: '0.875rem',
                        color: 'grey.100',
                        '.MuiSelect-icon': { color: 'text.secondary' },
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                      }}
                    >
                      <MenuItem value="__none__">
                        Unassigned
                      </MenuItem>
                      {categoryMembers?.map(m => (
                        <MenuItem key={m.user_id} value={m.user_id}>
                          {m.user_full_name || m.user_email}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {assignFeedback && (
                    <Alert
                      severity={assignFeedback.type}
                      onClose={() => setAssignFeedback(null)}
                      sx={{ mt: 1, py: 0, fontSize: '0.75rem' }}
                    >
                      {assignFeedback.message}
                    </Alert>
                  )}
                </Box>
              </Box>
            </Paper>
          </Box>
        </Box>
      )}
    </DashboardLayout>
  );
}
