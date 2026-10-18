/**
 * Sheba Sound — Forgot Password Form
 * ------------------------------------
 * Sends a password-reset email to the given address.
 */

import { useState, type FormEvent } from 'react';
import {
  Box,
  TextField,
  Button,
  CircularProgress,
  Typography,
} from '@mui/material';
import { useForgotPasswordMutation } from '@/features/auth/authApi';
import { showSnackbar } from '@/features/ui/uiSlice';
import { useAppDispatch } from '@/app/hooks';

const ForgotPasswordForm: React.FC = () => {
  const dispatch = useAppDispatch();
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();

    if (!email) {
      dispatch(
        showSnackbar({
          message: 'Please enter your email address.',
          severity: 'warning',
        }),
      );
      return;
    }

    try {
      await forgotPassword({ email }).unwrap();
      setSubmitted(true);
      dispatch(
        showSnackbar({
          message: 'Password reset link sent! Check your email.',
          severity: 'success',
        }),
      );
    } catch (err: unknown) {
      const message =
        (err as { data?: { detail?: string } })?.data?.detail ??
        'Failed to send reset email. Please try again.';
      dispatch(showSnackbar({ message, severity: 'error' }));
    }
  };

  if (submitted) {
    return (
      <Box sx={{ textAlign: 'center', mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Check your inbox
        </Typography>
        <Typography variant="body2" color="text.secondary">
          If an account with <strong>{email}</strong> exists, we've sent a
          password reset link. Please check your email and follow the
          instructions.
        </Typography>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Enter the email address associated with your account and we'll send you
        a link to reset your password.
      </Typography>

      <TextField
        margin="normal"
        required
        name="email"
        label="Email Address"
        type="email"
        autoComplete="email"
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={isLoading}
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
          'Send Reset Link'
        )}
      </Button>
    </Box>
  );
};

export default ForgotPasswordForm;
