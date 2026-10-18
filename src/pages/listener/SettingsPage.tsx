/**
 * Sheba Sound — Listener Settings Page
 * --------------------------------------
 * Account settings: profile image, display name, email, password change,
 * notification preferences, and theme toggle.
 */

import { useState, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Divider,
  Switch,
  FormControlLabel,
  Avatar,
  IconButton,
  Fade,
  CircularProgress,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import HdIcon from '@mui/icons-material/Hd';
import StarIcon from '@mui/icons-material/Star';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import PersonIcon from '@mui/icons-material/Person';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { showSnackbar } from '@/features/ui/uiSlice';
import { setUser, logOut } from '@/features/auth/authSlice';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useUpdateAvatarMutation, useRemoveAvatarMutation, useDeleteAccountMutation } from '@/features/auth/authApi';
import { useGetCurrentSubscriptionQuery } from '@/features/music/musicApi';
import { ROUTES } from '@/utils/constants';

const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const SettingsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const user = useAppSelector((state) => state.auth.user);
  const { isPremium } = usePremiumStatus();

  /* ---- Subscription data ---- */
  const { data: subData } = useGetCurrentSubscriptionQuery();

  /* ---- Avatar state ---- */
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarHover, setAvatarHover] = useState(false);
  const [updateAvatar, { isLoading: isUploading }] = useUpdateAvatarMutation();
  const [removeAvatar, { isLoading: isRemoving }] = useRemoveAvatarMutation();

  /* ---- Delete account state ---- */
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteAccount, { isLoading: isDeleting }] = useDeleteAccountMutation();

  /* ---- Form state ---- */
  const [form, setForm] = useState({
    first_name: user?.first_name ?? '',
    last_name: user?.last_name ?? '',
    email: user?.email ?? '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [prefs, setPrefs] = useState({
    emailNotifications: true,
    pushNotifications: false,
    newReleaseAlerts: true,
    weeklyDigest: false,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [audioQuality, setAudioQuality] = useState<'high' | 'standard'>(isPremium ? 'high' : 'standard');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePrefToggle = (key: keyof typeof prefs) => (): void => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /* ---- Avatar handlers ---- */
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      dispatch(showSnackbar({ message: 'Please select a valid image (JPEG, PNG, WebP, or GIF).', severity: 'warning' }));
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      dispatch(showSnackbar({ message: `Image must be smaller than ${MAX_SIZE_MB}MB.`, severity: 'warning' }));
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleAvatarUpload = async (): Promise<void> => {
    if (!avatarFile) return;

    const formData = new FormData();
    formData.append('avatar', avatarFile);

    try {
      const result = await updateAvatar(formData).unwrap();
      dispatch(setUser(result.user));
      dispatch(showSnackbar({ message: 'Profile image updated! 🎉', severity: 'success' }));
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch {
      dispatch(showSnackbar({ message: 'Failed to upload image. Please try again.', severity: 'error' }));
    }
  };

  const handleAvatarRemove = async (): Promise<void> => {
    try {
      const result = await removeAvatar().unwrap();
      dispatch(setUser(result.user));
      dispatch(showSnackbar({ message: 'Profile image removed.', severity: 'info' }));
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch {
      dispatch(showSnackbar({ message: 'Failed to remove image. Please try again.', severity: 'error' }));
    }
  };

  const handleCancelPreview = (): void => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  /* ---- Form handlers ---- */
  const handleSaveProfile = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) {
      dispatch(showSnackbar({ message: 'Name fields are required.', severity: 'warning' }));
      return;
    }
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setIsSaving(false);
    dispatch(showSnackbar({ message: 'Profile updated. (Demo — not persisted)', severity: 'success' }));
  };

  const handleChangePassword = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!form.currentPassword || !form.newPassword) {
      dispatch(showSnackbar({ message: 'Please fill in all password fields.', severity: 'warning' }));
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      dispatch(showSnackbar({ message: 'New passwords do not match.', severity: 'error' }));
      return;
    }
    if (form.newPassword.length < 8) {
      dispatch(showSnackbar({ message: 'Password must be at least 8 characters.', severity: 'warning' }));
      return;
    }
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setIsSaving(false);
    setForm((prev) => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    dispatch(showSnackbar({ message: 'Password changed. (Demo — not persisted)', severity: 'success' }));
  };

  const displayAvatar = avatarPreview ?? user?.avatar_url ?? null;

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Manage your account, preferences, and notifications.
      </Typography>

      {/* ---- Profile Image ---- */}
      <Paper
        id="profile-image-section"
        sx={{
          p: { xs: 2.5, sm: 4 },
          borderRadius: 3,
          maxWidth: 700,
          mb: 4,
          background: isDark
            ? 'linear-gradient(135deg, rgba(18,166,74,0.04) 0%, rgba(10,10,15,0.6) 100%)'
            : 'linear-gradient(135deg, rgba(7,137,48,0.03) 0%, #fff 100%)',
          border: isDark
            ? '1px solid rgba(255,255,255,0.05)'
            : '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2.5 }}>
          Profile Image
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: { xs: 'center', sm: 'flex-start' },
            gap: { xs: 2, sm: 3 },
            flexDirection: { xs: 'column', sm: 'row' },
          }}
        >
          {/* Avatar with hover overlay */}
          <Box
            sx={{
              position: 'relative',
              flexShrink: 0,
              cursor: 'pointer',
            }}
            onMouseEnter={() => setAvatarHover(true)}
            onMouseLeave={() => setAvatarHover(false)}
            onClick={() => avatarInputRef.current?.click()}
          >
            <Avatar
              src={displayAvatar ?? undefined}
              alt={user?.first_name}
              sx={{
                width: { xs: 96, sm: 120 },
                height: { xs: 96, sm: 120 },
                background: 'linear-gradient(135deg, #12A64A 0%, #078930 100%)',
                fontSize: 48,
                fontWeight: 800,
                boxShadow: isDark
                  ? '0 6px 28px rgba(0,0,0,0.4), 0 0 0 3px rgba(18,166,74,0.15)'
                  : '0 4px 20px rgba(0,0,0,0.1), 0 0 0 3px rgba(7,137,48,0.08)',
                transition: 'all 0.3s ease',
                filter: avatarHover ? 'brightness(0.55)' : 'none',
              }}
            >
              <PersonIcon sx={{ fontSize: 48 }} />
            </Avatar>

            {/* Camera overlay */}
            <Fade in={avatarHover}>
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.25,
                }}
              >
                <CameraAltIcon sx={{ color: '#fff', fontSize: 28 }} />
                <Typography
                  sx={{
                    color: '#fff',
                    fontSize: '0.6rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  {displayAvatar ? 'Change' : 'Upload'}
                </Typography>
              </Box>
            </Fade>

            {/* Subtle pulsing ring when no avatar set */}
            {!displayAvatar && !avatarHover && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: -4,
                  borderRadius: '50%',
                  border: '2px dashed',
                  borderColor: isDark ? 'rgba(18,166,74,0.3)' : 'rgba(7,137,48,0.2)',
                  animation: 'pulse-ring 2s ease-in-out infinite',
                  '@keyframes pulse-ring': {
                    '0%, 100%': { opacity: 0.6, transform: 'scale(1)' },
                    '50%': { opacity: 1, transform: 'scale(1.04)' },
                  },
                }}
              />
            )}

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              onChange={handleAvatarSelect}
            />
          </Box>

          {/* Info and action buttons */}
          <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, fontSize: '1rem', mb: 0.25 }}
            >
              {user?.first_name} {user?.last_name}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', fontSize: '0.82rem', mb: 2 }}
            >
              {displayAvatar
                ? 'Click the image to change your photo, or use the buttons below.'
                : 'Add a profile photo so others can recognise you.'}
            </Typography>

            {/* Preview indicator */}
            {avatarFile && (
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 500,
                  bgcolor: isDark ? 'rgba(18,166,74,0.12)' : 'rgba(7,137,48,0.08)',
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(18,166,74,0.25)' : 'rgba(7,137,48,0.15)',
                  mb: 2,
                }}
              >
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: '#12A64A',
                    animation: 'blink 1.2s ease-in-out infinite',
                    '@keyframes blink': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0.3 },
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.68rem',
                    color: '#12A64A',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Preview — Save to apply
                </Typography>
              </Box>
            )}

            {/* Action buttons */}
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                flexWrap: 'wrap',
                justifyContent: { xs: 'center', sm: 'flex-start' },
              }}
            >
              {avatarFile ? (
                <>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={
                      isUploading ? (
                        <CircularProgress size={14} sx={{ color: '#fff' }} />
                      ) : (
                        <CloudUploadIcon sx={{ fontSize: 16 }} />
                      )
                    }
                    onClick={handleAvatarUpload}
                    disabled={isUploading}
                    sx={{
                      borderRadius: 500,
                      px: 2.5,
                      py: 0.8,
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      textTransform: 'none',
                      color: '#fff',
                      background: 'linear-gradient(135deg, #12A64A 0%, #078930 100%)',
                      boxShadow: '0 2px 12px rgba(18,166,74,0.25)',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #1ED760 0%, #12A64A 100%)',
                        boxShadow: '0 4px 16px rgba(18,166,74,0.35)',
                        transform: 'scale(1.03)',
                      },
                    }}
                  >
                    {isUploading ? 'Uploading…' : 'Save Image'}
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleCancelPreview}
                    disabled={isUploading}
                    sx={{
                      borderRadius: 500,
                      px: 2,
                      py: 0.8,
                      fontWeight: 600,
                      fontSize: '0.78rem',
                      textTransform: 'none',
                      borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
                      color: 'text.secondary',
                      '&:hover': {
                        borderColor: 'text.primary',
                        color: 'text.primary',
                      },
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<CameraAltIcon sx={{ fontSize: 16 }} />}
                    onClick={() => avatarInputRef.current?.click()}
                    sx={{
                      borderRadius: 500,
                      px: 2.5,
                      py: 0.8,
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      textTransform: 'none',
                      color: '#fff',
                      background: 'linear-gradient(135deg, #12A64A 0%, #078930 100%)',
                      boxShadow: '0 2px 12px rgba(18,166,74,0.25)',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #1ED760 0%, #12A64A 100%)',
                        boxShadow: '0 4px 16px rgba(18,166,74,0.35)',
                        transform: 'scale(1.03)',
                      },
                    }}
                  >
                    {displayAvatar ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                  {displayAvatar && (
                    <IconButton
                      size="small"
                      onClick={handleAvatarRemove}
                      disabled={isRemoving}
                      sx={{
                        border: '1px solid',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        width: 36,
                        height: 36,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: 'error.main',
                          bgcolor: 'rgba(211,47,47,0.06)',
                          color: 'error.main',
                        },
                      }}
                      title="Remove profile image"
                    >
                      {isRemoving ? (
                        <CircularProgress size={14} />
                      ) : (
                        <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                      )}
                    </IconButton>
                  )}
                </>
              )}
            </Box>

            {/* Help text */}
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mt: 1.5,
                color: 'text.secondary',
                fontSize: '0.7rem',
                opacity: 0.7,
              }}
            >
              JPEG, PNG, WebP, or GIF · Max {MAX_SIZE_MB}MB · Recommended 400×400px
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* ---- Profile Information ---- */}
      <Paper
        component="form"
        onSubmit={handleSaveProfile}
        noValidate
        sx={{ p: { xs: 2, sm: 4 }, borderRadius: 3, maxWidth: 700, mb: 4 }}
      >
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
          Profile Information
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              required
              name="first_name"
              label="First Name"
              value={form.first_name}
              onChange={handleChange}
              disabled={isSaving}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              required
              name="last_name"
              label="Last Name"
              value={form.last_name}
              onChange={handleChange}
              disabled={isSaving}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              name="email"
              label="Email"
              value={form.email}
              onChange={handleChange}
              disabled={isSaving}
              helperText="Changing your email will require re-verification"
            />
          </Grid>
          <Grid size={12}>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Profile'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* ---- Change Password ---- */}
      <Paper
        component="form"
        onSubmit={handleChangePassword}
        noValidate
        sx={{ p: { xs: 2, sm: 4 }, borderRadius: 3, maxWidth: 700, mb: 4 }}
      >
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
          Change Password
        </Typography>
        <Grid container spacing={2}>
          <Grid size={12}>
            <TextField
              name="currentPassword"
              label="Current Password"
              type="password"
              value={form.currentPassword}
              onChange={handleChange}
              disabled={isSaving}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              name="newPassword"
              label="New Password"
              type="password"
              value={form.newPassword}
              onChange={handleChange}
              disabled={isSaving}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              name="confirmPassword"
              label="Confirm New Password"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              disabled={isSaving}
            />
          </Grid>
          <Grid size={12}>
            <Button
              type="submit"
              variant="outlined"
              disabled={isSaving}
            >
              Change Password
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* ---- Audio Quality ---- */}
      <Paper sx={{ p: { xs: 2, sm: 4 }, borderRadius: 3, maxWidth: 700, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <HdIcon sx={{ color: isPremium ? '#F39C12' : 'text.disabled' }} />
          <Typography variant="h6" fontWeight={600}>
            Audio Quality
          </Typography>
          {isPremium && (
            <Box
              sx={{
                bgcolor: 'rgba(243,156,18,0.15)',
                color: '#F39C12',
                px: 1,
                py: 0.2,
                borderRadius: 1,
                fontSize: '0.65rem',
                fontWeight: 800,
                letterSpacing: '0.05em',
              }}
            >
              PREMIUM
            </Box>
          )}
        </Box>

        {isPremium ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box
              onClick={() => setAudioQuality('high')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2,
                borderRadius: 2,
                cursor: 'pointer',
                border: audioQuality === 'high' ? '2px solid #F39C12' : '1px solid',
                borderColor: audioQuality === 'high' ? '#F39C12' : 'divider',
                transition: 'all 0.15s ease',
                '&:hover': { borderColor: '#F39C12' },
              }}
            >
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  border: '2px solid',
                  borderColor: audioQuality === 'high' ? '#F39C12' : 'text.disabled',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {audioQuality === 'high' && (
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#F39C12' }} />
                )}
              </Box>
              <Box>
                <Typography variant="body2" fontWeight={700}>High Quality</Typography>
                <Typography variant="caption" color="text.secondary">320kbps — Best audio fidelity</Typography>
              </Box>
            </Box>

            <Box
              onClick={() => setAudioQuality('standard')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2,
                borderRadius: 2,
                cursor: 'pointer',
                border: audioQuality === 'standard' ? '2px solid' : '1px solid',
                borderColor: audioQuality === 'standard' ? 'primary.main' : 'divider',
                transition: 'all 0.15s ease',
                '&:hover': { borderColor: 'primary.main' },
              }}
            >
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  border: '2px solid',
                  borderColor: audioQuality === 'standard' ? 'primary.main' : 'text.disabled',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {audioQuality === 'standard' && (
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
                )}
              </Box>
              <Box>
                <Typography variant="body2" fontWeight={700}>Standard</Typography>
                <Typography variant="caption" color="text.secondary">128kbps — Uses less data</Typography>
              </Box>
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              p: 3,
              textAlign: 'center',
              borderRadius: 2,
              background: (t) =>
                t.palette.mode === 'dark'
                  ? 'rgba(243,156,18,0.05)'
                  : 'rgba(243,156,18,0.04)',
              border: '1px dashed rgba(243,156,18,0.25)',
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              You're streaming in Standard quality (128kbps).
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<StarIcon />}
              href="/subscription"
              sx={{
                bgcolor: '#F39C12',
                color: '#000',
                fontWeight: 700,
                borderRadius: 99,
                px: 3,
                '&:hover': { bgcolor: '#E67E22' },
              }}
            >
              Upgrade for High Quality (320kbps)
            </Button>
          </Box>
        )}
      </Paper>


      {/* ---- Notification Preferences ---- */}
      <Paper sx={{ p: { xs: 2, sm: 4 }, borderRadius: 3, maxWidth: 700, mb: 4 }}>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
          Notification Preferences
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <FormControlLabel
            control={<Switch checked={prefs.emailNotifications} onChange={handlePrefToggle('emailNotifications')} />}
            label="Email Notifications"
          />
          <FormControlLabel
            control={<Switch checked={prefs.pushNotifications} onChange={handlePrefToggle('pushNotifications')} />}
            label="Push Notifications"
          />
          <Divider sx={{ my: 1 }} />
          <FormControlLabel
            control={<Switch checked={prefs.newReleaseAlerts} onChange={handlePrefToggle('newReleaseAlerts')} />}
            label="New Release Alerts"
          />
          <FormControlLabel
            control={<Switch checked={prefs.weeklyDigest} onChange={handlePrefToggle('weeklyDigest')} />}
            label="Weekly Music Digest"
          />
        </Box>
      </Paper>

      {/* ---- Subscription Status ---- */}
      <Paper
        id="subscription-status-section"
        sx={{
          p: { xs: 2, sm: 4 },
          borderRadius: 3,
          maxWidth: 700,
          mb: 4,
          border: isPremium ? '1px solid rgba(243,156,18,0.3)' : '1px solid',
          borderColor: isPremium ? 'rgba(243,156,18,0.3)' : 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <CreditCardIcon sx={{ color: isPremium ? '#F39C12' : 'text.secondary' }} />
          <Typography variant="h6" fontWeight={600}>
            Subscription
          </Typography>
          <Chip
            label={isPremium ? 'PREMIUM' : 'FREE'}
            size="small"
            sx={{
              fontWeight: 800,
              fontSize: '0.65rem',
              letterSpacing: '0.05em',
              bgcolor: isPremium ? 'rgba(243,156,18,0.15)' : 'rgba(100,100,100,0.1)',
              color: isPremium ? '#F39C12' : 'text.secondary',
            }}
          />
        </Box>

        {isPremium && subData?.subscription ? (
          <Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Plan</Typography>
                <Typography variant="body2" fontWeight={600}>
                  Premium ({subData.subscription.amount} {subData.subscription.currency}/month)
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Status</Typography>
                <Chip
                  label="Active"
                  size="small"
                  sx={{ bgcolor: 'rgba(18,166,74,0.15)', color: '#12A64A', fontWeight: 700, fontSize: '0.7rem' }}
                />
              </Box>
              {subData.subscription.end_date && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Expires</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {new Date(subData.subscription.end_date).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </Typography>
                </Box>
              )}
            </Box>
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate(ROUTES.LISTENER_SUBSCRIPTION)}
              sx={{ borderRadius: 99, textTransform: 'none', fontWeight: 600 }}
            >
              Manage Subscription
            </Button>
          </Box>
        ) : (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              You're on the free plan. Upgrade to Premium for ad-free listening,
              high-quality audio, unlimited playlists, and offline downloads.
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<StarIcon />}
              onClick={() => navigate(ROUTES.LISTENER_SUBSCRIPTION)}
              sx={{
                borderRadius: 99,
                px: 3,
                fontWeight: 700,
                textTransform: 'none',
                bgcolor: '#F39C12',
                color: '#000',
                '&:hover': { bgcolor: '#E67E22' },
              }}
            >
              Upgrade to Premium
            </Button>
          </Box>
        )}
      </Paper>

      {/* ---- Danger Zone ---- */}
      <Paper
        id="danger-zone-section"
        sx={{
          p: { xs: 2, sm: 4 },
          borderRadius: 3,
          maxWidth: 700,
          border: '1px solid',
          borderColor: 'error.main',
          bgcolor: isDark ? 'rgba(211,47,47,0.04)' : 'rgba(211,47,47,0.02)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <WarningAmberIcon sx={{ color: 'error.main' }} />
          <Typography variant="h6" fontWeight={600} color="error.main">
            Danger Zone
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Permanently delete your account and all associated data. This action
          cannot be undone — all your playlists, listening history, and profile
          data will be erased.
        </Typography>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteForeverIcon />}
          onClick={() => setDeleteDialogOpen(true)}
          sx={{ borderRadius: 99, textTransform: 'none', fontWeight: 700 }}
        >
          Delete My Account
        </Button>
      </Paper>

      {/* ---- Delete Confirmation Dialog ---- */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => { setDeleteDialogOpen(false); setDeletePassword(''); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main', fontWeight: 700 }}>
          ⚠️ Delete Account Permanently
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            This will permanently delete your account and all data. Enter your
            password to confirm.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            type="password"
            label="Confirm your password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            disabled={isDeleting}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => { setDeleteDialogOpen(false); setDeletePassword(''); }}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={!deletePassword.trim() || isDeleting}
            onClick={async () => {
              try {
                await deleteAccount({ password: deletePassword }).unwrap();
                dispatch(logOut());
                navigate(ROUTES.LOGIN);
              } catch (err: unknown) {
                const msg = (err as { data?: { detail?: string } })?.data?.detail || 'Failed to delete account.';
                dispatch(showSnackbar({ message: msg, severity: 'error' }));
              }
            }}
          >
            {isDeleting ? 'Deleting…' : 'Delete Forever'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SettingsPage;
