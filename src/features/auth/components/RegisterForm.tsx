/**
 * Sheba Sound — Registration Form
 * ---------------------------------
 * Supports registration via Email or Phone Number.
 * Phone-based registration is the default for Ethiopian users.
 * Dark-themed form with toggle, purple Register button + social auth.
 */

import { useState, type FormEvent } from "react";
import {
  Box, TextField, Button, IconButton, InputAdornment, CircularProgress,
  ToggleButton, ToggleButtonGroup, Typography, InputLabel,
} from "@mui/material";
import { Visibility, VisibilityOff, Phone, Email } from "@mui/icons-material";
import { showSnackbar } from "@/features/ui/uiSlice";
import { useAppDispatch } from "@/app/hooks";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/utils/constants";
import { useRegisterMutation } from "@/features/auth/authApi";
import type { RegisterRequest } from "@/types/auth";
import SocialAuthButtons from "@/features/auth/components/SocialAuthButtons";

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

const RegisterForm: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [register] = useRegisterMutation();
  const [isLoading, setIsLoading] = useState(false);

  // Registration method toggle — phone is default for Ethiopian users
  const [method, setMethod] = useState<"phone" | "email">("phone");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  /**
   * Normalizes Ethiopian phone numbers to E.164 format.
   * Accepts: 0912345678, 912345678, 0712345678, 712345678, +251912345678
   */
  const normalizePhone = (raw: string): string => {
    const cleaned = raw.replace(/[\s\-()]/g, "");
    if (cleaned.startsWith("+251")) return cleaned;
    if (cleaned.startsWith("251") && cleaned.length === 12) return `+${cleaned}`;
    if (cleaned.startsWith("0") && cleaned.length === 10) return `+251${cleaned.slice(1)}`;
    if ((cleaned.startsWith("9") || cleaned.startsWith("7")) && cleaned.length === 9) return `+251${cleaned}`;
    return cleaned; // fallback — let backend validate
  };

  const validate = (): string | null => {
    if (!username.trim()) return "Username is required.";
    if (!password) return "Password is required.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (!passwordConfirm) return "Please confirm your password.";
    if (password !== passwordConfirm) return "Passwords do not match.";

    if (method === "email") {
      if (!email.trim()) return "Email is required.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email.";
    } else {
      if (!phoneNumber.trim()) return "Phone number is required.";
      const normalized = normalizePhone(phoneNumber);
      if (!/^\+251[79]\d{8}$/.test(normalized)) {
        return "Please enter a valid Ethiopian phone number (e.g. 0912345678).";
      }
    }
    return null;
  };

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    const error = validate();
    if (error) { dispatch(showSnackbar({ message: error, severity: "warning" })); return; }

    const payload: RegisterRequest = {
      registration_method: method,
      username: username.trim(),
      first_name: username.trim(),
      last_name: "",
      password,
      password_confirm: passwordConfirm,
    };

    if (method === "email") {
      payload.email = email.trim();
    } else {
      payload.phone_number = normalizePhone(phoneNumber);
    }

    setIsLoading(true);
    try {
      const data = await register(payload).unwrap();
      if (method === "phone") {
        // Phone-registered users are auto-verified, show success
        dispatch(showSnackbar({ message: data.message || "Registration successful! Please sign in.", severity: "success" }));
      } else if (data.verification_email_sent === false) {
        dispatch(showSnackbar({
          message: data.message || "Account created, but the verification email could not be sent. After you sign in, use Resend in the top banner.",
          severity: "warning",
        }));
      } else {
        dispatch(showSnackbar({
          message: data.message || "Check your email for a private link to verify your address. The link works once and expires after a few days.",
          severity: "success",
        }));
      }
      navigate(ROUTES.LOGIN, { replace: true });
    } catch (err: unknown) {
      const errData = (err as { data?: Record<string, unknown> })?.data;
      const message = (errData?.detail as string)
        ?? (errData ? Object.values(errData).flat().join(' ') : null)
        ?? "Registration failed. Please try again.";
      dispatch(showSnackbar({ message, severity: "error" }));
    } finally { setIsLoading(false); }
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
          <ToggleButton value="phone" id="reg-method-phone">
            <Phone sx={{ fontSize: 18, mr: 0.8 }} /> Phone
          </ToggleButton>
          <ToggleButton value="email" id="reg-method-email">
            <Email sx={{ fontSize: 18, mr: 0.8 }} /> Email
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* ---- Username ---- */}
      <TextField
        margin="normal" required fullWidth size="small"
        id="reg-username" name="username" label="Username" autoComplete="username"
        autoFocus value={username} onChange={(e) => setUsername(e.target.value)}
        disabled={isLoading} sx={darkFieldSx}
      />

      {/* ---- Password ---- */}
      <TextField
        margin="normal" required fullWidth size="small"
        id="reg-password" name="password" label="Password"
        type={showPassword ? "text" : "password"} autoComplete="new-password"
        value={password} onChange={(e) => setPassword(e.target.value)}
        disabled={isLoading} sx={darkFieldSx}
        slotProps={{ input: { endAdornment: (
          <InputAdornment position="end">
            <IconButton onClick={() => setShowPassword((p) => !p)} edge="end" size="small" sx={{ color: 'rgba(255,255,255,0.4)' }}>
              {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
            </IconButton>
          </InputAdornment>
        ) } }}
      />

      {/* ---- Confirm Password ---- */}
      <TextField
        margin="normal" required fullWidth size="small"
        id="reg-password-confirm" name="password_confirm" label="Confirm Password"
        type={showPassword ? "text" : "password"} autoComplete="new-password"
        value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)}
        disabled={isLoading} sx={darkFieldSx}
      />

      {/* ---- Phone Number (when phone method) ---- */}
      {method === "phone" && (
        <Box sx={{ mt: 1 }}>
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
              id="reg-phone"
              type="tel"
              placeholder="9XXXXXXXX or 7XXXXXXXX"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isLoading}
              style={{
                flex: 1, border: 'none', outline: 'none',
                background: 'transparent', color: '#fff',
                fontSize: '0.95rem', padding: '10px 12px',
                fontFamily: 'inherit',
              }}
            />
          </Box>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', ml: 0.5, mt: 0.3, display: 'block' }}>
            E.g. 0912345678 or 912345678
          </Typography>
        </Box>
      )}

      {/* ---- Email (when email method) ---- */}
      {method === "email" && (
        <TextField
          margin="normal" required fullWidth size="small"
          id="reg-email" name="email" label="Email" type="email" autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading} sx={darkFieldSx}
        />
      )}

      {/* ---- Register Button ---- */}
      <Button
        type="submit" fullWidth variant="contained" disabled={isLoading} id="reg-submit"
        sx={{
          mt: 2.5, mb: 1.5, py: 1.3, borderRadius: 2,
          background: '#7C3AED !important', fontWeight: 700,
          fontSize: '0.95rem', textTransform: 'none', letterSpacing: 0.5,
          boxShadow: '0 4px 20px rgba(124,58,237,0.3)',
          '&:hover': {
            background: '#6D28D9 !important', transform: 'scale(1.01)',
            boxShadow: '0 6px 28px rgba(124,58,237,0.4)',
          },
          transition: 'all 0.2s ease',
        }}
      >
        {isLoading ? <CircularProgress size={22} color="inherit" /> : "Register"}
      </Button>

      <SocialAuthButtons mode="register" />
    </Box>
  );
};

export default RegisterForm;
