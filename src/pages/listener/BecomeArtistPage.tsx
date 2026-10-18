/**
 * Sheba Sound — Become Artist Page
 * ----------------------------------
 * Allows authenticated listeners to apply for an Artist profile
 * by submitting identity verification (ID document + profile info).
 * Shows verification status for users who have already applied.
 */

import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  MenuItem,
  CircularProgress,
  Alert,
  Grid,
  Fade,
  Chip,
  Divider,
} from "@mui/material";
import MicExternalOnIcon from "@mui/icons-material/MicExternalOn";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import BadgeIcon from "@mui/icons-material/Badge";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { setUser } from "@/features/auth/authSlice";
import {
  useBecomeArtistMutation,
  useResubmitArtistApplicationMutation,
  useGetArtistStatusQuery,
} from "@/features/auth/authApi";
import { showSnackbar } from "@/features/ui/uiSlice";
import { ROUTES } from "@/utils/constants";
import { Genre } from "@/types/models";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const GENRE_OPTIONS = [
  { value: "", label: "Select a genre (optional)" },
  ...Object.entries(Genre).map(([key, value]) => ({
    label: key,
    value,
  })),
];

const ID_DOC_TYPES = [
  { value: "national_id", label: "National ID" },
  { value: "passport", label: "Passport" },
];

