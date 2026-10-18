/**
 * Sheba Sound — Login Form
 * -------------------------
 * Dark-themed login form supporting both Email and Phone Number login.
 * Phone is default for Ethiopian users. Purple Sign In button + social auth.
 * Uses the real Django REST backend via RTK Query mutations.
 */

import { useState, type FormEvent } from "react";
import {
  Box, TextField, Button, IconButton, InputAdornment, CircularProgress,
  Link as MuiLink, ToggleButton, ToggleButtonGroup, Typography, InputLabel,
} from "@mui/material";
import { Visibility, VisibilityOff, Phone, Email } from "@mui/icons-material";
import { Link } from "react-router-dom";
import { setCredentials } from "@/features/auth/authSlice";
import { showSnackbar } from "@/features/ui/uiSlice";
import { useAppDispatch } from "@/app/hooks";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/utils/constants";
import { UserRole } from "@/types/models";
import { useLoginMutation } from "@/features/auth/authApi";
import type { LoginRequest, LoginResponse } from "@/types/auth";
import SocialAuthButtons from "@/features/auth/components/SocialAuthButtons";

/* Dark input field style */
const darkFieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: 'transparent', borderRadius: 2, color: '#fff',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
    '&.Mui-focused fieldset': { borderColor: '#7C3AED' },
  },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#7C3AED' },
};

