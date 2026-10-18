/**
 * Sheba Sound — Liked Songs Page
 * --------------------------------
 * Spotify/JioSaavn-style Liked Songs detail page.
 * Mobile: purple gradient header, big heart icon, song count, play all, song list.
 * Desktop: clean list view.
 */

import {
  Box, Typography, Avatar, IconButton, Skeleton,
  useTheme, useMediaQuery, List,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@/app/hooks';
import { setQueue } from '@/features/player/playerSlice';
import { useGetLikedSongsQuery } from '@/features/music/musicApi';
import type { SongWithArtist } from '@/features/music/musicApi';
import SongListItem from '@/components/music/SongListItem';
import { SONG_PLACEHOLDER } from "@/utils/placeholders";

const LikedSongsPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { data: likedSongs = [], isLoading } = useGetLikedSongsQuery();

  const handlePlayAll = () => {
    if (likedSongs.length > 0) {
      dispatch(setQueue(likedSongs as SongWithArtist[]));
    }
  };

  /* ================================================================ */
  /*  MOBILE LAYOUT                                                    */
  /* ================================================================ */
  if (isMobile) {
    return (
      <Box sx={{ pb: 12 }}>
        {/* Purple gradient header */}
        <Box
          sx={{
            background: 'linear-gradient(180deg, #7B68EE 0%, #5B4FCF 40%, #0A0A0F 100%)',
            pt: 2,
            pb: 4,
            px: 2,
            position: 'relative',
          }}
        >
          {/* Back button */}
          <IconButton
            onClick={() => navigate(-1)}
            sx={{
              color: '#fff',
              mb: 2,
            }}
          >
            <ArrowBackIcon />
          </IconButton>

          {/* Heart icon */}
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Box
              sx={{
                width: 120,
                height: 120,
                mx: 'auto',
                borderRadius: 3,
                background: 'linear-gradient(135deg, #B39DDB 0%, #7E57C2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 32px rgba(123, 104, 238, 0.4)',
              }}
            >
              <FavoriteIcon sx={{ fontSize: 56, color: '#fff' }} />
            </Box>
          </Box>

          {/* Title + count */}
          <Typography
            variant="h4"
            fontWeight={800}
            sx={{ textAlign: 'center', color: '#fff', mb: 0.5 }}
          >
            Liked Songs
          </Typography>
          <Typography
            variant="body2"
            sx={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}
          >
            {isLoading ? '...' : `${likedSongs.length} songs`}
          </Typography>
        </Box>

        {/* Play All button */}
        <Box sx={{ px: 2, mt: -1, mb: 1 }}>
          <IconButton
            onClick={handlePlayAll}
            disabled={likedSongs.length === 0}
            sx={{
              bgcolor: '#1DB954',
              color: '#000',
              width: 48,
              height: 48,
              '&:hover': { bgcolor: '#1ED760' },
              '&:disabled': { bgcolor: 'rgba(255,255,255,0.1)' },
            }}
          >
            <PlayArrowIcon sx={{ fontSize: 28 }} />
          </IconButton>
        </Box>

        {/* Song list */}
        {isLoading ? (
          <Box sx={{ px: 2 }}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} variant="rounded" height={56} sx={{ mb: 1, borderRadius: 2 }} />
            ))}
          </Box>
        ) : likedSongs.length === 0 ? (
          <Box sx={{ px: 2, py: 6, textAlign: 'center' }}>
            <FavoriteIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3, mb: 1 }} />
            <Typography color="text.secondary">
              No liked songs yet. Tap the heart on any song to add it here.
            </Typography>
          </Box>
        ) : (
          <Box>
            {likedSongs.map((song) => (
              <Box
                key={song.id}
                onClick={() => dispatch(setQueue(likedSongs as SongWithArtist[]))}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  py: 1.25,
                  px: 2,
                  cursor: 'pointer',
                  '&:active': {
                    bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  },
                }}
              >
                <Avatar
                  variant="rounded"
                  src={song.cover_image_url || SONG_PLACEHOLDER}
                  alt={song.title}
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 1,
                    mr: 1.5,
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap fontWeight={600} fontSize="0.875rem">
                    {song.title}
                  </Typography>
                  <Typography variant="caption" noWrap color="text.secondary" fontSize="0.75rem">
                    {(song as SongWithArtist).artist_name ?? 'Unknown Artist'}
                  </Typography>
                </Box>
                <IconButton size="small" sx={{ color: 'text.secondary' }}>
                  <MoreVertIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    );
  }

  /* ================================================================ */
  /*  DESKTOP LAYOUT                                                   */
  /* ================================================================ */
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Liked Songs
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isLoading ? 'Loading...' : `${likedSongs.length} songs`}
          </Typography>
        </Box>
      </Box>

      {isLoading ? (
        <Box>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="rounded" height={56} sx={{ mb: 1, borderRadius: 2 }} />
          ))}
        </Box>
      ) : likedSongs.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <FavoriteIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3, mb: 1 }} />
          <Typography color="text.secondary">
            No liked songs yet. Click the heart icon on any song to save it here.
          </Typography>
        </Box>
      ) : (
        <List disablePadding>
          {likedSongs.map((song, i) => (
            <SongListItem
              key={song.id}
              song={song}
              index={i}
              queue={likedSongs}
            />
          ))}
        </List>
      )}
    </Box>
  );
};

export default LikedSongsPage;
