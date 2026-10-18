/**
 * Sheba Sound — Playlist Detail Page
 * ------------------------------------
 * Displays playlist info (cover, title, description, song count)
 * and a full song listing with Play All functionality.
 * Supports editing, deleting, adding/removing songs, and
 * changing the playlist cover image.
 * Fetches data from the real backend API.
 */

import { useMemo, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Button,
  Paper,
  List,
  Divider,
  IconButton,
  Skeleton,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Tooltip,
  Snackbar,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import ShareIcon from '@mui/icons-material/Share';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import { useParams, useNavigate } from 'react-router-dom';
import { formatDuration } from '@/utils/helpers';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { setQueue } from '@/features/player/playerSlice';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import SongListItem from '@/components/music/SongListItem';
import { SONG_PLACEHOLDER, PLAYLIST_PLACEHOLDER } from "@/utils/placeholders";
import {
  useGetPlaylistByIdQuery,
  useGetSongsQuery,
  useAddSongToPlaylistMutation,
  useRemoveSongFromPlaylistMutation,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  useReorderPlaylistSongsMutation,
  useDeletePlaylistMutation,
  useUpdatePlaylistCoverMutation,
  type SongWithArtist,
} from '@/features/music/musicApi';

const PlaylistDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { requireAuth } = useRequireAuth();
  const currentUser = useAppSelector((state) => state.auth.user);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const { data: playlist, isLoading, isError } = useGetPlaylistByIdQuery(id ?? '', { skip: !id });
  // allSongs is only needed for the "add song" picker dialog
  const { data: allSongs = [] } = useGetSongsQuery();
  const [addSongToPlaylist, { isLoading: isAdding }] = useAddSongToPlaylistMutation();
  const [removeSongFromPlaylist, { isLoading: isRemoving }] = useRemoveSongFromPlaylistMutation();
  const [_reorderPlaylistSongs] = useReorderPlaylistSongsMutation();
  const [deletePlaylist, { isLoading: isDeleting }] = useDeletePlaylistMutation();

  // song_objects comes from PlaylistWithSongsSerializer (detail endpoint)
  const playlistSongs = useMemo(() => {
    return (playlist?.song_objects ?? []) as SongWithArtist[];
  }, [playlist]);

  const totalDuration = playlist?.total_duration ?? playlistSongs.reduce((acc, s) => acc + s.duration, 0);

  // Cover image upload
  const [updatePlaylistCover, { isLoading: isUploadingCover }] = useUpdatePlaylistCoverMutation();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>(
    { open: false, message: '', severity: 'success' },
  );

  // Local state for modals
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addSongDialogOpen, setAddSongDialogOpen] = useState(false);
  const [songSearch, setSongSearch] = useState('');

  const isOwner = currentUser && playlist?.owner === currentUser.id;

  const handleCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !playlist) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setSnackbar({ open: true, message: 'Unsupported format. Use JPEG, PNG, or WebP.', severity: 'error' });
      return;
    }

    const formData = new FormData();
    formData.append('cover_image', file);

    try {
      await updatePlaylistCover({ id: playlist.id, formData }).unwrap();
      setSnackbar({ open: true, message: 'Cover image updated!', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to update cover image.', severity: 'error' });
    }
    // Reset file input so the same file can be re-selected
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  // Songs not yet in the playlist (for add-song dialog)
  const availableSongs = useMemo(() => {
    if (!playlist) return [];
    const inPlaylist = new Set(playlist.songs);
    return allSongs
      .filter((s) => !inPlaylist.has(s.id))
      .filter((s) =>
        songSearch
          ? s.title.toLowerCase().includes(songSearch.toLowerCase()) ||
            (s as SongWithArtist).artist_name?.toLowerCase().includes(songSearch.toLowerCase())
          : true,
      );
  }, [allSongs, playlist, songSearch]);

  const handlePlayAll = (): void => {
    if (!requireAuth()) return;
    if (playlistSongs.length > 0) {
      dispatch(setQueue(playlistSongs));
    }
  };

  const handleAddSong = async (songId: string) => {
    if (!playlist) return;
    await addSongToPlaylist({ playlistId: playlist.id, songId }).unwrap();
  };

  const handleRemoveSong = async (songId: string) => {
    if (!playlist) return;
    await removeSongFromPlaylist({ playlistId: playlist.id, songId }).unwrap();
  };


  const handleDelete = async () => {
    if (!playlist) return;
    await deletePlaylist(playlist.id).unwrap();
    setDeleteDialogOpen(false);
    navigate('/library');
  };


  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="rounded" height={280} sx={{ borderRadius: 4, mb: 4 }} />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="rounded" height={56} sx={{ mb: 1, borderRadius: 2 }} />
        ))}
      </Box>
    );
  }

  if (isError || !playlist) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h5" gutterBottom>
          Playlist not found
        </Typography>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </Box>
    );
  }

  /* ================================================================ */
  /*  MOBILE LAYOUT — Spotify-style                                    */
  /* ================================================================ */
  if (isMobile) {
    return (
      <Box sx={{ pb: 12 }}>
        {/* Back button */}
        <IconButton
          onClick={() => navigate(-1)}
          sx={{
            position: 'absolute', top: 12, left: 12, zIndex: 10,
            bgcolor: 'rgba(0,0,0,0.3)', color: '#fff',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.5)' },
          }}
        >
          <ArrowBackIcon />
        </IconButton>

        {/* Cover Art — centered, large, with edit overlay for owner */}
        <Box sx={{ textAlign: 'center', pt: 6, pb: 2, px: 4 }}>
          <Box sx={{ position: 'relative', display: 'inline-block' }}>
            <Avatar
              variant="rounded"
              src={playlist.cover_image_url || PLAYLIST_PLACEHOLDER}
              alt={playlist.title}
              sx={{
                width: 220, height: 220,
                borderRadius: 2,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                bgcolor: '#1DB954',
              }}
            />
            {isOwner && (
              <IconButton
                onClick={() => coverInputRef.current?.click()}
                disabled={isUploadingCover}
                sx={{
                  position: 'absolute',
                  bottom: 8, right: 8,
                  bgcolor: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  width: 40, height: 40,
                  backdropFilter: 'blur(8px)',
                  border: '2px solid rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                }}
              >
                {isUploadingCover ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : <CameraAltIcon sx={{ fontSize: 20 }} />}
              </IconButton>
            )}
          </Box>
        </Box>

        {/* Playlist Info */}
        <Box sx={{ px: 2 }}>
          <Typography variant="h5" fontWeight={800} sx={{ mb: 0.25 }}>
            {playlist.title}
          </Typography>
          {playlist.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {playlist.description}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            {playlistSongs.length} songs
          </Typography>

          {/* Actions: Play, Bookmark, Share */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2, mb: 2 }}>
            <IconButton
              onClick={handlePlayAll}
              disabled={playlistSongs.length === 0}
              sx={{
                bgcolor: '#1DB954', color: '#000',
                width: 48, height: 48,
                '&:hover': { bgcolor: '#1ED760' },
                '&:disabled': { bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            >
              <PlayArrowIcon sx={{ fontSize: 28 }} />
            </IconButton>
            <IconButton sx={{ color: 'text.secondary' }}>
              <BookmarkBorderIcon />
            </IconButton>
            <IconButton sx={{ color: 'text.secondary' }}>
              <ShareIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Song List */}
        {playlistSongs.length === 0 ? (
          <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">This playlist is empty.</Typography>
          </Box>
        ) : (
          <Box>
            {playlistSongs.map((song) => (
              <Box
                key={song.id}
                onClick={() => {
                  if (!requireAuth()) return;
                  dispatch(setQueue(playlistSongs));
                }}
                sx={{
                  display: 'flex', alignItems: 'center', py: 1.25, px: 2,
                  cursor: 'pointer',
                  '&:active': { bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' },
                }}
              >
                <Avatar
                  variant="rounded"
                  src={song.cover_image_url || SONG_PLACEHOLDER}
                  sx={{ width: 44, height: 44, borderRadius: 1, mr: 1.5, flexShrink: 0 }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap fontWeight={600} fontSize="0.875rem">
                    {song.title}
                  </Typography>
                  <Typography variant="caption" noWrap color="text.secondary" fontSize="0.75rem">
                    {song.artist_name}
                  </Typography>
                </Box>
                <IconButton size="small" sx={{ color: 'text.secondary' }}>
                  <MoreVertIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}

        {/* Create Playlist Modal (reuse) */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          maxWidth="xs"
          PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>Delete Playlist?</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              This action cannot be undone. "{playlist.title}" will be permanently removed.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDeleteDialogOpen(false)} sx={{ borderRadius: 20, textTransform: 'none', fontWeight: 600 }}>
              Cancel
            </Button>
            <Button
              variant="contained" color="error" onClick={handleDelete} disabled={isDeleting}
              sx={{ borderRadius: 20, textTransform: 'none', fontWeight: 700 }}
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ---- Hidden file input for cover image (mobile) ---- */}
        <input
          ref={coverInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={handleCoverImageChange}
        />

        {/* ---- Snackbar feedback (mobile) ---- */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            severity={snackbar.severity}
            onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
            variant="filled"
            sx={{ borderRadius: 2, fontWeight: 600 }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    );
  }

  /* ================================================================ */
  /*  DESKTOP LAYOUT (existing)                                        */
  /* ================================================================ */
  return (
    <Box>
      {/* Back button */}
      <IconButton onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        <ArrowBackIcon />
      </IconButton>

      {/* ---- Playlist Header ---- */}
      <Paper
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 3,
          p: { xs: 2, sm: 4 },
          borderRadius: 4,
          mb: 4,
          background: (theme) =>
            `linear-gradient(135deg, ${theme.palette.secondary.dark}22 0%, ${theme.palette.background.paper} 100%)`,
        }}
      >
        {/* Cover — with edit overlay for owner */}
        <Box
          sx={{
            position: 'relative',
            width: { xs: '100%', sm: 220 },
            height: { xs: 240, sm: 220 },
            flexShrink: 0,
            '&:hover .cover-edit-overlay': isOwner ? { opacity: 1 } : {},
          }}
        >
          <Avatar
            variant="rounded"
            src={playlist.cover_image_url || PLAYLIST_PLACEHOLDER}
            alt={playlist.title}
            sx={{
              width: '100%',
              height: '100%',
              borderRadius: 3,
              boxShadow: 6,
            }}
          />
          {isOwner && (
            <Box
              className="cover-edit-overlay"
              onClick={() => coverInputRef.current?.click()}
              sx={{
                position: 'absolute',
                inset: 0,
                borderRadius: 3,
                bgcolor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                opacity: 0,
                transition: 'opacity 0.25s ease',
                cursor: isUploadingCover ? 'wait' : 'pointer',
                backdropFilter: 'blur(4px)',
              }}
            >
              {isUploadingCover ? (
                <CircularProgress size={36} sx={{ color: '#fff' }} />
              ) : (
                <>
                  <CameraAltIcon sx={{ fontSize: 32, color: '#fff' }} />
                  <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600 }}>
                    Change Cover
                  </Typography>
                </>
              )}
            </Box>
          )}
        </Box>

        {/* Info */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="overline" color="text.secondary">
              Playlist
            </Typography>
            {!playlist.is_public && (
              <Chip
                label="Private"
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.65rem', height: 20 }}
              />
            )}
          </Box>
          <Typography variant="h3" fontWeight={800} sx={{ mb: 1, lineHeight: 1.1 }}>
            {playlist.title}
          </Typography>

          {playlist.description && (
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
              {playlist.description}
            </Typography>
          )}

          <Typography variant="body2" color="text.secondary">
            {playlistSongs.length} songs • {formatDuration(totalDuration)}
          </Typography>

          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={handlePlayAll}
              disabled={playlistSongs.length === 0}
              sx={{ borderRadius: 20, px: 4, fontWeight: 700, textTransform: 'none' }}
            >
              Play All
            </Button>

            {isOwner && (
              <>
                <Tooltip title="Add songs">
                  <IconButton
                    onClick={() => setAddSongDialogOpen(true)}
                    sx={{
                      bgcolor: (t) =>
                        t.palette.mode === 'dark'
                          ? 'rgba(255,255,255,0.08)'
                          : 'rgba(0,0,0,0.06)',
                      '&:hover': {
                        bgcolor: (t) =>
                          t.palette.mode === 'dark'
                            ? 'rgba(255,255,255,0.14)'
                            : 'rgba(0,0,0,0.10)',
                      },
                    }}
                  >
                    <AddIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Delete playlist">
                  <IconButton
                    onClick={() => setDeleteDialogOpen(true)}
                    sx={{
                      color: 'error.main',
                      bgcolor: (t) =>
                        t.palette.mode === 'dark'
                          ? 'rgba(255,255,255,0.04)'
                          : 'rgba(0,0,0,0.03)',
                      '&:hover': {
                        bgcolor: 'rgba(218,18,26,0.1)',
                      },
                    }}
                  >
                    <DeleteOutlineIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Box>
        </Box>
      </Paper>

      {/* ---- Track Listing ---- */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, px: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ width: 32, textAlign: 'center' }}>
          #
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
          Title
        </Typography>
        <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
      </Box>
      <Divider sx={{ mb: 1 }} />

      {playlistSongs.length === 0 ? (
        <Paper
          sx={{
            p: 5,
            textAlign: 'center',
            borderRadius: 3,
            border: (t) =>
              t.palette.mode === 'dark'
                ? '1px dashed rgba(255,255,255,0.08)'
                : '1px dashed rgba(0,0,0,0.08)',
          }}
        >
          <Typography color="text.secondary" gutterBottom>
            This playlist is empty.
          </Typography>
          {isOwner && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setAddSongDialogOpen(true)}
              sx={{ borderRadius: 20, textTransform: 'none', fontWeight: 600, mt: 1 }}
            >
              Add Songs
            </Button>
          )}
        </Paper>
      ) : (
        <List disablePadding>
          {playlistSongs.map((song, i) => (
            <Box
              key={song.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                '&:hover .remove-btn': { opacity: 1 },
              }}
            >
              <Box sx={{ flex: 1 }}>
                <SongListItem song={song} index={i} queue={playlistSongs} />
              </Box>
              {isOwner && (
                <Tooltip title="Remove from playlist">
                  <IconButton
                    className="remove-btn"
                    size="small"
                    onClick={() => handleRemoveSong(song.id)}
                    disabled={isRemoving}
                    sx={{
                      opacity: 0,
                      transition: 'opacity 0.2s ease',
                      color: 'error.main',
                      mr: 1,
                    }}
                  >
                    <RemoveCircleOutlineIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          ))}
        </List>
      )}

      {/* ---- Add Song Dialog ---- */}
      <Dialog
        open={addSongDialogOpen}
        onClose={() => {
          setAddSongDialogOpen(false);
          setSongSearch('');
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            maxHeight: '80vh',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 0,
          }}
        >
          <Typography variant="h6" fontWeight={700}>
            Add Songs
          </Typography>
          <IconButton
            onClick={() => {
              setAddSongDialogOpen(false);
              setSongSearch('');
            }}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 3, pt: 2 }}>
          <TextField
            placeholder="Search songs…"
            value={songSearch}
            onChange={(e) => setSongSearch(e.target.value)}
            fullWidth
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': { borderRadius: 2 },
            }}
          />

          {availableSongs.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              {songSearch ? 'No matching songs found.' : 'All songs are already in this playlist!'}
            </Typography>
          ) : (
            <List
              disablePadding
              sx={{
                maxHeight: 400,
                overflowY: 'auto',
                '&::-webkit-scrollbar': { width: 6 },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 3 },
              }}
            >
              {availableSongs.slice(0, 30).map((song) => (
                <Box
                  key={song.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    py: 1,
                    px: 1,
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                    '&:hover': {
                      bgcolor: (t) =>
                        t.palette.mode === 'dark'
                          ? 'rgba(255,255,255,0.06)'
                          : 'rgba(0,0,0,0.04)',
                    },
                  }}
                >
                  <Avatar
                    variant="rounded"
                    src={song.cover_image_url || SONG_PLACEHOLDER}
                    sx={{ width: 40, height: 40, borderRadius: 1 }}
                  />
                  <Box sx={{ flex: 1, overflow: 'hidden' }}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {song.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {(song as SongWithArtist).artist_name} • {formatDuration(song.duration)}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => handleAddSong(song.id)}
                    disabled={isAdding}
                    sx={{
                      bgcolor: (t) =>
                        t.palette.mode === 'dark'
                          ? 'rgba(18,166,74,0.15)'
                          : 'rgba(7,137,48,0.1)',
                      color: '#12A64A',
                      '&:hover': {
                        bgcolor: 'rgba(18,166,74,0.25)',
                      },
                    }}
                  >
                    <AddIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              ))}
            </List>
          )}
        </DialogContent>
      </Dialog>

      {/* ---- Delete Confirmation ---- */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Playlist?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This action cannot be undone. "{playlist.title}" and all its contents will be permanently removed.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            sx={{ borderRadius: 20, textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={isDeleting}
            sx={{ borderRadius: 20, textTransform: 'none', fontWeight: 700 }}
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---- Hidden file input for cover image ---- */}
      <input
        ref={coverInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleCoverImageChange}
      />

      {/* ---- Snackbar feedback ---- */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          variant="filled"
          sx={{ borderRadius: 2, fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PlaylistDetailPage;
