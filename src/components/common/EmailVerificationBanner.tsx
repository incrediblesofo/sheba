/**
 * Sheba Sound — Email Verification Banner
 * ------------------------------------------
 * A persistent, animated banner displayed at the top of the app when the
 * authenticated user has not yet verified their email.
 * Includes a "Resend Email" button with loading state and cooldown.
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  CircularProgress,
  Collapse,
} from '@mui/material';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useAppSelector } from '@/app/hooks';
import { useResendVerificationMutation } from '@/features/auth/authApi';

const COOLDOWN_SECONDS = 60;

const EmailVerificationBanner: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const [dismissed, setDismissed] = useState(false);
  const [resendVerification, { isLoading }] = useResendVerificationMutation();
  const [cooldown, setCooldown] = useState(0);
  const [sent, setSent] = useState(false);

  // Don't show if not authenticated, already verified, or dismissed
  const show = isAuthenticated && user && !user.is_verified && !dismissed;

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || isLoading) return;
    try {
      await resendVerification().unwrap();
      setSent(true);
      setCooldown(COOLDOWN_SECONDS);
      // Reset "sent" message after a few seconds
      setTimeout(() => setSent(false), 5000);
    } catch {
      // Error state is handled by RTK Query
    }
  };

  return (
    <Collapse in={!!show}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: { xs: 1, sm: 2 },
          px: { xs: 2, sm: 3 },
          py: 1,
          background: 'linear-gradient(90deg, #D4AF37 0%, #B8962E 50%, #D4AF37 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 3s ease infinite',
          '@keyframes shimmer': {
            '0%': { backgroundPosition: '200% 0' },
            '100%': { backgroundPosition: '-200% 0' },
          },
          color: '#0D0D1A',
          position: 'relative',
          zIndex: 1300,
          flexWrap: 'wrap',
        }}
      >
        <MailOutlineIcon sx={{ fontSize: 18, flexShrink: 0 }} />
        <Typography
          variant="body2"
          fontWeight={600}
          sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
        >
          Open the email we sent you and tap the verification link (one-time, expires after a few days).
        </Typography>

        <Button
          size="small"
          variant="contained"
          onClick={handleResend}
          disabled={isLoading || cooldown > 0}
          startIcon={
            isLoading ? (
              <CircularProgress size={14} color="inherit" />
            ) : sent ? (
              <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />
            ) : undefined
          }
          sx={{
            bgcolor: '#0D0D1A',
            color: '#D4AF37',
            fontWeight: 700,
            fontSize: '0.7rem',
            textTransform: 'none',
            borderRadius: 20,
            px: 2,
            py: 0.5,
            minWidth: 'auto',
            '&:hover': { bgcolor: '#1A1A2E' },
            '&:disabled': { opacity: 0.7, bgcolor: '#0D0D1A', color: '#D4AF37' },
          }}
        >
          {sent
            ? 'Sent!'
            : cooldown > 0
              ? `Resend (${cooldown}s)`
              : 'Resend Email'}
        </Button>

        <IconButton
          size="small"
          onClick={() => setDismissed(true)}
          sx={{
            color: '#0D0D1A',
            opacity: 0.6,
            '&:hover': { opacity: 1 },
            ml: 'auto',
          }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    </Collapse>
  );
};

export default EmailVerificationBanner;
