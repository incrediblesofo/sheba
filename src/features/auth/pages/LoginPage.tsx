/**
 * Sheba Sound — Login Page
 * -------------------------
 * Dark-themed "Welcome back!" sign-in page with centered card,
 * matching the provided UI design screenshot.
 */

import { Box, Container, Typography, Link as MuiLink } from '@mui/material';
import { Link } from 'react-router-dom';
import LoginForm from '@/features/auth/components/LoginForm';
import { ROUTES } from '@/utils/constants';

const LoginPage: React.FC = () => (
  <Box
    sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0a',
      px: 2,
      py: 4,
    }}
  >
    <Container maxWidth="xs">
      <Box
        sx={{
          p: { xs: 3, sm: 4 },
          borderRadius: 4,
          textAlign: 'center',
          bgcolor: '#111111',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 16px 64px rgba(0,0,0,0.5)',
        }}
      >
        {/* ---- Heading ---- */}
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            color: '#fff',
            mb: 1,
            fontSize: { xs: '1.75rem', sm: '2rem' },
          }}
        >
          Welcome back!
        </Typography>
        <Typography
          variant="body2"
          sx={{
            mb: 3,
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.9rem',
          }}
        >
          Sign in to discover, stream,{' '}
          <em style={{ fontStyle: 'italic' }}>and</em> enjoy millions of songs.
        </Typography>

        {/* ---- Form ---- */}
        <LoginForm />

        {/* ---- Register Link ---- */}
        <Typography
          variant="body2"
          sx={{ mt: 3, color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}
        >
          Need an account?{' '}
          <MuiLink
            component={Link}
            to={ROUTES.REGISTER}
            underline="hover"
            sx={{
              color: '#A78BFA',
              fontWeight: 700,
              '&:hover': { color: '#C4B5FD' },
            }}
          >
            Register
          </MuiLink>
        </Typography>
      </Box>
    </Container>
  </Box>
);

export default LoginPage;