const LoginForm: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [login] = useLoginMutation();

  const [method, setMethod] = useState<"phone" | "email">("phone");
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Normalizes Ethiopian phone numbers to E.164 format.
   */
  const normalizePhone = (raw: string): string => {
    const cleaned = raw.replace(/[\s\-()]/g, "");
    if (cleaned.startsWith("+251")) return cleaned;
    if (cleaned.startsWith("251") && cleaned.length === 12) return `+${cleaned}`;
    if (cleaned.startsWith("0") && cleaned.length === 10) return `+251${cleaned.slice(1)}`;
    if ((cleaned.startsWith("9") || cleaned.startsWith("7")) && cleaned.length === 9) return `+251${cleaned}`;
    return cleaned;
  };

  /* ---- Shared success handler ---- */
  const handleLoginSuccess = (data: LoginResponse): void => {
    dispatch(
      setCredentials({
        user: data.user,
        accessToken: data.tokens.access,
        refreshToken: data.tokens.refresh,
      }),
    );
    dispatch(
      showSnackbar({
        message: `Welcome, ${data.user.first_name || data.user.username}!`,
        severity: "success",
      }),
    );

    /* Navigate to the correct home page based on role */
    switch (data.user.role) {
      case UserRole.Artist:
        navigate(ROUTES.ARTIST_DASHBOARD, { replace: true });
        break;
      case UserRole.Admin:
        navigate(ROUTES.ADMIN_DASHBOARD, { replace: true });
        break;
      default:
        navigate(ROUTES.LISTENER_HOME, { replace: true });
    }
  };

  /* ---- Form submit ---- */
  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();

    if (method === "phone") {
      if (!phoneNumber.trim()) {
        dispatch(showSnackbar({ message: "Please enter your phone number.", severity: "warning" }));
        return;
      }
    } else {
      if (!emailOrUsername.trim()) {
        dispatch(showSnackbar({ message: "Please enter your email or username.", severity: "warning" }));
        return;
      }
    }
    if (!password) {
      dispatch(showSnackbar({ message: "Please enter your password.", severity: "warning" }));
      return;
    }

    const payload: LoginRequest = { password };

    if (method === "phone") {
      payload.login_method = "phone";
      payload.phone_number = normalizePhone(phoneNumber);
    } else {
      payload.login_method = "email";
      payload.email = emailOrUsername.trim();
    }

    setIsLoading(true);
    try {
      const data = await login(payload).unwrap();
      handleLoginSuccess(data);
    } catch (err: unknown) {
      const errData = (err as { data?: Record<string, unknown> })?.data;
      const message =
        (errData?.detail as string) ??
        (errData ? Object.values(errData).flat().join(' ') : null) ??
        "Login failed. Please check your credentials.";
      dispatch(showSnackbar({ message, severity: "error" }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      {/* ---- Method Toggle ---- */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <ToggleButtonGroup
          value={method}
          exclusive
          onChange={(_, v) => v && setMethod(v)}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              color: 'rgba(255,255,255,0.5)',
              borderColor: 'rgba(255,255,255,0.15)',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              px: 2.5,
              py: 0.8,
              '&.Mui-selected': {
                bgcolor: 'rgba(124,58,237,0.2)',
                color: '#A78BFA',
                borderColor: '#7C3AED',
                '&:hover': { bgcolor: 'rgba(124,58,237,0.3)' },
              },
              '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
            },
          }}
        >
          <ToggleButton value="phone" id="login-method-phone">
            <Phone sx={{ fontSize: 18, mr: 0.8 }} /> Phone
          </ToggleButton>
          <ToggleButton value="email" id="login-method-email">
            <Email sx={{ fontSize: 18, mr: 0.8 }} /> Email
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* ---- Phone Number Input ---- */}
      {method === "phone" && (
        <Box sx={{ mb: 1 }}>
          <InputLabel sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', mb: 0.5, ml: 0.5 }}>
            Phone Number
          </InputLabel>
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 0,
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 2, overflow: 'hidden',
            transition: 'border-color 0.2s',
            '&:hover': { borderColor: 'rgba(255,255,255,0.4)' },
            '&:focus-within': { borderColor: '#7C3AED' },
          }}>
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 0.5,
              px: 1.5, py: 0.8, bgcolor: 'rgba(255,255,255,0.05)',
              borderRight: '1px solid rgba(255,255,255,0.15)',
              minWidth: 70,
            }}>
              <Typography sx={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                🇪🇹 +251
              </Typography>
            </Box>
            <input
              id="login-phone"
              type="tel"
              placeholder="9XXXXXXXX or 7XXXXXXXX"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isLoading}
              autoFocus
              style={{
                flex: 1, border: 'none', outline: 'none',
                background: 'transparent', color: '#fff',
                fontSize: '0.95rem', padding: '10px 12px',
                fontFamily: 'inherit',
              }}
            />
          </Box>
        </Box>
      )}

      {/* ---- Email / Username Input ---- */}
      {method === "email" && (
        <TextField
          margin="normal" required fullWidth size="small"
          id="login-email" name="email" label="Email" autoComplete="email"
          autoFocus value={emailOrUsername}
          onChange={(e) => setEmailOrUsername(e.target.value)}
          disabled={isLoading} sx={darkFieldSx}
        />
      )}

      {/* ---- Password ---- */}
      <TextField
        margin="normal" required fullWidth size="small"
        id="login-password" name="password" label="Password"
        type={showPassword ? "text" : "password"} autoComplete="current-password"
        value={password} onChange={(e) => setPassword(e.target.value)}
        disabled={isLoading} sx={darkFieldSx}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={() => setShowPassword((prev) => !prev)}
                  edge="end" size="small" sx={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />

      {/* ---- Sign In Button ---- */}
      <Button
        type="submit" fullWidth variant="contained" disabled={isLoading} id="login-submit"
        sx={{
          mt: 2.5, mb: 1.5, py: 1.3, borderRadius: 2,
          background: '#7C3AED !important', fontWeight: 700,
          fontSize: '0.95rem', textTransform: 'none', letterSpacing: 0.5,
          boxShadow: '0 4px 20px rgba(124, 58, 237, 0.3)',
          '&:hover': {
            background: '#6D28D9 !important', transform: 'scale(1.01)',
            boxShadow: '0 6px 28px rgba(124, 58, 237, 0.4)',
          },
          transition: 'all 0.2s ease',
        }}
      >
        {isLoading ? <CircularProgress size={22} color="inherit" /> : "Sign in"}
      </Button>

      {/* ---- Forgot Password ---- */}
      <Box sx={{ textAlign: 'center', mb: 1 }}>
        <MuiLink
          component={Link} to={ROUTES.FORGOT_PASSWORD}
          variant="body2" underline="hover"
          sx={{ color: '#A78BFA', fontSize: '0.85rem', '&:hover': { color: '#C4B5FD' } }}
        >
          Forgot your password?
        </MuiLink>
      </Box>

      {/* ── Social sign-in ── */}
      <SocialAuthButtons mode="login" />
    </Box>
  );
};

export default LoginForm;
