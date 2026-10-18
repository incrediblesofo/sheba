/**
 * Sheba Sound — Artist Settings Page
 * -------------------------------------
 * Sections: Password Change, Account Preferences, Privacy Controls, DRM & Security.
 */

import { useState, type FormEvent } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Divider,
  Switch,
  FormControlLabel,
  Grid,
  MenuItem,
  Alert,
  Chip,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import TuneIcon from '@mui/icons-material/Tune';
import PrivacyTipIcon from '@mui/icons-material/PrivacyTip';
import ShieldIcon from '@mui/icons-material/Shield';
import SaveIcon from '@mui/icons-material/Save';
import { useAppDispatch } from '@/app/hooks';
import { showSnackbar } from '@/features/ui/uiSlice';

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; subtitle: string }> = ({ icon, title, subtitle }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
    <Box sx={{ bgcolor: 'primary.main', borderRadius: 1.5, p: 0.75, display: 'flex', color: 'white' }}>
      {icon}
    </Box>
    <Box>
      <Typography variant="h6" fontWeight={700}>{title}</Typography>
      <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
    </Box>
  </Box>
);

const ArtistSettingsPage: React.FC = () => {
  const dispatch = useAppDispatch();

  // Password form
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [savingPwd, setSavingPwd] = useState(false);

  // Preferences
  const [prefs, setPrefs] = useState({
    language: 'en',
    emailNewFollower: true,
    emailMilestone: true,
    emailRevenue: true,
    emailMarketing: false,
  });

  // Privacy
  const [privacy, setPrivacy] = useState({
    profilePublic: true,
    showStreamCount: true,
    allowComments: true,
    allowMessages: false,
    showFollowerCount: true,
  });

  // DRM
  const [drm, setDrm] = useState({
    preventDownload: true,
    allowOfflineAccess: false,
    offlinePremiumOnly: true,
    watermarkAudio: false,
  });

  const handlePasswordSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!passwordForm.current) {
      dispatch(showSnackbar({ message: 'Please enter your current password.', severity: 'warning' }));
      return;
    }
    if (passwordForm.next.length < 8) {
      dispatch(showSnackbar({ message: 'New password must be at least 8 characters.', severity: 'warning' }));
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      dispatch(showSnackbar({ message: 'Passwords do not match.', severity: 'error' }));
      return;
    }
    setSavingPwd(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSavingPwd(false);
    setPasswordForm({ current: '', next: '', confirm: '' });
    dispatch(showSnackbar({ message: 'Password updated successfully! (Demo)', severity: 'success' }));
  };

  const handleSavePrefs = async (): Promise<void> => {
    await new Promise((r) => setTimeout(r, 600));
    dispatch(showSnackbar({ message: 'Preferences saved. (Demo)', severity: 'success' }));
  };

  const handleSavePrivacy = async (): Promise<void> => {
    await new Promise((r) => setTimeout(r, 600));
    dispatch(showSnackbar({ message: 'Privacy settings saved. (Demo)', severity: 'success' }));
  };

  const handleSaveDRM = async (): Promise<void> => {
    await new Promise((r) => setTimeout(r, 600));
    dispatch(showSnackbar({ message: 'DRM settings saved. (Demo)', severity: 'success' }));
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Manage your account security, preferences, privacy, and content controls.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

        {/* ---------------------------------------------------------------- */}
        {/*  1. Password Change                                              */}
        {/* ---------------------------------------------------------------- */}
        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
          <SectionHeader
            icon={<LockIcon fontSize="small" />}
            title="Password & Security"
            subtitle="Update your login credentials"
          />
          <Box component="form" onSubmit={handlePasswordSubmit} noValidate>
            <Grid container spacing={2} sx={{ maxWidth: 480 }}>
              <Grid size={12}>
                <TextField
                  required
                  type="password"
                  label="Current Password"
                  value={passwordForm.current}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, current: e.target.value }))}
                  disabled={savingPwd}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  required
                  type="password"
                  label="New Password"
                  value={passwordForm.next}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, next: e.target.value }))}
                  disabled={savingPwd}
                  helperText="Minimum 8 characters"
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  required
                  type="password"
                  label="Confirm New Password"
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))}
                  disabled={savingPwd}
                />
              </Grid>
              <Grid size={12}>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<LockIcon />}
                  disabled={savingPwd}
                >
                  {savingPwd ? 'Updating...' : 'Update Password'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Paper>

        {/* ---------------------------------------------------------------- */}
        {/*  2. Account Preferences                                          */}
        {/* ---------------------------------------------------------------- */}
        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
          <SectionHeader
            icon={<TuneIcon fontSize="small" />}
            title="Account Preferences"
            subtitle="Personalise language and email notifications"
          />
          <Grid container spacing={2} sx={{ maxWidth: 480, mb: 2 }}>
            <Grid size={12}>
              <TextField
                select
                label="Language"
                value={prefs.language}
                onChange={(e) => setPrefs((p) => ({ ...p, language: e.target.value }))}
              >
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="am">አማርኛ (Amharic)</MenuItem>
                <MenuItem value="or">Afaan Oromoo</MenuItem>
                <MenuItem value="ti">ትግርኛ (Tigrinya)</MenuItem>
              </TextField>
            </Grid>
          </Grid>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
            Email Notifications
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {[
              { key: 'emailNewFollower', label: 'New followers' },
              { key: 'emailMilestone', label: 'Stream milestones' },
              { key: 'emailRevenue', label: 'Revenue & payout updates' },
              { key: 'emailMarketing', label: 'Sheba Sound newsletters & promotions' },
            ].map(({ key, label }) => (
              <FormControlLabel
                key={key}
                label={label}
                control={
                  <Switch
                    checked={prefs[key as keyof typeof prefs] as boolean}
                    onChange={(e) => setPrefs((p) => ({ ...p, [key]: e.target.checked }))}
                    color="primary"
                  />
                }
              />
            ))}
          </Box>
          <Button variant="outlined" startIcon={<SaveIcon />} sx={{ mt: 2 }} onClick={handleSavePrefs}>
            Save Preferences
          </Button>
        </Paper>

        {/* ---------------------------------------------------------------- */}
        {/*  3. Privacy Controls                                             */}
        {/* ---------------------------------------------------------------- */}
        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
          <SectionHeader
            icon={<PrivacyTipIcon fontSize="small" />}
            title="Privacy Controls"
            subtitle="Control how your profile appears to fans"
          />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {[
              { key: 'profilePublic', label: 'Public profile (discoverable by all listeners)' },
              { key: 'showStreamCount', label: 'Show stream count on songs' },
              { key: 'showFollowerCount', label: 'Show follower count publicly' },
              { key: 'allowComments', label: 'Allow comments on songs' },
              { key: 'allowMessages', label: 'Allow direct messages from fans' },
            ].map(({ key, label }) => (
              <FormControlLabel
                key={key}
                label={label}
                control={
                  <Switch
                    checked={privacy[key as keyof typeof privacy]}
                    onChange={(e) => setPrivacy((p) => ({ ...p, [key]: e.target.checked }))}
                    color="primary"
                  />
                }
              />
            ))}
          </Box>
          <Button variant="outlined" startIcon={<SaveIcon />} sx={{ mt: 2 }} onClick={handleSavePrivacy}>
            Save Privacy Settings
          </Button>
        </Paper>

        {/* ---------------------------------------------------------------- */}
        {/*  4. DRM & Security                                               */}
        {/* ---------------------------------------------------------------- */}
        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
          <SectionHeader
            icon={<ShieldIcon fontSize="small" />}
            title="DRM & Content Security"
            subtitle="Protect your music from unauthorised use"
          />
          <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
            Sheba Sound uses AES-256 encrypted HLS streams and signed URLs to deliver audio. These settings give you additional control.
          </Alert>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <FormControlLabel
              label={
                <Box>
                  <Typography variant="body2" fontWeight={600}>Prevent unauthorised downloads</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Blocks browser download tools and direct URL access
                  </Typography>
                </Box>
              }
              control={
                <Switch
                  checked={drm.preventDownload}
                  onChange={(e) => setDrm((p) => ({ ...p, preventDownload: e.target.checked }))}
                  color="primary"
                />
              }
            />
            <Divider sx={{ my: 1 }} />
            <FormControlLabel
              label={
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    Allow offline playback
                    {drm.allowOfflineAccess && drm.offlinePremiumOnly && (
                      <Chip label="Premium only" size="small" color="primary" sx={{ ml: 1, height: 18, fontSize: '0.6rem' }} />
                    )}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Let subscribers save songs for offline listening
                  </Typography>
                </Box>
              }
              control={
                <Switch
                  checked={drm.allowOfflineAccess}
                  onChange={(e) => setDrm((p) => ({ ...p, allowOfflineAccess: e.target.checked }))}
                  color="primary"
                />
              }
            />
            {drm.allowOfflineAccess && (
              <FormControlLabel
                sx={{ pl: 4 }}
                label={
                  <Typography variant="body2" color="text.secondary">
                    Restrict offline access to Premium subscribers only
                  </Typography>
                }
                control={
                  <Switch
                    checked={drm.offlinePremiumOnly}
                    onChange={(e) => setDrm((p) => ({ ...p, offlinePremiumOnly: e.target.checked }))}
                    size="small"
                    color="primary"
                  />
                }
              />
            )}
            <Divider sx={{ my: 1 }} />
            <FormControlLabel
              label={
                <Box>
                  <Typography variant="body2" fontWeight={600}>Audio watermarking</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Embed inaudible listener-ID watermark for leak tracing (experimental)
                  </Typography>
                </Box>
              }
              control={
                <Switch
                  checked={drm.watermarkAudio}
                  onChange={(e) => setDrm((p) => ({ ...p, watermarkAudio: e.target.checked }))}
                  color="primary"
                />
              }
            />
          </Box>
          <Button variant="outlined" startIcon={<SaveIcon />} sx={{ mt: 2 }} onClick={handleSaveDRM}>
            Save DRM Settings
          </Button>
        </Paper>

        {/* ---- Danger Zone ---- */}
        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, border: '1px solid', borderColor: 'error.main' }}>
          <Typography variant="h6" fontWeight={700} color="error" gutterBottom>
            Danger Zone
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            These actions are irreversible. Please proceed with caution.
          </Typography>
          <Button variant="outlined" color="error" size="small">
            Request Account Deletion
          </Button>
        </Paper>

      </Box>
    </Box>
  );
};

export default ArtistSettingsPage;
