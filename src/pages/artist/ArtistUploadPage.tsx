/**
 * Sheba Sound — Song Upload Page
 * --------------------------------
 * Form for artists to upload new songs with metadata, genre selection,
 * tags, cover image, and copyright/audio hash info notice.
 *
 * Features:
 * - Real client-side SHA-256 hash via Web Crypto API
 * - Upload progress bar via XMLHttpRequest
 * - Cloudinary CDN-backed storage (transparent to the UI)
 */

import { useState, useRef, type FormEvent } from "react";
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
  Avatar,
  IconButton,
  Chip,
  Tooltip,
  LinearProgress,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AudioFileIcon from "@mui/icons-material/AudioFile";
import ImageIcon from "@mui/icons-material/Image";
import DeleteIcon from "@mui/icons-material/Delete";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import AddIcon from "@mui/icons-material/Add";
import { useAppDispatch } from "@/app/hooks";
import { showSnackbar } from "@/features/ui/uiSlice";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/utils/constants";
import { getAccessToken } from "@/utils/tokenStorage";
import { Genre } from "@/types/models";
import { useGetMyAlbumsQuery } from "@/features/music/musicApi";

const ALL_GENRES = Object.entries(Genre).map(([key, value]) => ({
  label: key,
  value,
}));

interface UploadFormState {
  title: string;
  genre: string;
  album: string;
  lyrics: string;
  tagInput: string;
}

/**
 * Compute a real SHA-256 hash of a file using the Web Crypto API.
 * Returns a hex string prefixed with "sha256:".
 */
async function computeFileHash(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return `sha256:${hex}`;
  } catch {
    // Fallback for environments without Web Crypto (should be rare)
    return "";
  }
}

const ArtistUploadPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const audioInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<UploadFormState>({
    title: "",
    genre: "",
    album: "",
    lyrics: "",
    tagInput: "",
  });
  const [tags, setTags] = useState<string[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [hashPreview, setHashPreview] = useState<string | null>(null);
  const [isHashing, setIsHashing] = useState(false);

  const { data: artistAlbums = [] } = useGetMyAlbumsQuery();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAudioSelect = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("audio/")) {
        dispatch(showSnackbar({ message: "Please select an audio file.", severity: "warning" }));
        return;
      }
      setAudioFile(file);

      // Compute real SHA-256 hash
      setIsHashing(true);
      setHashPreview(null);
      try {
        const hash = await computeFileHash(file);
        setHashPreview(hash);
      } catch {
        setHashPreview(null);
      } finally {
        setIsHashing(false);
      }
    }
  };

  const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        dispatch(showSnackbar({ message: "Cover image must be JPEG, PNG, or WebP.", severity: "warning" }));
        return;
      }
      setCoverImage(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveCover = (): void => {
    setCoverImage(null);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(null);
  };

  const handleAddTag = (): void => {
    const tag = form.tagInput.trim().toLowerCase();
    if (!tag) return;
    if (tags.includes(tag)) {
      dispatch(showSnackbar({ message: `Tag "${tag}" already added.`, severity: 'info' }));
      return;
    }
    if (tags.length >= 10) {
      dispatch(showSnackbar({ message: 'Maximum 10 tags allowed.', severity: 'warning' }));
      return;
    }
    setTags((prev) => [...prev, tag]);
    setForm((prev) => ({ ...prev, tagInput: '' }));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); }
  };

  const removeTag = (tag: string): void => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const validate = (): string | null => {
    if (!form.title.trim()) return "Song title is required.";
    if (!form.genre) return "Please select a genre.";
    if (!audioFile) return "Please select an audio file to upload.";
    return null;
  };

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    const error = validate();
    if (error) {
      dispatch(showSnackbar({ message: error, severity: 'warning' }));
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Build multipart FormData payload
      const formData = new FormData();
      formData.append('title', form.title.trim());
      formData.append('genre', form.genre);
      if (audioFile) formData.append('audio_file', audioFile);
      if (coverImage) formData.append('cover_image', coverImage);
      if (form.album) formData.append('album', form.album);
      if (form.lyrics.trim()) formData.append('lyrics', form.lyrics.trim());
      if (tags.length > 0) formData.append('tags', JSON.stringify(tags));
      if (hashPreview) formData.append('audio_hash', hashPreview);

      // Duration: read from the audio element (or default to 0; backend validates)
      const audioDuration = audioFile
        ? await new Promise<number>((resolve) => {
            const tmp = document.createElement('audio');
            tmp.src = URL.createObjectURL(audioFile);
            tmp.onloadedmetadata = () => { resolve(Math.round(tmp.duration)); URL.revokeObjectURL(tmp.src); };
            tmp.onerror = () => resolve(0);
          })
        : 0;
      formData.append('duration', String(audioDuration || 1));

      // Grab JWT token
      const token = getAccessToken() ?? '';

      // Use XMLHttpRequest for upload progress tracking
      const result = await new Promise<{ ok: boolean; status: number; data: Record<string, unknown> }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/music/artist/songs/upload/');
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(pct);
          }
        };

        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, data });
          } catch {
            resolve({ ok: false, status: xhr.status, data: {} });
          }
        };

        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
      });

      if (result.status === 409) {
        dispatch(showSnackbar({
          message: '⚠️ A song with the same audio fingerprint already exists. Duplicate upload rejected.',
          severity: 'error',
          autoHideDuration: 8000,
        }));
        return;
      }

      if (!result.ok) {
        const msg = Object.values(result.data).flat().join(' ') || `Upload failed (${result.status}).`;
        dispatch(showSnackbar({ message: String(msg), severity: 'error' }));
        return;
      }

      dispatch(showSnackbar({
        message: `"${form.title}" uploaded successfully! It is now under review (24–48h).`,
        severity: 'success',
        autoHideDuration: 7000,
      }));
      navigate(ROUTES.ARTIST_SONGS, { replace: true });
    } catch {
      dispatch(showSnackbar({
        message: 'Network error — is the backend server running? (python3 manage.py runserver)',
        severity: 'error',
        autoHideDuration: 8000,
      }));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };


  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Upload New Song
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Share your music with millions of Ethiopian music lovers.
      </Typography>

      <Paper
        component="form"
        onSubmit={handleSubmit}
        noValidate
        sx={{ p: { xs: 2, sm: 4 }, borderRadius: 3, maxWidth: 800 }}
      >
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          Uploaded songs are stored on our global CDN for fast delivery worldwide.
          Files are reviewed before they appear in the catalog (24–48 hours).
        </Alert>

        <Grid container spacing={3}>
          {/* ---- Audio File Upload ---- */}
          <Grid size={12}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Audio File *</Typography>
            <input ref={audioInputRef} type="file" accept="audio/*" hidden onChange={handleAudioSelect} />
            <Button
              variant="outlined"
              startIcon={<AudioFileIcon />}
              onClick={() => audioInputRef.current?.click()}
              fullWidth
              disabled={isUploading}
              sx={{ py: 2, borderStyle: "dashed", borderWidth: 2, justifyContent: "center" }}
            >
              {audioFile ? audioFile.name : "Click to select an audio file (MP3, WAV, FLAC)"}
            </Button>
            {audioFile && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                Size: {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
              </Typography>
            )}
          </Grid>

          {/* ---- Copyright Hash Info ---- */}
          {(hashPreview || isHashing) && (
            <Grid size={12}>
              <Alert
                severity={isHashing ? "info" : "success"}
                icon={isHashing ? <CircularProgress size={20} /> : <FingerprintIcon />}
                sx={{ borderRadius: 2 }}
              >
                {isHashing ? (
                  <Typography variant="body2" fontWeight={600}>
                    Computing audio fingerprint...
                  </Typography>
                ) : (
                  <>
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                      Audio Hash Generated (Copyright Fingerprint)
                    </Typography>
                    <Typography
                      variant="caption"
                      fontFamily="monospace"
                      sx={{ wordBreak: 'break-all', opacity: 0.8 }}
                    >
                      {hashPreview}
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ mt: 0.5, opacity: 0.7 }}>
                      This SHA-256 fingerprint is stored for duplicate detection and copyright protection.
                    </Typography>
                  </>
                )}
              </Alert>
            </Grid>
          )}

          {/* ---- Cover Image ---- */}
          <Grid size={12}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Cover Image (optional)</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleImageSelect} />
              {coverPreview ? (
                <Box sx={{ position: "relative" }}>
                  <Avatar
                    variant="rounded"
                    src={coverPreview}
                    sx={{ width: 100, height: 100, borderRadius: 2 }}
                  />
                  <IconButton
                    size="small"
                    onClick={handleRemoveCover}
                    sx={{
                      position: "absolute", top: -8, right: -8,
                      bgcolor: "error.main", color: "white",
                      "&:hover": { bgcolor: "error.dark" },
                      width: 24, height: 24,
                    }}
                  >
                    <DeleteIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  startIcon={<ImageIcon />}
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isUploading}
                  sx={{ py: 2, px: 3, borderStyle: "dashed" }}
                >
                  Upload Cover
                </Button>
              )}
            </Box>
          </Grid>

          {/* ---- Song Title ---- */}
          <Grid size={12}>
            <TextField required name="title" label="Song Title" value={form.title} onChange={handleChange} disabled={isUploading} fullWidth />
          </Grid>

          {/* ---- Genre ---- */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField required select name="genre" label="Genre" value={form.genre} onChange={handleChange} disabled={isUploading} fullWidth>
              {ALL_GENRES.map((g) => (
                <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* ---- Album (optional) ---- */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select name="album" label="Album (optional)" value={form.album} onChange={handleChange} disabled={isUploading} fullWidth>
              <MenuItem value=""><em>Single (no album)</em></MenuItem>
              {artistAlbums.map((a) => (
                <MenuItem key={a.id} value={a.id}>{a.title}</MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* ---- Tags ---- */}
          <Grid size={12}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Tags (optional) — helps listeners discover your music
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
              {tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  onDelete={() => removeTag(tag)}
                  sx={{ fontWeight: 600 }}
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                name="tagInput"
                label="Add a tag"
                value={form.tagInput}
                onChange={handleChange}
                onKeyDown={handleTagKeyDown}
                disabled={isUploading || tags.length >= 10}
                placeholder="e.g. tizita, traditional, live"
                size="small"
                sx={{ flex: 1, maxWidth: 320 }}
                helperText={`${tags.length}/10 tags`}
              />
              <Tooltip title="Add tag (or press Enter)">
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleAddTag}
                  disabled={isUploading || !form.tagInput.trim() || tags.length >= 10}
                  sx={{ height: 40, alignSelf: 'flex-start' }}
                >
                  <AddIcon />
                </Button>
              </Tooltip>
            </Box>
          </Grid>

          {/* ---- Lyrics ---- */}
          <Grid size={12}>
            <TextField
              name="lyrics"
              label="Lyrics (optional)"
              value={form.lyrics}
              onChange={handleChange}
              disabled={isUploading}
              multiline
              rows={4}
              fullWidth
            />
          </Grid>

          {/* ---- Upload Progress ---- */}
          {isUploading && (
            <Grid size={12}>
              <Box sx={{ width: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {uploadProgress < 100 ? 'Uploading to CDN...' : 'Processing...'}
                  </Typography>
                  <Typography variant="caption" fontWeight={700} color="primary">
                    {uploadProgress}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={uploadProgress}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                    },
                  }}
                />
              </Box>
            </Grid>
          )}

          {/* ---- Submit ---- */}
          <Grid size={12}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={isUploading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
              disabled={isUploading || isHashing}
              fullWidth
              sx={{ py: 1.5 }}
            >
              {isUploading ? "Uploading..." : "Upload Song"}
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default ArtistUploadPage;
