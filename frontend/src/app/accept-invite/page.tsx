'use client';

import { useState, useEffect, Suspense } from 'react';
import { Box, TextField, Button, Typography, Link, CircularProgress, Chip } from '@mui/material';
import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { mutate as swrMutate } from 'swr';
import { invitationApi, OrgInvitationPreview, authApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useSnackbar } from '@/contexts/SnackbarContext';

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { user, token: authToken, signin } = useAuth();
  const { showSnackbar } = useSnackbar();

  const [invite, setInvite] = useState<OrgInvitationPreview | null>(null);
  const [isLoadingInvite, setIsLoadingInvite] = useState(true);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setInviteError('Invalid or missing invitation link.');
      setIsLoadingInvite(false);
      return;
    }
    invitationApi.getPreview(token)
      .then(setInvite)
      .catch((err) => setInviteError(err.message || 'Invitation not found or has expired.'))
      .finally(() => setIsLoadingInvite(false));
  }, [token]);

  const handleAccept = async () => {
    if (!authToken) return;
    setIsSubmitting(true);
    try {
      await invitationApi.accept(token, authToken);
      showSnackbar(`You've joined ${invite!.org_name}!`, 'success');
      router.push('/dashboard');
    } catch (err: any) {
      showSnackbar(err.message || 'Failed to accept invitation', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async () => {
    setIsSubmitting(true);
    try {
      await invitationApi.decline(token);
      showSnackbar('Invitation declined', 'info');
      router.push('/login');
    } catch (err: any) {
      showSnackbar(err.message || 'Failed to decline invitation', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await authApi.signin({ email, password });
      localStorage.setItem('auth_token', response.access_token);
      localStorage.setItem('auth_user', JSON.stringify(response.user));
      await swrMutate('auth_user', response.user, { revalidate: false });
      await invitationApi.accept(token, response.access_token);
      showSnackbar(`You've joined ${invite!.org_name}!`, 'success');
      router.push('/dashboard');
    } catch (err: any) {
      showSnackbar(err.message || 'Login failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await invitationApi.acceptAndRegister(token, { full_name: fullName, password });
      localStorage.setItem('auth_token', response.access_token);
      localStorage.setItem('auth_user', JSON.stringify(response.user));
      await swrMutate('auth_user', response.user, { revalidate: false });
      showSnackbar(`Account created! Welcome to ${invite!.org_name}.`, 'success');
      router.push('/dashboard');
    } catch (err: any) {
      showSnackbar(err.message || 'Failed to create account', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleColor = invite?.role === 'admin' ? '#ff9800' : '#2196f3';

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', px: 2 }}>
      <Typography variant="h1" sx={{ fontFamily: 'var(--font-inria-serif), serif', fontWeight: 700, letterSpacing: '-0.15em', fontSize: '3rem', mb: 8, color: 'white' }}>
        Sortr
      </Typography>

      <Box sx={{ width: '100%', maxWidth: 400 }}>
        {isLoadingInvite && (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        )}

        {inviteError && (
          <>
            <Typography variant="h5" sx={{ mb: 2, color: 'white', fontWeight: 600, textAlign: 'center' }}>
              Invalid Invitation
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary', textAlign: 'center' }}>
              {inviteError}
            </Typography>
            <Box sx={{ textAlign: 'center' }}>
              <Link component={NextLink} href="/login" sx={{ color: 'white', textDecoration: 'underline' }}>
                Back to Login
              </Link>
            </Box>
          </>
        )}

        {invite && (
          <>
            {/* Invite summary */}
            <Box data-testid="invite-preview" sx={{ mb: 4, p: 3, bgcolor: '#2c2c2c', borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                {invite.invited_by_email} invited you to join
              </Typography>
              <Typography data-testid="invite-org-name" variant="h5" sx={{ color: 'white', fontWeight: 700, mb: 1 }}>
                {invite.org_name}
              </Typography>
              <span data-testid="invite-role-chip">
                <Chip label={invite.role.toUpperCase()} sx={{ bgcolor: roleColor, color: 'white', fontWeight: 600 }} />
              </span>
            </Box>

            {/* Already logged in as correct user */}
            {user && user.email === invite.invited_email && (
              <>
                <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary', textAlign: 'center' }}>
                  Logged in as <strong style={{ color: 'white' }}>{user.email}</strong>
                </Typography>
                <Button data-testid="accept-invite-accept-button" fullWidth variant="contained" onClick={handleAccept} disabled={isSubmitting} sx={{ py: 1.5, fontWeight: 600, textTransform: 'none', mb: 1.5 }}>
                  {isSubmitting ? 'Accepting...' : 'Accept Invitation'}
                </Button>
                <Button data-testid="accept-invite-decline-button" fullWidth variant="text" onClick={handleDecline} disabled={isSubmitting} sx={{ textTransform: 'none', color: 'text.secondary' }}>
                  Decline
                </Button>
              </>
            )}

            {/* Logged in as wrong account */}
            {user && user.email !== invite.invited_email && (
              <Typography data-testid="accept-invite-wrong-account" variant="body2" sx={{ color: '#f44336', textAlign: 'center' }}>
                This invitation was sent to <strong>{invite.invited_email}</strong>. Please log out and use that account.
              </Typography>
            )}

            {/* Not logged in — existing user: show login form */}
            {!user && invite.user_exists && (
              <Box component="form" onSubmit={handleLoginAndAccept}>
                <Typography variant="h6" sx={{ mb: 3, color: 'white', fontWeight: 600, textAlign: 'center' }}>
                  Log in to accept
                </Typography>
                <Typography variant="body1" sx={{ mb: 1, color: 'white', fontWeight: 500 }}>Email</Typography>
                <TextField fullWidth type="email" placeholder={invite.invited_email} value={email} onChange={(e) => setEmail(e.target.value)} disabled={isSubmitting} inputProps={{ 'data-testid': 'accept-invite-email-input' }} sx={{ mb: 2 }} />
                <Typography variant="body1" sx={{ mb: 1, color: 'white', fontWeight: 500 }}>Password</Typography>
                <TextField fullWidth type="password" placeholder="••••••••••••••••" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isSubmitting} inputProps={{ 'data-testid': 'accept-invite-password-input' }} sx={{ mb: 3 }} />
                <Button data-testid="accept-invite-login-submit-button" fullWidth type="submit" variant="contained" disabled={isSubmitting} sx={{ py: 1.5, fontWeight: 600, textTransform: 'none', mb: 1.5 }}>
                  {isSubmitting ? 'Logging in...' : 'Log In & Accept'}
                </Button>
                <Button data-testid="accept-invite-decline-button" fullWidth variant="text" onClick={handleDecline} disabled={isSubmitting} sx={{ textTransform: 'none', color: 'text.secondary' }}>
                  Decline
                </Button>
              </Box>
            )}

            {/* Not logged in — new user: show register form */}
            {!user && !invite.user_exists && (
              <Box component="form" onSubmit={handleRegisterAndAccept}>
                <Typography variant="h6" sx={{ mb: 3, color: 'white', fontWeight: 600, textAlign: 'center' }}>
                  Create your account to join
                </Typography>
                <Typography variant="body1" sx={{ mb: 1, color: 'white', fontWeight: 500 }}>Full Name</Typography>
                <TextField fullWidth placeholder="Your name" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={isSubmitting} inputProps={{ 'data-testid': 'accept-invite-fullname-input' }} sx={{ mb: 2 }} />
                <Typography variant="body1" sx={{ mb: 1, color: 'white', fontWeight: 500 }}>Email</Typography>
                <TextField fullWidth value={invite.invited_email} disabled sx={{ mb: 2 }} />
                <Typography variant="body1" sx={{ mb: 1, color: 'white', fontWeight: 500 }}>Password</Typography>
                <TextField fullWidth type="password" placeholder="••••••••••••••••" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isSubmitting} inputProps={{ 'data-testid': 'accept-invite-register-password-input' }} sx={{ mb: 3 }} />
                <Button data-testid="accept-invite-register-submit-button" fullWidth type="submit" variant="contained" disabled={isSubmitting} sx={{ py: 1.5, fontWeight: 600, textTransform: 'none', mb: 1.5 }}>
                  {isSubmitting ? 'Creating account...' : 'Create Account & Accept'}
                </Button>
                <Button data-testid="accept-invite-decline-button" fullWidth variant="text" onClick={handleDecline} disabled={isSubmitting} sx={{ textTransform: 'none', color: 'text.secondary' }}>
                  Decline
                </Button>
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}><CircularProgress /></Box>}>
      <AcceptInviteContent />
    </Suspense>
  );
}
