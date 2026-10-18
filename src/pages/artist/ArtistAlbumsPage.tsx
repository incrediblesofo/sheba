/**
 * Sheba Sound — Artist Albums Page
 * ----------------------------------
 * Displays the logged-in artist's own albums (real API).
 * Create album posts to the backend; delete removes from DB.
 */

import { useState, useRef, type FormEvent } from 'react';
import {
  Box, Typography, Paper, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Grid,
  Card, CardMedia, CardContent, Chip, CircularProgress, IconButton, Tooltip,
  Stack, Avatar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AlbumIcon from '@mui/icons-material/Album';
import DeleteIcon from '@mui/icons-material/Delete';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { useAppDispatch } from '@/app/hooks';
import { showSnackbar } from '@/features/ui/uiSlice';
import { useGetMyAlbumsQuery, useCreateAlbumMutation, useDeleteAlbumMutation } from '@/features/music/musicApi';
import { Genre } from '@/types/models';
import { ALBUM_PLACEHOLDER } from "@/utils/placeholders";

const ALL_GENRES = Object.entries(Genre).map(([key, value]) => ({ label: key, value }));

interface NewAlbumForm {
  title: string;
  genre: string;
  description: string;
  release_date: string;
}

const todayStr = () => new Date().toISOString().split('T')[0];

const ArtistAlbumsPage: React.FC = () => {
  const dispatch = useAppDispatch();

  const { data: albums = [], isLoading } = useGetMyAlbumsQuery();
  const [createAlbum, { isLoading: isCreating }] = useCreateAlbumMutation();
  const [deleteAlbum, { isLoading: isDeleting }] = useDeleteAlbumMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<NewAlbumForm>({ title: '', genre: '', description: '', release_date: todayStr() });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleCreate = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!form.title.trim() || !form.genre) {
      dispatch(showSnackbar({ message: 'Title and genre are required.', severity: 'warning' }));
      return;
    }
    try {
      const formData = new FormData();
      formData.append('title', form.title.trim());
      formData.append('genre', form.genre);
      formData.append('description', form.description);
      formData.append('release_date', form.release_date || todayStr());
      if (coverFile) {
        formData.append('cover_image', coverFile);
      }

      await createAlbum(formData).unwrap();
      dispatch(showSnackbar({ message: `Album "${form.title}" created!`, severity: 'success' }));
      handleCloseDialog();
    } catch {
      dispatch(showSnackbar({ message: 'Failed to create album. Try again.', severity: 'error' }));
    }
  };

  const handleCloseDialog = (): void => {
    setDialogOpen(false);
    setForm({ title: '', genre: '', description: '', release_date: todayStr() });
    setCoverFile(null);
    setCoverPreview(null);
  };

  const handleDelete = async (id: string, title: string): Promise<void> => {
    try {
      await deleteAlbum(id).unwrap();
      dispatch(showSnackbar({ message: `"${title}" deleted.`, severity: 'info' }));
    } catch {
      dispatch(showSnackbar({ message: 'Failed to delete album.', severity: 'error' }));
    }
  };

  return (
    <Box>
      {/* ---- Header ---- */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>My Albums</Typography>
          <Typography variant="body2" color="text.secondary">
            {isLoading ? 'Loading…' : `${albums.length} album${albums.length !== 1 ? 's' : ''}`}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Create Album
        </Button>
      </Box>

      {/* ---- Loading ---- */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* ---- Empty State ---- */}
      {!isLoading && albums.length === 0 && (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
          <AlbumIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" gutterBottom>No albums yet</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Group your songs into albums or EPs to give your fans a complete experience.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            Create Your First Album
          </Button>
        </Paper>
      )}

      {/* ---- Album Grid ---- */}
      {!isLoading && albums.length > 0 && (
        <Grid container spacing={2}>
          {albums.map((album) => (
            <Grid key={album.id} size={{ xs: 6, sm: 4, md: 3 }}>
              <Card sx={{ borderRadius: 3, height: '100%', position: 'relative' }}>
                <Tooltip title="Delete album">
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(album.id, album.title)}
                    disabled={isDeleting}
                    sx={{ position: 'absolute', top: 6, right: 6, bgcolor: 'rgba(0,0,0,0.55)', color: 'white', '&:hover': { bgcolor: 'error.main' }, zIndex: 1 }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <CardMedia
                  component="img"
                  height={180}
                  image={album.cover_image_url || ALBUM_PLACEHOLDER}
                  alt={album.title}
                  sx={{ objectFit: 'cover' }}
                />
                <CardContent sx={{ pb: '12px !important' }}>
                  <Typography variant="body2" fontWeight={600} noWrap>{album.title}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap component="p">
                    {new Date(album.release_date).toLocaleDateString()}
                  </Typography>
                  <Chip label={album.genre} size="small" sx={{ mt: 0.5, fontSize: '0.65rem', height: 20 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ---- Create Album Dialog ---- */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleCreate}>
          <DialogTitle>Create New Album</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>

            {/* Cover Image Upload */}
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                variant="rounded"
                src={coverPreview || undefined}
                sx={{ width: 80, height: 80, bgcolor: 'action.hover', cursor: 'pointer' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <PhotoCameraIcon sx={{ fontSize: 32, color: 'text.secondary' }} />
              </Avatar>
              <Box>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCreating}
                >
                  {coverFile ? 'Change Cover' : 'Upload Cover'}
                </Button>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  JPEG, PNG, or WebP (optional)
                </Typography>
              </Box>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleCoverSelect}
                style={{ display: 'none' }}
              />
            </Stack>

            <TextField required name="title" label="Album Title" value={form.title} onChange={handleChange} autoFocus disabled={isCreating} />
            <TextField required select name="genre" label="Genre" value={form.genre} onChange={handleChange} disabled={isCreating}>
              {ALL_GENRES.map((g) => (
                <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              name="release_date"
              label="Release Date"
              type="date"
              value={form.release_date}
              onChange={handleChange}
              disabled={isCreating}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField name="description" label="Description (optional)" value={form.description} onChange={handleChange} multiline rows={3} disabled={isCreating} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleCloseDialog} disabled={isCreating}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isCreating}>
              {isCreating ? 'Creating…' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default ArtistAlbumsPage;
