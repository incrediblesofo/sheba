/**
 * Sheba Sound — Artist Songs Management Page
 * ---------------------------------------------
 * Lists the logged-in artist's own songs (live from the backend).
 * Supports edit (PATCH) and delete (DELETE) via musicApi RTK hooks.
 * Edit dialog supports updating title, genre, lyrics, and cover image.
 */

import { useState, useRef } from 'react';
import {
  Box, Typography, Paper, Chip, IconButton, Tooltip, Button,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  List, ListItem, ListItemAvatar, Avatar, ListItemText,
  ToggleButtonGroup, ToggleButton, TextField, MenuItem, Grid, CircularProgress,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ViewListIcon from '@mui/icons-material/ViewList';
import GridViewIcon from '@mui/icons-material/GridView';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ImageIcon from '@mui/icons-material/Image';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@/app/hooks';
import { showSnackbar } from '@/features/ui/uiSlice';
import { ROUTES } from '@/utils/constants';
import {
  useGetMySongsQuery,
  useDeleteSongMutation,
  useUpdateSongMutation,
  useUpdateSongCoverMutation,
} from '@/features/music/musicApi';
import { formatDuration, formatStreamCount } from '@/utils/helpers';
import { SongStatus, Genre } from '@/types/models';
import type { Song } from '@/types/models';
import SongCard from '@/components/music/SongCard';
import { SONG_PLACEHOLDER } from "@/utils/placeholders";

const ALL_GENRES = Object.entries(Genre).map(([key, value]) => ({ label: key, value }));

const statusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
  switch (status) {
    case SongStatus.Approved: return 'success';
    case SongStatus.Pending: return 'warning';
    case SongStatus.Rejected: return 'error';
    default: return 'default';
  }
};

interface EditForm { title: string; genre: string; lyrics: string; }

const ArtistSongsPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // ---- Real API hooks ----
  const { data: songs = [], isLoading } = useGetMySongsQuery();
  const [deleteSong, { isLoading: isDeleting }] = useDeleteSongMutation();
  const [updateSong, { isLoading: isSavingEdit }] = useUpdateSongMutation();
  const [updateSongCover, { isLoading: isUploadingCover }] = useUpdateSongCoverMutation();

  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({ title: '', genre: '', lyrics: '' });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSaving = isSavingEdit || isUploadingCover;

  const handleDeleteClick = (song: Song): void => {
    setSelectedSong(song);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async (): Promise<void> => {
    if (!selectedSong) return;
    try {
      await deleteSong(selectedSong.id).unwrap();
      dispatch(showSnackbar({ message: `"${selectedSong.title}" deleted.`, severity: 'info' }));
    } catch {
      dispatch(showSnackbar({ message: 'Failed to delete song. Try again.', severity: 'error' }));
    }
    setDeleteDialogOpen(false);
    setSelectedSong(null);
  };

  const handleEditClick = (song: Song): void => {
    setSelectedSong(song);
    setEditForm({ title: song.title, genre: song.genre, lyrics: song.lyrics ?? '' });
    setCoverFile(null);
    setCoverPreview(null);
    setEditDialogOpen(true);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      dispatch(showSnackbar({ message: 'Only JPEG, PNG, and WebP images are allowed.', severity: 'warning' }));
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      dispatch(showSnackbar({ message: 'Image must be under 5MB.', severity: 'warning' }));
      return;
    }

    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = () => setCoverPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveCoverSelection = (): void => {
    setCoverFile(null);
    setCoverPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEditSubmit = async (): Promise<void> => {
    if (!selectedSong) return;
    if (!editForm.title.trim()) {
      dispatch(showSnackbar({ message: 'Song title is required.', severity: 'warning' }));
      return;
    }
    try {
      // Save text fields
      await updateSong({
        id: selectedSong.id,
        data: { title: editForm.title, genre: editForm.genre as Song['genre'], lyrics: editForm.lyrics },
      }).unwrap();

      // Upload cover image if a new one was selected
      if (coverFile) {
        const formData = new FormData();
        formData.append('cover_image', coverFile);
        await updateSongCover({ id: selectedSong.id, formData }).unwrap();
      }

      dispatch(showSnackbar({ message: `"${editForm.title}" updated!`, severity: 'success' }));
    } catch {
      dispatch(showSnackbar({ message: 'Failed to save changes. Try again.', severity: 'error' }));
    }
    setEditDialogOpen(false);
    setSelectedSong(null);
    setCoverFile(null);
    setCoverPreview(null);
  };

  return (
    <Box>
      {/* ---- Header ---- */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>My Songs</Typography>
          <Typography variant="body2" color="text.secondary">
            {isLoading ? 'Loading…' : `${songs.length} song${songs.length !== 1 ? 's' : ''} uploaded`}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small">
            <ToggleButton value="list"><ViewListIcon fontSize="small" /></ToggleButton>
            <ToggleButton value="grid"><GridViewIcon fontSize="small" /></ToggleButton>
          </ToggleButtonGroup>
          <Button variant="contained" startIcon={<CloudUploadIcon />} onClick={() => navigate(ROUTES.ARTIST_UPLOAD)}>
            Upload
          </Button>
        </Box>
      </Box>

      {/* ---- Loading ---- */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* ---- Empty State ---- */}
      {!isLoading && songs.length === 0 && (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
          <MusicNoteIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" gutterBottom>No songs yet</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Upload your first song and share your music with millions of Ethiopian music lovers.
          </Typography>
          <Button variant="contained" startIcon={<CloudUploadIcon />} onClick={() => navigate(ROUTES.ARTIST_UPLOAD)}>
            Upload Your First Song
          </Button>
        </Paper>
      )}

      {/* ---- List View ---- */}
      {!isLoading && viewMode === 'list' && songs.length > 0 && (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <List disablePadding>
            {songs.map((song) => (
              <ListItem
                key={song.id}
                divider
                secondaryAction={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label={song.status} size="small" color={statusColor(song.status)} sx={{ textTransform: 'capitalize', minWidth: 72 }} />
                    <Tooltip title="Edit song">
                      <IconButton size="small" onClick={() => handleEditClick(song)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete song">
                      <IconButton size="small" onClick={() => handleDeleteClick(song)} disabled={isDeleting}>
                        <DeleteIcon fontSize="small" color="error" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
              >
                <ListItemAvatar>
                  <Avatar variant="rounded" src={song.cover_image_url || SONG_PLACEHOLDER} sx={{ width: 48, height: 48, borderRadius: 1.5 }}>
                    <MusicNoteIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={<Typography variant="body2" fontWeight={600}>{song.title}</Typography>}
                  secondary={`${formatDuration(song.duration)} · ${song.genre} · ${formatStreamCount(song.stream_count)} streams`}
                  sx={{ mr: { xs: 16, sm: 24 } }}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* ---- Grid View ---- */}
      {!isLoading && viewMode === 'grid' && songs.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
          {songs.map((song) => (
            <SongCard key={song.id} song={song} queue={songs} />
          ))}
        </Box>
      )}

      {/* ---- Edit Dialog ---- */}
      <Dialog open={editDialogOpen} onClose={() => !isSaving && setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Song</DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <Grid container spacing={2}>
            {/* ---- Cover Image Section ---- */}
            <Grid size={12}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                Cover Image
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  flexWrap: 'wrap',
                }}
              >
                {/* Image preview / current cover */}
                <Box
                  onClick={() => !isSaving && fileInputRef.current?.click()}
                  sx={{
                    width: 120,
                    height: 120,
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: (t) =>
                      t.palette.mode === 'dark'
                        ? '2px dashed rgba(255,255,255,0.15)'
                        : '2px dashed rgba(0,0,0,0.15)',
                    cursor: isSaving ? 'default' : 'pointer',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: (t) =>
                      t.palette.mode === 'dark'
                        ? 'rgba(255,255,255,0.03)'
                        : 'rgba(0,0,0,0.02)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: '#12A64A',
                      bgcolor: 'rgba(18,166,74,0.04)',
                      '& .cover-overlay': {
                        opacity: 1,
                      },
                    },
                  }}
                >
                  {coverPreview || selectedSong?.cover_image_url ? (
                    <>
                      <img
                        src={(coverPreview ?? selectedSong?.cover_image_url) || SONG_PLACEHOLDER}
                        alt="Cover"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                      {/* Hover overlay */}
                      <Box
                        className="cover-overlay"
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          bgcolor: 'rgba(0,0,0,0.55)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0,
                          transition: 'opacity 0.2s ease',
                        }}
                      >
                        <PhotoCameraIcon sx={{ color: '#fff', fontSize: 24, mb: 0.5 }} />
                        <Typography variant="caption" sx={{ color: '#fff', fontSize: '0.6rem' }}>
                          Change
                        </Typography>
                      </Box>
                    </>
                  ) : (
                    <Box sx={{ textAlign: 'center' }}>
                      <ImageIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 0.5 }} />
                      <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem', display: 'block' }}>
                        Add Cover
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Info / buttons */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '0.75rem' }}>
                    Click the image to upload a new cover.
                    <br />
                    Accepted: JPEG, PNG, WebP (max 5MB)
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<PhotoCameraIcon />}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSaving}
                      sx={{
                        borderRadius: 20,
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                      }}
                    >
                      {selectedSong?.cover_image_url || coverPreview ? 'Change Image' : 'Upload Image'}
                    </Button>
                    {coverFile && (
                      <Button
                        size="small"
                        color="error"
                        variant="text"
                        onClick={handleRemoveCoverSelection}
                        disabled={isSaving}
                        sx={{
                          borderRadius: 20,
                          textTransform: 'none',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                        }}
                      >
                        Remove Selection
                      </Button>
                    )}
                  </Box>
                  {coverFile && (
                    <Typography
                      variant="caption"
                      sx={{
                        mt: 0.5,
                        display: 'block',
                        color: '#12A64A',
                        fontWeight: 600,
                        fontSize: '0.68rem',
                      }}
                    >
                      ✓ New image selected: {coverFile.name}
                    </Typography>
                  )}
                </Box>
              </Box>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={handleCoverSelect}
              />
            </Grid>

            {/* ---- Title ---- */}
            <Grid size={12}>
              <TextField required name="title" label="Song Title" value={editForm.title} onChange={handleEditChange} disabled={isSaving} fullWidth autoFocus />
            </Grid>
            <Grid size={12}>
              <TextField required select name="genre" label="Genre" value={editForm.genre} onChange={handleEditChange} disabled={isSaving} fullWidth>
                {ALL_GENRES.map((g) => (
                  <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={12}>
              <TextField name="lyrics" label="Lyrics (optional)" value={editForm.lyrics} onChange={handleEditChange} disabled={isSaving} multiline rows={4} fullWidth />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditDialogOpen(false)} disabled={isSaving}>Cancel</Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            disabled={isSaving}
            sx={{
              background: 'linear-gradient(135deg, #12A64A 0%, #078930 100%)',
              '&:hover': { background: 'linear-gradient(135deg, #1ED760 0%, #12A64A 100%)' },
            }}
          >
            {isSaving ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} sx={{ color: '#fff' }} />
                {isUploadingCover ? 'Uploading Cover…' : 'Saving…'}
              </Box>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---- Delete Dialog ---- */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Song</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{selectedSong?.title}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained" disabled={isDeleting}>
            {isDeleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ArtistSongsPage;
