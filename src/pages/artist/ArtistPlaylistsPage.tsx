/**
 * Sheba Sound — Artist Playlists Page
 * --------------------------------------
 * Create and manage artist-curated playlists with song add/remove.
 */

import { useState, type FormEvent } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Chip,
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import PublicIcon from '@mui/icons-material/Public';
import LockIcon from '@mui/icons-material/Lock';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { useAppDispatch } from '@/app/hooks';
import { showSnackbar } from '@/features/ui/uiSlice';
import { useGetMySongsQuery } from '@/features/music/musicApi';
import { formatDuration } from '@/utils/helpers';
import type { Song } from '@/types/models';
import { SONG_PLACEHOLDER, PLAYLIST_PLACEHOLDER } from "@/utils/placeholders";

interface ArtistPlaylist {
  id: string;
  title: string;
  description: string;
  is_public: boolean;
  songs: Song[];
  cover_image_url: string | null;
  created_at: string;
}

const ArtistPlaylistsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { data: artistSongs = [] } = useGetMySongsQuery();

  const [playlists, setPlaylists] = useState<ArtistPlaylist[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [addSongsOpen, setAddSongsOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<ArtistPlaylist | null>(null);
  const [newForm, setNewForm] = useState({ title: '', description: '', is_public: true });

  const handleCreate = (e: FormEvent): void => {
    e.preventDefault();
    if (!newForm.title.trim()) {
      dispatch(showSnackbar({ message: 'Playlist title is required.', severity: 'warning' }));
      return;
    }
    const pl: ArtistPlaylist = {
      id: `pl-${Date.now()}`,
      title: newForm.title,
      description: newForm.description,
      is_public: newForm.is_public,
      songs: [],
      cover_image_url: null,
      created_at: new Date().toISOString(),
    };
    setPlaylists((prev) => [pl, ...prev]);
    setCreateOpen(false);
    setNewForm({ title: '', description: '', is_public: true });
    dispatch(showSnackbar({ message: `Playlist "${pl.title}" created!`, severity: 'success' }));
  };

  const handleDelete = (id: string, title: string): void => {
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
    dispatch(showSnackbar({ message: `"${title}" deleted.`, severity: 'info' }));
  };

  const openAddSongs = (pl: ArtistPlaylist): void => {
    setSelectedPlaylist(pl);
    setAddSongsOpen(true);
  };

  const toggleSongInPlaylist = (song: Song): void => {
    if (!selectedPlaylist) return;
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id !== selectedPlaylist.id) return pl;
        const has = pl.songs.some((s) => s.id === song.id);
        return {
          ...pl,
          songs: has ? pl.songs.filter((s) => s.id !== song.id) : [...pl.songs, song],
        };
      }),
    );
    setSelectedPlaylist((prev) => {
      if (!prev) return prev;
      const has = prev.songs.some((s) => s.id === song.id);
      return { ...prev, songs: has ? prev.songs.filter((s) => s.id !== song.id) : [...prev.songs, song] };
    });
  };

  return (
    <Box>
      {/* ---- Header ---- */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            My Playlists
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {playlists.length} playlist{playlists.length !== 1 && 's'}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          Create Playlist
        </Button>
      </Box>

      {/* ---- Playlist Grid ---- */}
      {playlists.length > 0 ? (
        <Grid container spacing={2}>
          {playlists.map((pl) => (
            <Grid key={pl.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card sx={{ borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardMedia
                  component="img"
                  height={160}
                  image={pl.cover_image_url || PLAYLIST_PLACEHOLDER}
                  alt={pl.title}
                  sx={{ objectFit: 'cover' }}
                />
                <CardContent sx={{ flex: 1, pb: '8px !important' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="body1" fontWeight={700} noWrap sx={{ flex: 1 }}>
                      {pl.title}
                    </Typography>
                    <Tooltip title={pl.is_public ? 'Public' : 'Private'}>
                      {pl.is_public ? (
                        <PublicIcon sx={{ fontSize: 16, color: 'success.main' }} />
                      ) : (
                        <LockIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                      )}
                    </Tooltip>
                  </Box>
                  {pl.description && (
                    <Typography variant="caption" color="text.secondary" noWrap component="p">
                      {pl.description}
                    </Typography>
                  )}
                  <Chip
                    icon={<MusicNoteIcon sx={{ fontSize: '12px !important' }} />}
                    label={`${pl.songs.length} songs`}
                    size="small"
                    sx={{ mt: 1, fontSize: '0.65rem', height: 20 }}
                  />
                </CardContent>
                <CardActions sx={{ px: 2, pb: 1.5, gap: 1 }}>
                  <Button size="small" startIcon={<PlaylistAddIcon />} onClick={() => openAddSongs(pl)}>
                    Manage Songs
                  </Button>
                  <Tooltip title="Delete playlist">
                    <IconButton size="small" color="error" onClick={() => handleDelete(pl.id, pl.title)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            You haven't created any playlists yet.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            Create Your First Playlist
          </Button>
        </Paper>
      )}

      {/* ---- Create Playlist Dialog ---- */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleCreate}>
          <DialogTitle>Create New Playlist</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <TextField
              required
              label="Playlist Title"
              value={newForm.title}
              onChange={(e) => setNewForm((p) => ({ ...p, title: e.target.value }))}
              autoFocus
            />
            <TextField
              label="Description (optional)"
              value={newForm.description}
              onChange={(e) => setNewForm((p) => ({ ...p, description: e.target.value }))}
              multiline
              rows={2}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={newForm.is_public}
                  onChange={(e) => setNewForm((p) => ({ ...p, is_public: e.target.checked }))}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {newForm.is_public ? <PublicIcon fontSize="small" color="success" /> : <LockIcon fontSize="small" />}
                  <Typography variant="body2">{newForm.is_public ? 'Public playlist' : 'Private playlist'}</Typography>
                </Box>
              }
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Create</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ---- Manage Songs Dialog ---- */}
      <Dialog open={addSongsOpen} onClose={() => setAddSongsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Manage Songs — {selectedPlaylist?.title}
          <Typography variant="body2" color="text.secondary">
            {selectedPlaylist?.songs.length ?? 0} songs selected
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <List disablePadding>
            {artistSongs.map((song, idx) => {
              const isAdded = selectedPlaylist?.songs.some((s) => s.id === song.id) ?? false;
              return (
                <Box key={song.id}>
                  <ListItem
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={() => toggleSongInPlaylist(song)}
                    secondaryAction={
                      <Chip
                        label={isAdded ? 'Added' : 'Add'}
                        size="small"
                        color={isAdded ? 'success' : 'default'}
                        variant={isAdded ? 'filled' : 'outlined'}
                        onClick={() => toggleSongInPlaylist(song)}
                      />
                    }
                  >
                    <ListItemAvatar>
                      <Avatar
                        variant="rounded"
                        src={song.cover_image_url || SONG_PLACEHOLDER}
                        sx={{ width: 40, height: 40, borderRadius: 1 }}
                      />
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Typography variant="body2" fontWeight={600}>{song.title}</Typography>}
                      secondary={formatDuration(song.duration)}
                      sx={{ mr: 8 }}
                    />
                  </ListItem>
                  {idx < artistSongs.length - 1 && <Divider />}
                </Box>
              );
            })}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddSongsOpen(false)} variant="contained">Done</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ArtistPlaylistsPage;
