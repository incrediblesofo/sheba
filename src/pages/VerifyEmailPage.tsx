/**
 * Sheba Sound — Verify Email Page
 * ----------------------------------
 * Landing page for the email verification link.
 * Reads `uid` and `token` from the URL query string, calls the backend
 * verify endpoint, and displays a success or error state.
 */

import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Button,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import { useLazyVerifyEmailQuery } from '@/features/auth/authApi';

function verifyEmailErrorDetail(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('data' in error)) return undefined;
  const data = (error as { data?: unknown }).data;
  if (typeof data !== 'object' || data === null || !('detail' in data)) return undefined;
  const detail = (data as { detail?: unknown }).detail;
  return typeof detail === 'string' ? detail : undefined;
}

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const uid = searchParams.get('uid') ?? '';
  const token = searchParams.get('token') ?? '';

  const [trigger, { data, error, isLoading, isUninitialized }] =
    useLazyVerifyEmailQuery();

  useEffect(() => {
    if (uid && token) {
      trigger({ uid, token });
    }
  }, [uid, token, trigger]);

  const isMissingParams = !uid || !token;
  const isSuccess = data?.verified || data?.already_verified;
  const isError = !!error || isMissingParams;
  const errorMessage =
    isMissingParams
      ? 'This page needs the full link from your email (it includes uid and token). Open the message again or use Resend after signing in.'
      : verifyEmailErrorDetail(error)
        ?? 'This link may have expired or already been used. Sign in and tap Resend in the banner to get a fresh link.';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#0D0D1A',
        backgroundImage:
          'radial-gradient(ellipse 60% 40% at 50% 30%, rgba(212,175,55,0.08) 0%, transparent 60%)',
        p: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          textAlign: 'center',
          p: { xs: 4, sm: 6 },
          maxWidth: 480,
          width: '100%',
          borderRadius: 4,
          bgcolor: '#1A1A2E',
          border: '1px solid rgba(212,175,55,0.15)',
          boxShadow: '0 8px 48px rgba(0,0,0,0.4)',
        }}
      >
        {/* Loading state */}
        {(isLoading || isUninitialized) && !isMissingParams && (
          <>
            <CircularProgress
              size={60}
              thickness={3}
              sx={{ color: '#D4AF37', mb: 3 }}
            />
            <Typography variant="h5" fontWeight={700} color="#fff" gutterBottom>
              Confirming your email…
            </Typography>
            <Typography variant="body2" color="text.secondary">
              We’re checking the one-time link from your inbox. This only takes a moment.
            </Typography>
          </>
        )}

        {/* Success */}
        {isSuccess && (
          <>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'rgba(18,166,74,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
                animation: 'popIn 0.4s ease both',
                '@keyframes popIn': {
                  from: { transform: 'scale(0)' },
                  to: { transform: 'scale(1)' },
                },
              }}
            >
              {data?.already_verified ? (
                <MarkEmailReadIcon sx={{ fontSize: 40, color: '#1DB954' }} />
              ) : (
                <CheckCircleIcon sx={{ fontSize: 40, color: '#1DB954' }} />
              )}
            </Box>
            <Typography variant="h5" fontWeight={800} color="#fff" gutterBottom>
              {data?.already_verified
                ? 'Already verified'
                : 'Email verified'}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {data?.already_verified
                ? 'Your address was already confirmed. You’re all set.'
                : 'Your address is confirmed. That verification link was single-use and will not work again — you can delete the email if you like.'}
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/')}
              sx={{
                background: 'linear-gradient(135deg, #D4AF37, #B8962E)',
                color: '#0D0D1A',
                fontWeight: 700,
                borderRadius: 20,
                px: 4,
                textTransform: 'none',
                '&:hover': {
                  background: 'linear-gradient(135deg, #E5C54A, #D4AF37)',
                },
              }}
            >
              Start Listening
            </Button>
          </>
        )}

        {/* Error */}
        {isError && !isLoading && (
          <>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'rgba(218,18,26,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
              }}
            >
              <ErrorOutlineIcon sx={{ fontSize: 40, color: '#F06E73' }} />
            </Box>
            <Typography variant="h5" fontWeight={800} color="#fff" gutterBottom>
              Link didn’t work
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {errorMessage}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, opacity: 0.85 }}>
              Signed in already? Use <strong>Resend</strong> in the gold banner at the top of the app for a new link.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/login')}
                sx={{
                  borderColor: '#D4AF37',
                  color: '#D4AF37',
                  borderRadius: 20,
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { borderColor: '#E5C54A', bgcolor: 'rgba(212,175,55,0.08)' },
                }}
              >
                Go to Login
              </Button>
              <Button
                variant="contained"
                onClick={() => navigate('/')}
                sx={{
                  background: 'linear-gradient(135deg, #D4AF37, #B8962E)',
                  color: '#0D0D1A',
                  fontWeight: 700,
                  borderRadius: 20,
                  textTransform: 'none',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #E5C54A, #D4AF37)',
                  },
                }}
              >
                Go Home
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default VerifyEmailPage;