const MAX_FILE_SIZE_MB = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const BecomeArtistPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const [becomeArtist] = useBecomeArtistMutation();
  const [resubmitApplication] = useResubmitArtistApplicationMutation();

  // Fetch current verification status — poll every 15 s so we catch approval quickly
  const { data: statusData, isLoading: statusLoading } =
    useGetArtistStatusQuery(undefined, {
      skip: !user,
      pollingInterval: user?.role === "listener" ? 15_000 : 0,
    });

  // ---- Form state ------------------------------------------------ */
  const [artistName, setArtistName] = useState("");
  const [genre, setGenre] = useState("");
  const [bio, setBio] = useState("");
  const [idDocType, setIdDocType] = useState("national_id");
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);

  // ---- File preview state ---------------------------------------- */
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);

  // ---- UI state -------------------------------------------------- */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ---- Refs ------------------------------------------------------ */
  const idDocRef = useRef<HTMLInputElement>(null);
  const profilePicRef = useRef<HTMLInputElement>(null);

  // ---- Already a verified artist (via Redux role)? Auto-redirect ---- */
  useEffect(() => {
    if (user?.role === "artist") {
      const timer = setTimeout(() => {
        navigate(ROUTES.ARTIST_DASHBOARD);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user?.role, navigate]);

  // ---- Detect approval via artist-status polling ---- */
  // This catches the case where the admin approves WHILE the user is
  // watching the "pending" screen — the global poller takes up to 15 s
  // but the status query is also polling, so whichever fires first wins.
  // IMPORTANT: Only redirect if the user's role is actually "artist".
  // A stale "verified" profile with role still "listener" (admin demoted)
  // should NOT trigger a redirect — the backend will clean it up.
  useEffect(() => {
    if (
      statusData?.verification_status === "verified" &&
      user?.role === "artist"
    ) {
      dispatch(
        showSnackbar({
          message:
            "🎉 Your artist application has been approved! Redirecting to your dashboard...",
          severity: "success",
          autoHideDuration: 8000,
        }),
      );
      navigate(ROUTES.ARTIST_DASHBOARD);
    }
  }, [statusData?.verification_status, user?.role, dispatch, navigate]);

  if (user?.role === "artist") {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <CheckCircleOutlineIcon
          sx={{ fontSize: 64, color: "success.main", mb: 2 }}
        />
        <Typography variant="h5" fontWeight={700} gutterBottom>
          You're already a verified artist!
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Redirecting you to your artist dashboard...
        </Typography>
        <CircularProgress size={24} sx={{ mb: 2, display: "block", mx: "auto" }} />
        <Button
          variant="contained"
          size="large"
          onClick={() => navigate(ROUTES.ARTIST_DASHBOARD)}
        >
          Go to Artist Dashboard Now
        </Button>
      </Box>
    );
  }

  // ---- Loading state --------------------------------------------- */
  if (statusLoading) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }} color="text.secondary">
          Checking application status...
        </Typography>
      </Box>
    );
  }

  // ---- Show pending status --------------------------------------- */
  if (statusData?.has_application && statusData.verification_status === "pending") {
    return (
      <Box sx={{ maxWidth: 680, mx: "auto", py: { xs: 3, sm: 5 } }}>
        <Fade in timeout={500}>
          <Paper
            elevation={3}
            sx={{
              p: { xs: 3, sm: 5 },
              borderRadius: 4,
              textAlign: "center",
              background: (theme) =>
                theme.palette.mode === "dark"
                  ? "linear-gradient(145deg, rgba(30,30,46,0.95) 0%, rgba(20,20,32,0.98) 100%)"
                  : "linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(248,248,255,1) 100%)",
              border: (theme) => `1px solid ${theme.palette.divider}`,
            }}
          >
            <HourglassTopIcon
              sx={{
                fontSize: 64,
                color: "warning.main",
                mb: 2,
                animation: "pulse 2s ease-in-out infinite",
                "@keyframes pulse": {
                  "0%, 100%": { opacity: 1 },
                  "50%": { opacity: 0.5 },
                },
              }}
            />
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Your Identity is Under Review
            </Typography>
            <Chip
              label="Pending Verification"
              color="warning"
              sx={{ mb: 3, fontWeight: 600 }}
            />
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Your application as <strong>{statusData.stage_name}</strong> has been submitted
              and is currently being reviewed by our team.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Submitted on{" "}
              {statusData.submitted_at
                ? new Date(statusData.submitted_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "N/A"}
            </Typography>
            <Divider sx={{ my: 3 }} />
            <Alert severity="info" sx={{ borderRadius: 2, textAlign: "left" }}>
              <Typography variant="body2">
                This process usually takes 1–3 business days. You'll be notified
                by email once your identity has been verified. Once approved,
                you'll be able to upload songs, create albums, and track your analytics.
              </Typography>
            </Alert>
          </Paper>
        </Fade>
      </Box>
    );
  }

  // ---- File validation helper ------------------------------------ */
  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Unsupported file type. Only JPEG and PNG are allowed.`;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`;
    }
    return null;
  };

  const handleIdDocChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) {
      setError(err);
      return;
    }
    setIdDocument(file);
    setIdPreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleProfilePicChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) {
      setError(err);
      return;
    }
    setProfilePicture(file);
    setProfilePreview(URL.createObjectURL(file));
    setError(null);
  };

  // ---- Determine if this is a resubmission ----------------------- */
  const isResubmission =
    statusData?.has_application &&
    statusData.verification_status === "rejected";

  // ---- Form submission ------------------------------------------- */
  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!artistName.trim()) {
      setError("Artist name is required.");
      return;
    }
    if (!idDocument) {
      setError("ID document is required for verification.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("artist_name", artistName.trim());
      if (genre) formData.append("genre", genre);
      if (bio.trim()) formData.append("bio", bio.trim());
      formData.append("id_document_type", idDocType);
      formData.append("id_document", idDocument);
      if (profilePicture) {
        formData.append("profile_picture", profilePicture);
      }

      const mutationFn = isResubmission ? resubmitApplication : becomeArtist;
      const result = await mutationFn(formData).unwrap();

      if (result.user) {
        dispatch(setUser(result.user));
      }

      setSuccess(
        result.message ||
          "Your artist application has been submitted for review!"
      );

      dispatch(
        showSnackbar({
          message:
            "📋 Application submitted! We'll review your identity and get back to you soon.",
          severity: "success",
          autoHideDuration: 6000,
        })
      );
    } catch (err: unknown) {
      const apiError = err as {
        data?: { detail?: string; id_document?: string[] };
      };
      setError(
        apiError?.data?.detail ||
          apiError?.data?.id_document?.[0] ||
          "Something went wrong. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  // ---- Render ---------------------------------------------------- */
  return (
    <Box sx={{ maxWidth: 680, mx: "auto", py: { xs: 3, sm: 5 } }}>
      {/* Header */}
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <MicExternalOnIcon
          sx={{
            fontSize: 56,
            color: "primary.main",
            mb: 1,
            filter: "drop-shadow(0 4px 12px rgba(99,102,241,0.35))",
          }}
        />
        <Typography variant="h4" fontWeight={800} gutterBottom>
          {isResubmission ? "Resubmit Your Application" : "Become an Artist"}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {isResubmission
            ? "Update your information and resubmit your application for review."
            : "Apply to become an artist. Your identity will be verified before you can upload music."}
        </Typography>
      </Box>

      {/* Rejection notice */}
      {isResubmission && statusData?.rejection_reason && (
        <Alert
          severity="error"
          icon={<ErrorOutlineIcon />}
          sx={{ mb: 3, borderRadius: 2 }}
        >
          <Typography variant="subtitle2" fontWeight={700}>
            Previous Application Rejected
          </Typography>
          <Typography variant="body2">
            Reason: {statusData.rejection_reason}
          </Typography>
        </Alert>
      )}

      {/* Form Card */}
      <Fade in timeout={500}>
        <Paper
          component="form"
          onSubmit={handleSubmit}
          noValidate
          elevation={3}
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 4,
            background: (theme) =>
              theme.palette.mode === "dark"
                ? "linear-gradient(145deg, rgba(30,30,46,0.95) 0%, rgba(20,20,32,0.98) 100%)"
                : "linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(248,248,255,1) 100%)",
            border: (theme) => `1px solid ${theme.palette.divider}`,
          }}
        >
          {/* Error Alert */}
          {error && (
            <Alert
              severity="error"
              onClose={() => setError(null)}
              sx={{ mb: 3, borderRadius: 2 }}
            >
              {error}
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
              {success}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Artist Name */}
            <Grid size={12}>
              <TextField
                id="become-artist-name"
                label="Artist / Stage Name"
                placeholder="e.g. Teddy Afro"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                disabled={loading || !!success}
                required
                fullWidth
                autoFocus
                helperText="This is the name fans will see on your profile."
              />
            </Grid>

            {/* Genre */}
            <Grid size={12}>
              <TextField
                id="become-artist-genre"
                select
                label="Primary Genre"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                disabled={loading || !!success}
                fullWidth
                helperText="Choose the genre that best describes your music."
              >
                {GENRE_OPTIONS.map((g) => (
                  <MenuItem key={g.value} value={g.value}>
                    {g.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Bio */}
            <Grid size={12}>
              <TextField
                id="become-artist-bio"
                label="Bio"
                placeholder="Tell listeners about yourself, your influences, and your journey..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={loading || !!success}
                multiline
                rows={4}
                fullWidth
                helperText={`${bio.length}/500 characters`}
                inputProps={{ maxLength: 500 }}
              />
            </Grid>

            {/* Divider */}
            <Grid size={12}>
              <Divider sx={{ my: 1 }}>
                <Chip
                  icon={<BadgeIcon />}
                  label="Identity Verification"
                  variant="outlined"
                  size="small"
                />
              </Divider>
            </Grid>

            {/* ID Document Type */}
            <Grid size={12}>
              <TextField
                id="become-artist-id-type"
                select
                label="ID Document Type"
                value={idDocType}
                onChange={(e) => setIdDocType(e.target.value)}
                disabled={loading || !!success}
                required
                fullWidth
                helperText="Select the type of ID document you're uploading."
              >
                {ID_DOC_TYPES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* ID Document Upload */}
            <Grid size={12}>
              <input
                ref={idDocRef}
                type="file"
                accept="image/jpeg,image/png"
                hidden
                onChange={handleIdDocChange}
              />
              <Button
                variant="outlined"
                fullWidth
                startIcon={<CloudUploadIcon />}
                onClick={() => idDocRef.current?.click()}
                disabled={loading || !!success}
                sx={{
                  py: 2,
                  borderStyle: "dashed",
                  borderWidth: 2,
                  textTransform: "none",
                  fontWeight: 600,
                }}
              >
                {idDocument
                  ? `✓ ${idDocument.name}`
                  : "Upload ID Document (JPEG/PNG, max 5MB) *"}
              </Button>
              {idPreview && (
                <Box
                  sx={{
                    mt: 1,
                    borderRadius: 2,
                    overflow: "hidden",
                    maxHeight: 200,
                    display: "flex",
                    justifyContent: "center",
                    backgroundColor: "action.hover",
                  }}
                >
                  <img
                    src={idPreview}
                    alt="ID Document preview"
                    style={{
                      maxHeight: 200,
                      maxWidth: "100%",
                      objectFit: "contain",
                    }}
                  />
                </Box>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                Your ID document is stored securely and only visible to admins during review.
              </Typography>
            </Grid>

            {/* Profile Picture Upload (optional) */}
            <Grid size={12}>
              <input
                ref={profilePicRef}
                type="file"
                accept="image/jpeg,image/png"
                hidden
                onChange={handleProfilePicChange}
              />
              <Button
                variant="outlined"
                fullWidth
                startIcon={<CloudUploadIcon />}
                onClick={() => profilePicRef.current?.click()}
                disabled={loading || !!success}
                sx={{
                  py: 2,
                  borderStyle: "dashed",
                  borderWidth: 2,
                  textTransform: "none",
                  fontWeight: 600,
                }}
              >
                {profilePicture
                  ? `✓ ${profilePicture.name}`
                  : "Upload Profile Picture (optional)"}
              </Button>
              {profilePreview && (
                <Box
                  sx={{
                    mt: 1,
                    borderRadius: 2,
                    overflow: "hidden",
                    maxHeight: 200,
                    display: "flex",
                    justifyContent: "center",
                    backgroundColor: "action.hover",
                  }}
                >
                  <img
                    src={profilePreview}
                    alt="Profile picture preview"
                    style={{
                      maxHeight: 200,
                      maxWidth: "100%",
                      objectFit: "contain",
                    }}
                  />
                </Box>
              )}
            </Grid>

            {/* Info Notice */}
            <Grid size={12}>
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                <Typography variant="body2">
                  Your application will be reviewed by our team within 1–3 business
                  days. Once verified, you'll be able to upload songs, create
                  albums, and track your analytics. Your existing library and
                  playlists will remain intact.
                </Typography>
              </Alert>
            </Grid>

            {/* Submit Button */}
            <Grid size={12}>
              <Button
                id="become-artist-submit"
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading || !!success}
                startIcon={
                  loading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <MicExternalOnIcon />
                  )
                }
                sx={{
                  py: 1.5,
                  fontWeight: 700,
                  fontSize: "1.05rem",
                  borderRadius: 3,
                  textTransform: "none",
                  background: (theme) =>
                    `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  "&:hover": {
                    background: (theme) =>
                      `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
                  },
                }}
              >
                {loading
                  ? "Submitting your application..."
                  : success
                    ? "Application Submitted!"
                    : isResubmission
                      ? "Resubmit Application"
                      : "Submit Application"}
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Fade>
    </Box>
  );
};

export default BecomeArtistPage;
