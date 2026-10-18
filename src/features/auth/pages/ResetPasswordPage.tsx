/**
 * Sheba Sound — Reset Password Page
 * -----------------------------------
 * Full-screen page that accepts a new password using the uid/token
 * from the password reset email link.
 *
 * URL: /reset-password/:uid/:token
 */

import { useState, type FormEvent } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Link as MuiLink,
  InputAdornment,
  IconButton,
  Alert,
} from '@mui/material';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Visibility, VisibilityOff, LockReset, CheckCircleOutline } from '@mui/icons-material';
import Logo from '@/components/common/Logo';
import { useResetPasswordMutation } from '@/features/auth/authApi';
import { showSnackbar } from '@/features/ui/uiSlice';
import { useAppDispatch } from '@/app/hooks';
import { ROUTES } from '@/utils/constants';

const ResetPasswordPage: React.FC = () => {
  const { uid, token } = useParams<{ uid: string; token: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Validate link params
  if (!uid || !token) {
    return (
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
            sx={{ p: { xs: 3, sm: 4 }, borderRadius: 4, textAlign: 'center' }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <Logo />
            </Box>
            <Alert severity="error" sx={{ mb: 2 }}>
              Invalid password reset link. Please request a new one.
            </Alert>
            <MuiLink
              component={Link}
              to={ROUTES.FORGOT_PASSWORD}
              variant="body2"
              underline="hover"
            >
              Request New Reset Link
            </MuiLink>
          </Paper>
        </Container>
      </Box>
    );
  }

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      await resetPassword({
        uid,
        token,
        new_password: password,
        new_password_confirm: confirmPassword,
      }).unwrap();

      setSuccess(true);
      dispatch(
        showSnackbar({
          message: 'Password reset successfully! You can now sign in.',
          severity: 'success',
        }),
      );

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate(ROUTES.LOGIN);
      }, 3000);
    } catch (err: unknown) {
      const message =
        (err as { data?: { detail?: string } })?.data?.detail ??
        'Failed to reset password. The link may be invalid or expired.';
      setError(message);
      dispatch(showSnackbar({ message, severity: 'error' }));
    }
  };

  return (
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

          {success ? (
            /* ---- Success State ---- */
            <Box sx={{ mt: 2 }}>
              <CheckCircleOutline
                sx={{ fontSize: 64, color: 'success.main', mb: 2 }}
              />
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Password Reset!
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Your password has been reset successfully. You'll be redirected
                to the login page shortly.
              </Typography>
              <MuiLink
                component={Link}
                to={ROUTES.LOGIN}
                variant="body2"
                underline="hover"
              >
                Go to Sign In now
              </MuiLink>
            </Box>
          ) : (
            /* ---- Form State ---- */
            <>
              <LockReset
                sx={{
                  fontSize: 48,
                  color: 'primary.main',
                  mb: 1,
                }}
              />
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Set New Password
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 2 }}
              >
                Enter your new password below. Make sure it's at least 8
                characters long.
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2, textAlign: 'left' }}>
                  {error}
                </Alert>
              )}

              <Box
                component="form"
                onSubmit={handleSubmit}
                noValidate
                sx={{ mt: 1 }}
              >
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="New Password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword((p) => !p)}
                          edge="end"
                          size="small"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="confirmPassword"
                  label="Confirm New Password"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowConfirm((p) => !p)}
                          edge="end"
                          size="small"
                        >
                          {showConfirm ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={isLoading}
                  sx={{ mt: 3, mb: 2, py: 1.4 }}
                >
                  {isLoading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'Reset Password'
                  )}
                </Button>
              </Box>

              <MuiLink
                component={Link}
                to={ROUTES.LOGIN}
                variant="body2"
                underline="hover"
                sx={{ mt: 1, display: 'inline-block' }}
              >
                Back to Sign In
              </MuiLink>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default ResetPasswordPage;
