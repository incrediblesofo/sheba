/**
 * Sheba Sound — Library Page
 * ---------------------------
 * Displays the listener's personal music library: liked songs,
 * playlists, and recently played tracks.
 * Fetches real data from the backend API.
 * Supports playlist creation with free/premium tier limits.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  List,
  Divider,
  Skeleton,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import HistoryIcon from '@mui/icons-material/History';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import PersonIcon from '@mui/icons-material/Person';
import PlaylistCard from '@/components/music/PlaylistCard';
import SongListItem from '@/components/music/SongListItem';
import CreatePlaylistModal from '@/components/music/CreatePlaylistModal';
import {
  useGetLikedSongsQuery,
  useGetMyPlaylistsQuery,
  useGetListeningHistoryQuery,
  useDeletePlaylistMutation,
  useGetFollowedArtistsQuery,
} from '@/features/music/musicApi';

const LibraryPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { data: likedSongs = [], isLoading: likedLoading } = useGetLikedSongsQuery();
  const { data: myPlaylistData, isLoading: playlistsLoading } = useGetMyPlaylistsQuery();
  const { data: recentlyPlayed = [], isLoading: historyLoading } = useGetListeningHistoryQuery();
  const { data: followedArtists = [], isLoading: followedLoading } = useGetFollowedArtistsQuery();
  const [deletePlaylist] = useDeletePlaylistMutation();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const playlists = myPlaylistData?.playlists ?? [];
  const playlistCount = myPlaylistData?.count ?? 0;
  const playlistLimit = myPlaylistData?.limit ?? null;
  const isPremium = myPlaylistData?.is_premium ?? false;

  const handleDeletePlaylist = async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);
    try {
      await deletePlaylist(deleteConfirmId).unwrap();
    } finally {
      setDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  const SkeletonList = () => (
    <Box>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} variant="rounded" height={56} sx={{ mb: 1, borderRadius: 2 }} />
      ))}
    </Box>
  );

  /* ================================================================ */
  /*  MOBILE LAYOUT                                                    */
  /* ================================================================ */
  if (isMobile) {
    return (
      <Box sx={{ pt: 4, px: 2, pb: 12 }}>
        {/* Tab Chips */}
        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
          <Chip
            icon={<QueueMusicIcon sx={{ fontSize: 16, color: '#fff !important' }} />}
            label="Collections"
            sx={{
              bgcolor: '#1DB954',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.8rem',
              borderRadius: '20px',
              height: 34,
            }}
          />
          <Chip
            icon={<FavoriteIcon sx={{ fontSize: 16 }} />}
            label="Saved Media"
            variant="outlined"
            sx={{
              fontWeight: 600,
              fontSize: '0.8rem',
              borderRadius: '20px',
              height: 34,
              borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
              color: 'text.primary',
            }}
          />
        </Box>

        {/* Liked Songs Card */}
        <Box
          onClick={() => navigate('/liked-songs')}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            borderRadius: 2,
            p: 1.5,
            mb: 1.5,
            cursor: 'pointer',
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 1.5,
              bgcolor: '#E040FB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <FavoriteIcon sx={{ color: '#fff', fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="body1" fontWeight={700}>
              Liked Songs
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {likedLoading ? '...' : `${likedSongs.length} songs`}
            </Typography>
          </Box>
        </Box>

        {/* Local Files Card */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            borderRadius: 2,
            p: 1.5,
            mb: 1.5,
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 1.5,
              bgcolor: '#FF7043',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <FolderIcon sx={{ color: '#fff', fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="body1" fontWeight={700}>
              Local Files
            </Typography>
            <Typography variant="caption" color="text.secondary">
              0 songs
            </Typography>
          </Box>
        </Box>

        {/* Playlists */}
        {playlists.length > 0 && playlists.map((playlist) => (
          <Box
            key={playlist.id}
            onClick={() => navigate(`/playlist/${playlist.id}`)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              borderRadius: 2,
              p: 1.5,
              mb: 1.5,
              cursor: 'pointer',
            }}
          >
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 1.5,
                bgcolor: '#1DB954',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <QueueMusicIcon sx={{ color: '#fff', fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="body1" fontWeight={700}>
                {playlist.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Playlist
              </Typography>
            </Box>
          </Box>
        ))}

        {/* FAB for creating playlist */}
        <Fab
          onClick={() => setCreateModalOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 136,
            right: 20,
            bgcolor: '#1DB954',
            color: '#fff',
            '&:hover': { bgcolor: '#1ED760' },
            boxShadow: '0 6px 20px rgba(29,185,84,0.4)',
          }}
        >
          <AddIcon />
        </Fab>

        {/* Create Playlist Modal */}
        <CreatePlaylistModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          currentCount={playlistCount}
          limit={playlistLimit}
          isPremium={isPremium}
        />
      </Box>
    );
  }

  /* ================================================================ */
  /*  DESKTOP LAYOUT (existing)                                        */
  /* ================================================================ */
  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        My Library
      </Typography>

      {/* ---- Liked Songs ---- */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, mt: 3 }}>
        <FavoriteIcon color="error" />
        <Typography variant="h5" fontWeight={700}>
          Liked Songs
        </Typography>
        {likedSongs.length > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
            ({likedSongs.length})
          </Typography>
        )}
      </Box>
      {likedLoading ? (
        <SkeletonList />
      ) : likedSongs.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 3, mb: 4 }}>
          <Typography color="text.secondary">
            No liked songs yet. Click the heart icon on any song to add it here.
          </Typography>
        </Paper>
      ) : (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden', mb: 4 }}>
          <List disablePadding>
            {likedSongs.map((song, index) => (
              <SongListItem
                key={song.id}
                song={song}
                index={index}
                queue={likedSongs}
              />
            ))}
          </List>
        </Paper>
      )}

      <Divider sx={{ my: 3 }} />

      {/* ---- Followed Artists ---- */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <PersonIcon sx={{ color: '#12A64A' }} />
        <Typography variant="h5" fontWeight={700}>
          Followed Artists
        </Typography>
        {followedArtists.length > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
            ({followedArtists.length})
          </Typography>
        )}
      </Box>
      {followedLoading ? (
        <Box sx={{ display: 'flex', gap: 2 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" width={160} height={72} sx={{ borderRadius: 2, flexShrink: 0 }} />
          ))}
        </Box>
      ) : followedArtists.length === 0 ? (
        <Paper
          sx={{
            p: 3,
            textAlign: 'center',
            borderRadius: 3,
            mb: 4,
            border: (t) =>
              t.palette.mode === 'dark'
                ? '1px dashed rgba(255,255,255,0.1)'
                : '1px dashed rgba(0,0,0,0.1)',
          }}
        >
          <PersonIcon sx={{ fontSize: 40, color: 'text.secondary', opacity: 0.4, mb: 1 }} />
          <Typography color="text.secondary">
            No followed artists yet. Follow artists to see them here.
          </Typography>
        </Paper>
      ) : (
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            overflowX: 'auto',
            pb: 1,
            mb: 4,
            '&::-webkit-scrollbar': { height: 6 },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 3 },
          }}
        >
          {followedArtists.map((artist) => (
            <Paper
              key={artist.id}
              onClick={() => navigate(`/artist/${artist.id}`)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2,
                py: 1.5,
                borderRadius: 2.5,
                cursor: 'pointer',
                flex: '0 0 auto',
                minWidth: 180,
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                border: (t) =>
                  t.palette.mode === 'dark'
                    ? '1px solid rgba(255,255,255,0.04)'
                    : '1px solid rgba(0,0,0,0.04)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: (t) =>
                    t.palette.mode === 'dark'
                      ? '0 8px 24px rgba(18,166,74,0.12)'
                      : '0 8px 20px rgba(0,0,0,0.08)',
                  borderColor: (t) =>
                    t.palette.mode === 'dark'
                      ? 'rgba(18,166,74,0.15)'
                      : 'rgba(7,137,48,0.1)',
                },
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  flexShrink: 0,
                  bgcolor: '#12A64A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {artist.profile_image_url ? (
                  <img
                    src={artist.profile_image_url}
                    alt={artist.stage_name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <PersonIcon sx={{ color: '#fff', fontSize: 22 }} />
                )}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700} noWrap>
                  {artist.stage_name}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
                  Artist
                </Typography>
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      <Divider sx={{ my: 3 }} />

      {/* ---- My Playlists ---- */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <QueueMusicIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            My Playlists
          </Typography>
          {!isPremium && playlistLimit !== null && (
            <Chip
              label={`${playlistCount}/${playlistLimit}`}
              size="small"
              variant="outlined"
              color={playlistCount >= playlistLimit ? 'warning' : 'default'}
              sx={{
                fontWeight: 700,
                fontSize: '0.75rem',
                borderRadius: 1.5,
              }}
            />
          )}
          {isPremium && (
            <Tooltip title="Premium — Unlimited playlists">
              <WorkspacePremiumIcon
                sx={{
                  fontSize: 20,
                  color: '#FCDD09',
                  filter: 'drop-shadow(0 1px 4px rgba(252,221,9,0.5))',
                }}
              />
            </Tooltip>
          )}
        </Box>

        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setCreateModalOpen(true)}
          sx={{
            borderRadius: 20,
            px: 2.5,
            py: 0.8,
            fontWeight: 700,
            textTransform: 'none',
            fontSize: '0.8rem',
            background: 'linear-gradient(135deg, #12A64A 0%, #078930 100%)',
            boxShadow: '0 4px 12px rgba(18, 166, 74, 0.25)',
            '&:hover': {
              background: 'linear-gradient(135deg, #1ED760 0%, #12A64A 100%)',
              boxShadow: '0 6px 20px rgba(18, 166, 74, 0.35)',
            },
          }}
        >
          Create Playlist
        </Button>
      </Box>

      {playlistsLoading ? (
        <Box sx={{ display: 'flex', gap: 2 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" width={180} height={240} sx={{ borderRadius: 2, flexShrink: 0 }} />
          ))}
        </Box>
      ) : playlists.length === 0 ? (
        <Paper
          sx={{
            p: 5,
            textAlign: 'center',
            borderRadius: 3,
            mb: 4,
            border: (t) =>
              t.palette.mode === 'dark'
                ? '1px dashed rgba(255,255,255,0.1)'
                : '1px dashed rgba(0,0,0,0.1)',
          }}
        >
          <QueueMusicIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.4, mb: 1 }} />
          <Typography color="text.secondary" gutterBottom>
            No playlists yet. Create your first playlist!
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setCreateModalOpen(true)}
            sx={{
              borderRadius: 20,
              textTransform: 'none',
              fontWeight: 600,
              mt: 1,
            }}
          >
            Create Playlist
          </Button>
        </Paper>
      ) : (
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            overflowX: 'auto',
            pb: 1,
            mb: 4,
            '&::-webkit-scrollbar': { height: 6 },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 3 },
          }}
        >
          {playlists.map((playlist) => (
            <Box key={playlist.id} sx={{ flex: '0 0 auto', position: 'relative' }}>
              <PlaylistCard playlist={playlist} />
              <Tooltip title="Delete playlist">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmId(playlist.id);
                  }}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    bgcolor: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    '&:hover': {
                      bgcolor: 'rgba(218,18,26,0.8)',
                    },
                    width: 28,
                    height: 28,
                    opacity: 0,
                    transition: 'opacity 0.2s ease',
                    '.MuiBox-root:hover > &': { opacity: 1 },
                    'div:hover > &': { opacity: 1 },
                  }}
                >
                  <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
        </Box>
      )}

      <Divider sx={{ my: 3 }} />

      {/* ---- Recently Played ---- */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <HistoryIcon color="secondary" />
        <Typography variant="h5" fontWeight={700}>
          Recently Played
        </Typography>
      </Box>
      {historyLoading ? (
        <SkeletonList />
      ) : recentlyPlayed.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 3 }}>
          <Typography color="text.secondary">
            No listening history yet. Play some songs to see them here!
          </Typography>
        </Paper>
      ) : (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <List disablePadding>
            {recentlyPlayed.map((song, index) => (
              <SongListItem
                key={song.id}
                song={song}
                index={index}
                queue={recentlyPlayed}
              />
            ))}
          </List>
        </Paper>
      )}

      {/* ---- Create Playlist Modal ---- */}
      <CreatePlaylistModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        currentCount={playlistCount}
        limit={playlistLimit}
        isPremium={isPremium}
      />

      {/* ---- Delete Confirmation Dialog ---- */}
      <Dialog
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Playlist?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This action cannot be undone. The playlist and its contents will be permanently removed.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteConfirmId(null)}
            sx={{ borderRadius: 20, textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeletePlaylist}
            disabled={deleting}
            sx={{ borderRadius: 20, textTransform: 'none', fontWeight: 700 }}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LibraryPage;
