/**
 * Sheba Sound — Forgot Password Page
 * ------------------------------------
 * Full-screen page wrapping the ForgotPasswordForm with a link back to Login.
 */

import { Box, Container, Paper, Typography, Link as MuiLink } from '@mui/material';
import { Link } from 'react-router-dom';
import Logo from '@/components/common/Logo';
import ForgotPasswordForm from '@/features/auth/components/ForgotPasswordForm';
import { ROUTES } from '@/utils/constants';

const ForgotPasswordPage: React.FC = () => (
  <Box
    sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: (theme) =>
        theme.palette.mode === 'dark'
          ? 'linear-gradient(160deg, #0D0D1A 0%, #1A1A3E 50%, #0D0D1A 100%)'
          : 'linear-gradient(160deg, #F5F5F0 0%, #E8F5E9 50%, #F5F5F0 100%)',
      px: 2,
      py: 4,
    }}
  >
    <Container maxWidth="xs">
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 4 },
          borderRadius: 4,
          textAlign: 'center',
        }}
      >
        {/* ---- Branding ---- */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Logo />
        </Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Reset Password
        </Typography>

        {/* ---- Form ---- */}
        <ForgotPasswordForm />

        {/* ---- Link ---- */}
        <MuiLink
          component={Link}
          to={ROUTES.LOGIN}
          variant="body2"
          underline="hover"
          sx={{ mt: 2, display: 'inline-block' }}
        >
          Back to Sign In
        </MuiLink>
      </Paper>
    </Container>
  </Box>
);

export default ForgotPasswordPage;
