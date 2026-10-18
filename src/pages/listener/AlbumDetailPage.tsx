/**
 * Sheba Sound — Album Detail Page
 * ---------------------------------
 * Displays album info (cover, title, artist, release date, description)
 * and a full track listing with Play All functionality.
 * Fetches data from the real backend API.
 */

import {
  Box,
  Typography,
  Avatar,
  Button,
  Chip,
  Paper,
  List,
  Divider,
  IconButton,
  Skeleton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import ShareIcon from '@mui/icons-material/Share';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { formatDuration } from '@/utils/helpers';
import { useAppDispatch } from '@/app/hooks';
import { setQueue } from '@/features/player/playerSlice';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import SongListItem from '@/components/music/SongListItem';
import { useGetAlbumByIdQuery, useGetArtistByIdQuery } from '@/features/music/musicApi';
import { SONG_PLACEHOLDER, ALBUM_PLACEHOLDER } from "@/utils/placeholders";

const AlbumDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { requireAuth } = useRequireAuth();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const { data: album, isLoading, isError } = useGetAlbumByIdQuery(id ?? '', { skip: !id });
  const { data: artist } = useGetArtistByIdQuery(album?.artist ?? '', { skip: !album?.artist });

  const albumSongs = album?.songs ?? [];
  const totalDuration = albumSongs.reduce((acc, s) => acc + s.duration, 0);

  const handlePlayAll = (): void => {
    if (!requireAuth()) return;
    if (albumSongs.length > 0) {
      dispatch(setQueue(albumSongs));
    }
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

  if (isError || !album) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h5" gutterBottom>
          Album not found
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

        {/* Cover Art — centered, large */}
        <Box sx={{ textAlign: 'center', pt: 6, pb: 2, px: 4 }}>
          <Avatar
            variant="rounded"
            src={album.cover_image_url || ALBUM_PLACEHOLDER}
            alt={album.title}
            sx={{
              width: 220, height: 220, mx: 'auto',
              borderRadius: 2,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          />
        </Box>

        {/* Album Info */}
        <Box sx={{ px: 2 }}>
          <Typography variant="h5" fontWeight={800} sx={{ mb: 0.25 }}>
            {album.title}
          </Typography>
          {artist && (
            <Typography
              variant="body2"
              onClick={() => navigate(`/artist/${artist.id}`)}
              sx={{
                color: 'text.secondary', cursor: 'pointer',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              {artist.stage_name}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {new Date(album.release_date).getFullYear()} • {albumSongs.length} songs
          </Typography>

          {/* Actions: Play, Bookmark, Share */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2, mb: 2 }}>
            <IconButton
              onClick={handlePlayAll}
              disabled={albumSongs.length === 0}
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
        <Box sx={{ px: 0 }}>
          {albumSongs.map((song, _i) => (
            <Box
              key={song.id}
              onClick={() => {
                if (!requireAuth()) return;
                dispatch(setQueue(albumSongs));
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
                  {song.artist_name} {song.album ? `- ${album.title}` : ''}
                </Typography>
              </Box>
              <IconButton size="small" sx={{ color: 'text.secondary' }}>
                <MoreVertIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          ))}
        </Box>
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

      {/* ---- Album Header ---- */}
      <Paper
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 3,
          p: { xs: 2, sm: 4 },
          borderRadius: 4,
          mb: 4,
          background: (theme) =>
            `linear-gradient(135deg, ${theme.palette.primary.dark}22 0%, ${theme.palette.background.paper} 100%)`,
        }}
      >
        {/* Cover */}
        <Avatar
          variant="rounded"
          src={album.cover_image_url || ALBUM_PLACEHOLDER}
          alt={album.title}
          sx={{
            width: { xs: '100%', sm: 220 },
            height: { xs: 240, sm: 220 },
            borderRadius: 3,
            boxShadow: 6,
          }}
        />

        {/* Info */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <Typography variant="overline" color="text.secondary">
            Album
          </Typography>
          <Typography variant="h3" fontWeight={800} sx={{ mb: 1, lineHeight: 1.1 }}>
            {album.title}
          </Typography>

          {artist && (
            <Typography
              variant="body1"
              component={Link}
              to={`/artist/${artist.id}`}
              sx={{
                color: 'text.primary',
                textDecoration: 'none',
                fontWeight: 600,
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              {artist.stage_name}
            </Typography>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
            <Chip label={album.genre} size="small" />
            <Typography variant="body2" color="text.secondary">
              {new Date(album.release_date).getFullYear()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              •
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {albumSongs.length} songs, {formatDuration(totalDuration)}
            </Typography>
          </Box>

          {album.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              {album.description}
            </Typography>
          )}

          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={handlePlayAll}
              sx={{ borderRadius: 20, px: 4, fontWeight: 700, textTransform: 'none' }}
            >
              Play All
            </Button>
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

      <List disablePadding>
        {albumSongs.map((song, i) => (
          <SongListItem key={song.id} song={song} index={i} queue={albumSongs} />
        ))}
      </List>
    </Box>
  );
};

export default AlbumDetailPage;
