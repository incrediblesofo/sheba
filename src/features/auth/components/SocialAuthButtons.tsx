/**
 * Sheba Sound — Social Auth Buttons
 * -----------------------------------
 * Side-by-side Google and Facebook buttons matching the UI design.
 * Google uses the real GSI library; Facebook is a placeholder.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, CircularProgress, Divider, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@/app/hooks';
import { showSnackbar } from '@/features/ui/uiSlice';
import { setCredentials } from '@/features/auth/authSlice';
import { useGoogleAuthMutation } from '@/features/auth/authApi';
import { ROUTES } from '@/utils/constants';
import { UserRole } from '@/types/models';
import type { LoginResponse } from '@/types/auth';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

/* ── SVG brand icons ─── */
const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

const FacebookIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#1877F2" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
  </svg>
);

const SocialAuthButtons: React.FC<{ mode?: 'login' | 'register' }> = ({ mode = 'login' }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [googleAuth] = useGoogleAuthMutation();
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleInitialized = useRef(false);
  const hiddenGoogleBtnRef = useRef<HTMLDivElement>(null);

  const handleLoginSuccess = useCallback((data: LoginResponse) => {
    dispatch(setCredentials({ user: data.user, accessToken: data.tokens.access, refreshToken: data.tokens.refresh }));
    dispatch(showSnackbar({ message: `Welcome, ${data.user.first_name || data.user.username}!`, severity: 'success' }));
    switch (data.user.role) {
      case UserRole.Artist: navigate(ROUTES.ARTIST_DASHBOARD, { replace: true }); break;
      case UserRole.Admin: navigate(ROUTES.ADMIN_DASHBOARD, { replace: true }); break;
      default: navigate(ROUTES.LISTENER_HOME, { replace: true });
    }
  }, [dispatch, navigate]);

  const handleGoogleCredential = useCallback(async (response: google.accounts.id.CredentialResponse) => {
    setGoogleLoading(true);
    try {
      const data = await googleAuth({ id_token: response.credential }).unwrap();
      handleLoginSuccess(data);
    } catch (err: unknown) {
      const errData = (err as { data?: Record<string, unknown> })?.data;
      dispatch(showSnackbar({ message: (errData?.detail as string) ?? 'Google sign-in failed.', severity: 'error' }));
    } finally { setGoogleLoading(false); }
  }, [dispatch, googleAuth, handleLoginSuccess]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || googleInitialized.current) return;
    const initGoogle = () => {
      if (typeof google === 'undefined' || !google?.accounts?.id) { setTimeout(initGoogle, 200); return; }
      google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleCredential, auto_select: false, cancel_on_tap_outside: true, context: mode === 'register' ? 'signup' : 'signin', ux_mode: 'popup' });
      if (hiddenGoogleBtnRef.current) {
        google.accounts.id.renderButton(hiddenGoogleBtnRef.current, { type: 'standard', size: 'large', theme: 'filled_black', text: mode === 'register' ? 'signup_with' : 'continue_with', width: '300' });
      }
      googleInitialized.current = true;
    };
    initGoogle();
  }, [handleGoogleCredential, mode]);

  const clickHiddenGoogleButton = useCallback(() => {
    const container = hiddenGoogleBtnRef.current;
    if (!container) return false;
    const btn = container.querySelector<HTMLElement>('[role="button"]') ?? container.querySelector<HTMLElement>('div') ?? container;
    btn.click();
    return true;
  }, []);

  const handleGoogleClick = () => {
    if (!GOOGLE_CLIENT_ID) { dispatch(showSnackbar({ message: 'Google sign-in is not configured.', severity: 'warning' })); return; }
    if (typeof google === 'undefined' || !google?.accounts?.id) { dispatch(showSnackbar({ message: 'Google sign-in is loading, please try again.', severity: 'info' })); return; }
    google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        const reason = notification.isNotDisplayed() ? notification.getNotDisplayedReason() : notification.getSkippedReason();
        if (reason === 'opt_out_or_no_session') { dispatch(showSnackbar({ message: 'Please sign in to your Google account first.', severity: 'info' })); return; }
        if (!clickHiddenGoogleButton()) { dispatch(showSnackbar({ message: 'Unable to open Google sign-in. Please refresh.', severity: 'warning' })); }
      }
    });
  };

  const handleFacebook = () => { dispatch(showSnackbar({ message: 'Facebook sign-in coming soon!', severity: 'info' })); };

  /* Shared button style */
  const btnSx = {
    flex: 1, py: 1, borderRadius: 2, textTransform: 'none' as const,
    fontWeight: 600, fontSize: '0.8rem', borderColor: 'rgba(255,255,255,0.2)',
    color: '#fff', bgcolor: 'transparent',
    '&:hover': { borderColor: 'rgba(255,255,255,0.4)', bgcolor: 'rgba(255,255,255,0.05)' },
    transition: 'all 0.2s ease',
  };

  return (
    <Box sx={{ mt: 1 }}>
      {/* Hidden GSI button */}
      <Box ref={hiddenGoogleBtnRef} sx={{ position: 'absolute', left: -9999, top: -9999, width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }} />

      {/* Divider */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Divider sx={{ flex: 1, borderColor: 'rgba(255,255,255,0.12)' }} />
        <Typography variant="caption" sx={{ whiteSpace: 'nowrap', px: 1, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
          or continue with
        </Typography>
        <Divider sx={{ flex: 1, borderColor: 'rgba(255,255,255,0.12)' }} />
      </Box>

      {/* Side-by-side buttons */}
      <Box sx={{ display: 'flex', gap: 1.5 }}>
        <Button variant="outlined" onClick={handleGoogleClick} disabled={googleLoading}
          startIcon={googleLoading ? <CircularProgress size={14} color="inherit" /> : <GoogleIcon />}
          sx={btnSx}>
          Google
        </Button>
        <Button variant="outlined" onClick={handleFacebook}
          startIcon={<FacebookIcon />}
          sx={btnSx}>
          Facebook
        </Button>
      </Box>
    </Box>
  );
};

export default SocialAuthButtons;
