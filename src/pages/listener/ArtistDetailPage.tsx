/**
 * Sheba Sound — Artist Detail Page (Premium Profile)
 * ---------------------------------------------------
 * Fully redesigned public artist profile page with Spotify-inspired aesthetics.
 * Features:
 *   • Full-bleed cinematic hero with parallax-style artist image
 *   • Glassmorphic floating stats bar
 *   • Tabbed content: Popular / Discography / All Songs
 *   • "About" section with gradient bio card
 *   • Social links with premium chip styling
 *   • Smooth micro-animations throughout
 * Theme-aware: adapts to dark and light modes.
 */

import { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Button,
  Paper,
  Grid,
  List,
  Divider,
  Chip,
  IconButton,
  Skeleton,
  Tabs,
  Tab,
  useTheme,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VerifiedIcon from '@mui/icons-material/Verified';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import AlbumIcon from '@mui/icons-material/Album';
import PersonIcon from '@mui/icons-material/Person';
import TwitterIcon from '@mui/icons-material/Twitter';
import InstagramIcon from '@mui/icons-material/Instagram';
import YouTubeIcon from '@mui/icons-material/YouTube';
import LanguageIcon from '@mui/icons-material/Language';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckIcon from '@mui/icons-material/Check';
import ShareIcon from '@mui/icons-material/Share';
import { useParams, useNavigate } from 'react-router-dom';
import { formatStreamCount, formatDuration } from '@/utils/helpers';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { setQueue, playTrack } from '@/features/player/playerSlice';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import SongListItem from '@/components/music/SongListItem';
import { SONG_PLACEHOLDER, ALBUM_PLACEHOLDER } from "@/utils/placeholders";
import {
  useGetArtistByIdQuery,
  useGetSongsQuery,
  useGetAlbumsQuery,
  useToggleFollowArtistMutation,
  useGetFollowStatusQuery,
} from '@/features/music/musicApi';

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

/** Glassmorphic stat item */
const StatItem: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({
  label,
  value,
  icon,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ textAlign: 'center', px: { xs: 1, sm: 2 } }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.75,
          mb: 0.5,
        }}
      >
        <Box sx={{ color: '#12A64A', display: 'flex', fontSize: 16 }}>{icon}</Box>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 900,
            fontSize: { xs: '1.1rem', sm: '1.4rem' },
            lineHeight: 1,
            background: isDark
              ? 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.7) 100%)'
              : 'linear-gradient(135deg, #1a1a1a 0%, #555 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {value}
        </Typography>
      </Box>
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontSize: '0.62rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontWeight: 600,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
};

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

const ArtistDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { requireAuth } = useRequireAuth();
  const { currentTrack, isPlaying } = useAppSelector((state) => state.player);

  const { data: artist, isLoading, isError } = useGetArtistByIdQuery(id ?? '', { skip: !id });
  const { data: artistSongs = [] } = useGetSongsQuery(
    id ? { artist: id, ordering: '-stream_count' } : undefined,
    { skip: !id },
  );
  const { data: artistAlbums = [] } = useGetAlbumsQuery(
    id ? { artist: id } : undefined,
    { skip: !id },
  );

  // Follow state
  const { isAuthenticated } = useRequireAuth();
  const { data: followStatus } = useGetFollowStatusQuery(id ?? '', {
    skip: !id || !isAuthenticated,
  });
  const [toggleFollow, { isLoading: isFollowLoading }] = useToggleFollowArtistMutation();
  const isFollowing = followStatus?.following ?? false;

  const [showAllSongs, setShowAllSongs] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Derived data
  const totalStreams =
    artist?.total_streams ?? artistSongs.reduce((acc, s) => acc + s.stream_count, 0);
  const followerCount = artist?.followers_count ?? 0;

  const popularSongs = useMemo(() => {
    const sorted = [...artistSongs].sort((a, b) => b.stream_count - a.stream_count);
    return showAllSongs ? sorted : sorted.slice(0, 5);
  }, [artistSongs, showAllSongs]);

  // Separate albums from singles (songs without an album)
  const singles = useMemo(() => {
    return artistSongs.filter((s) => !s.album);
  }, [artistSongs]);

  // Latest release
  const latestSong = useMemo(() => {
    if (artistSongs.length === 0) return null;
    return [...artistSongs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0];
  }, [artistSongs]);

  const isCurrentArtist = artistSongs.some((s) => s.id === currentTrack?.id);
  const socialLinks = artist?.social_links ?? {};

  const handlePlayAll = (): void => {
    if (!requireAuth()) return;
    if (artistSongs.length > 0) {
      dispatch(setQueue(artistSongs));
    }
  };

  const handleShuffle = (): void => {
    if (!requireAuth()) return;
    if (artistSongs.length > 0) {
      const shuffled = [...artistSongs].sort(() => Math.random() - 0.5);
      dispatch(setQueue(shuffled));
    }
  };

  const handleToggleFollow = async (): Promise<void> => {
    if (!requireAuth()) return;
    if (!id) return;
    try {
      await toggleFollow(id).unwrap();
    } catch {
      // error handled by RTK Query
    }
  };

  /* ---- Loading State ---- */
  if (isLoading) {
    return (
      <Box>
        <Skeleton
          variant="rounded"
          height={420}
          sx={{ borderRadius: 4, mb: 4 }}
        />
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Skeleton variant="rounded" width={120} height={48} sx={{ borderRadius: 500 }} />
          <Skeleton variant="circular" width={48} height={48} />
          <Skeleton variant="circular" width={48} height={48} />
        </Box>
        <Skeleton variant="text" width={200} height={40} sx={{ mb: 2 }} />
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} variant="rounded" height={56} sx={{ mb: 1, borderRadius: 2 }} />
        ))}
      </Box>
    );
  }

  /* ---- Error State ---- */
  if (isError || !artist) {
    return (
      <Box sx={{ textAlign: 'center', py: 10 }}>
        <Box
          sx={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          <PersonIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5 }} />
        </Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Artist not found
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 300, mx: 'auto' }}>
          This artist may have been removed or doesn't exist.
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate(-1)}
          sx={{
            borderRadius: 500,
            px: 4,
            py: 1.2,
            fontWeight: 700,
            textTransform: 'none',
            background: 'linear-gradient(135deg, #12A64A 0%, #078930 100%)',
          }}
        >
          Go Back
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 4 }}>
      {/* ================================================================ */}
      {/*  Hero Banner — Cinematic full-bleed                               */}
      {/* ================================================================ */}
      <Box
        sx={{
          position: 'relative',
          borderRadius: 4,
          overflow: 'hidden',
          mb: 0,
          minHeight: { xs: 340, sm: 400, md: 440 },
          display: 'flex',
          alignItems: 'flex-end',
          background: (artist.cover_image_url || artist.profile_image_url)
            ? 'transparent'
            : `linear-gradient(135deg, #078930 0%, #0A0A0F 40%, #1A0A1E 60%, #DA121A 100%)`,
        }}
      >
        {/* Back button */}
        <IconButton
          onClick={() => navigate(-1)}
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 3,
            bgcolor: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(12px)',
            color: '#fff',
            width: 40,
            height: 40,
            '&:hover': { bgcolor: 'rgba(0,0,0,0.55)' },
          }}
        >
          <ArrowBackIcon sx={{ fontSize: 20 }} />
        </IconButton>

        {/* Background cover image (large rectangle) — uses cover_image_url,
            falls back to profile_image_url with heavier blur */}
        {(artist.cover_image_url || artist.profile_image_url) && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${artist.cover_image_url ?? artist.profile_image_url})`,
              backgroundSize: 'cover',
              backgroundPosition: artist.cover_image_url ? 'center' : 'center 20%',
              filter: artist.cover_image_url
                ? 'brightness(0.5) saturate(1.2)'
                : 'brightness(0.35) saturate(1.3) blur(12px)',
              transform: 'scale(1.05)',
            }}
          />
        )}

        {/* Multi-layer gradient overlay */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: (artist.cover_image_url || artist.profile_image_url)
              ? `linear-gradient(180deg, 
                  transparent 0%, 
                  rgba(0,0,0,0.1) 30%, 
                  rgba(0,0,0,0.5) 60%, 
                  ${isDark ? '#0A0A0F' : '#F2F2F7'} 100%)`
              : 'none',
          }}
        />

        {/* Side gradient for depth */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: (artist.cover_image_url || artist.profile_image_url)
              ? 'linear-gradient(90deg, rgba(0,0,0,0.3) 0%, transparent 50%)'
              : 'none',
          }}
        />

        {/* Hero Content */}
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            p: { xs: 2.5, sm: 4 },
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'center', sm: 'flex-end' },
            gap: { xs: 2, sm: 3 },
            width: '100%',
          }}
        >
          {/* Artist avatar (circle) — uses profile_image_url */}
          <Box
            sx={{
              position: 'relative',
              flexShrink: 0,
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: -4,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #12A64A 0%, #078930 50%, #FCDD09 100%)',
                opacity: 0.4,
                filter: 'blur(8px)',
              },
            }}
          >
            <Avatar
              src={artist.profile_image_url ?? undefined}
              alt={artist.stage_name}
              sx={{
                width: { xs: 140, sm: 170, md: 200 },
                height: { xs: 140, sm: 170, md: 200 },
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                border: '4px solid rgba(255,255,255,0.12)',
                fontSize: 72,
                bgcolor: '#12A64A',
                position: 'relative',
              }}
            >
              <PersonIcon sx={{ fontSize: 72 }} />
            </Avatar>
          </Box>

          {/* Artist info */}
          <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' }, minWidth: 0 }}>
            {/* Verified badge / label */}
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                mb: 1,
                px: 1.5,
                py: 0.5,
                borderRadius: 500,
                bgcolor: artist.verified
                  ? 'rgba(91,155,213,0.15)'
                  : 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(8px)',
              }}
            >
              {artist.verified ? (
                <>
                  <VerifiedIcon sx={{ fontSize: 14, color: '#5B9BD5' }} />
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.62rem',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Verified Artist
                  </Typography>
                </>
              ) : (
                <Typography
                  variant="caption"
                  sx={{
                    color: 'rgba(255,255,255,0.6)',
                    fontWeight: 600,
                    fontSize: '0.62rem',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  Artist
                </Typography>
              )}
            </Box>

            {/* Stage name */}
            <Typography
              variant="h2"
              sx={{
                fontWeight: 900,
                color: '#fff',
                fontSize: { xs: '2rem', sm: '2.75rem', md: '3.5rem' },
                letterSpacing: '-0.04em',
                lineHeight: 1,
                mb: 1,
                textShadow: '0 4px 32px rgba(0,0,0,0.5)',
              }}
            >
              {artist.stage_name}
            </Typography>

            {/* Genre/bio snippet */}
            {artist.bio && (
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255,255,255,0.55)',
                  maxWidth: 440,
                  mb: 1.5,
                  lineHeight: 1.5,
                  fontSize: '0.82rem',
                  display: { xs: 'none', sm: '-webkit-box' },
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {artist.bio}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      {/* ================================================================ */}
      {/*  Floating Stats Bar — Glassmorphic                                */}
      {/* ================================================================ */}
      <Paper
        elevation={0}
        sx={{
          mx: { xs: 1, sm: 3 },
          mt: -3,
          mb: 3,
          p: { xs: 1.5, sm: 2 },
          borderRadius: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: { xs: 1, sm: 3 },
          flexWrap: 'wrap',
          position: 'relative',
          zIndex: 2,
          bgcolor: isDark ? 'rgba(20,20,30,0.85)' : 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(20px)',
          border: isDark
            ? '1px solid rgba(255,255,255,0.06)'
            : '1px solid rgba(0,0,0,0.06)',
          boxShadow: isDark
            ? '0 8px 32px rgba(0,0,0,0.3)'
            : '0 8px 32px rgba(0,0,0,0.06)',
        }}
      >
        <StatItem
          icon={<HeadphonesIcon sx={{ fontSize: 16 }} />}
          value={formatStreamCount(totalStreams)}
          label="Streams"
        />
        <Box
          sx={{
            width: 1,
            height: 30,
            bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          }}
        />
        <StatItem
          icon={<QueueMusicIcon sx={{ fontSize: 16 }} />}
          value={String(artistSongs.length)}
          label="Songs"
        />
        <Box
          sx={{
            width: 1,
            height: 30,
            bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          }}
        />
        <StatItem
          icon={<AlbumIcon sx={{ fontSize: 16 }} />}
          value={String(artistAlbums.length)}
          label="Albums"
        />
        {followerCount > 0 && (
          <>
            <Box
              sx={{
                width: 1,
                height: 30,
                bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                display: { xs: 'none', sm: 'block' },
              }}
            />
            <StatItem
              icon={<FavoriteIcon sx={{ fontSize: 16 }} />}
              value={formatStreamCount(followerCount)}
              label="Followers"
            />
          </>
        )}
      </Paper>

      {/* ================================================================ */}
      {/*  Action Buttons                                                   */}
      {/* ================================================================ */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          mb: 4,
          flexWrap: 'wrap',
          px: { xs: 0.5, sm: 0 },
        }}
      >
        <Button
          variant="contained"
          size="large"
          startIcon={isCurrentArtist && isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          onClick={handlePlayAll}
          disabled={artistSongs.length === 0}
          sx={{
            borderRadius: 500,
            px: 5,
            py: 1.4,
            fontWeight: 800,
            fontSize: '0.95rem',
            textTransform: 'none',
            background: 'linear-gradient(135deg, #12A64A 0%, #078930 100%)',
            boxShadow: '0 6px 24px rgba(18,166,74,0.3)',
            transition: 'all 0.2s ease',
            '&:hover': {
              background: 'linear-gradient(135deg, #1ED760 0%, #12A64A 100%)',
              boxShadow: '0 8px 32px rgba(18,166,74,0.4)',
              transform: 'scale(1.04)',
            },
          }}
        >
          {isCurrentArtist && isPlaying ? 'Pause' : 'Play All'}
        </Button>

        <IconButton
          onClick={handleShuffle}
          disabled={artistSongs.length === 0}
          sx={{
            border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
            width: 44,
            height: 44,
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: '#12A64A',
              bgcolor: 'rgba(18,166,74,0.08)',
            },
          }}
        >
          <ShuffleIcon sx={{ fontSize: 20 }} />
        </IconButton>

        <IconButton
          sx={{
            border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
            width: 44,
            height: 44,
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
            },
          }}
        >
          <ShareIcon sx={{ fontSize: 20 }} />
        </IconButton>

        {/* Follow / Following button */}
        <Button
          variant={isFollowing ? 'outlined' : 'contained'}
          size="large"
          startIcon={
            isFollowing
              ? <CheckIcon sx={{ fontSize: 18 }} />
              : <PersonAddIcon sx={{ fontSize: 18 }} />
          }
          onClick={handleToggleFollow}
          disabled={isFollowLoading}
          sx={{
            borderRadius: 500,
            px: 3.5,
            py: 1.2,
            fontWeight: 800,
            fontSize: '0.85rem',
            textTransform: 'none',
            ml: 'auto',
            transition: 'all 0.25s ease',
            ...(isFollowing
              ? {
                  borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
                  color: isDark ? '#fff' : 'text.primary',
                  '&:hover': {
                    borderColor: '#DA121A',
                    color: '#DA121A',
                    bgcolor: 'rgba(218,18,26,0.05)',
                  },
                }
              : {
                  background: 'linear-gradient(135deg, #12A64A 0%, #078930 100%)',
                  boxShadow: '0 4px 16px rgba(18,166,74,0.25)',
                  color: '#fff',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1ED760 0%, #12A64A 100%)',
                    boxShadow: '0 6px 24px rgba(18,166,74,0.35)',
                    transform: 'scale(1.03)',
                  },
                }),
          }}
        >
          {isFollowLoading ? 'Loading…' : isFollowing ? 'Following' : 'Follow'}
        </Button>
      </Box>

      {/* ================================================================ */}
      {/*  Latest Release highlight                                        */}
      {/* ================================================================ */}
      {latestSong && (
        <Paper
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 2,
            mb: 4,
            borderRadius: 3,
            cursor: 'pointer',
            transition: 'all 0.25s ease',
            border: isDark
              ? '1px solid rgba(18,166,74,0.1)'
              : '1px solid rgba(7,137,48,0.08)',
            background: isDark
              ? 'linear-gradient(135deg, rgba(18,166,74,0.05) 0%, rgba(10,10,15,0.8) 100%)'
              : 'linear-gradient(135deg, rgba(7,137,48,0.03) 0%, #fff 100%)',
            '&:hover': {
              borderColor: isDark
                ? 'rgba(18,166,74,0.25)'
                : 'rgba(7,137,48,0.18)',
              boxShadow: isDark
                ? '0 4px 24px rgba(18,166,74,0.1)'
                : '0 4px 16px rgba(0,0,0,0.06)',
              transform: 'translateX(4px)',
            },
          }}
          onClick={() => {
            if (requireAuth()) {
              dispatch(playTrack({ track: latestSong, queue: artistSongs }));
            }
          }}
        >
          <Box
            sx={{
              width: 60,
              height: 60,
              borderRadius: 2,
              overflow: 'hidden',
              flexShrink: 0,
              position: 'relative',
            }}
          >
            <Avatar
              variant="rounded"
              src={latestSong.cover_image_url || SONG_PLACEHOLDER}
              sx={{ width: 60, height: 60, borderRadius: 2 }}
            />
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(0,0,0,0.25)',
                opacity: 0,
                transition: 'opacity 0.2s ease',
                '.MuiPaper-root:hover &': { opacity: 1 },
              }}
            >
              <PlayArrowIcon sx={{ color: '#fff', fontSize: 24 }} />
            </Box>
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Chip
              label="LATEST RELEASE"
              size="small"
              sx={{
                height: 18,
                fontSize: '0.55rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                bgcolor: 'rgba(18,166,74,0.12)',
                color: '#12A64A',
                mb: 0.5,
              }}
            />
            <Typography variant="body1" fontWeight={700} noWrap>
              {latestSong.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {latestSong.genre} • {formatDuration(latestSong.duration)}
            </Typography>
          </Box>
          <IconButton
            sx={{
              bgcolor: 'rgba(18,166,74,0.1)',
              '&:hover': { bgcolor: 'rgba(18,166,74,0.2)' },
            }}
          >
            <PlayArrowIcon sx={{ color: '#12A64A' }} />
          </IconButton>
        </Paper>
      )}

      {/* ================================================================ */}
      {/*  Tabs: Popular / Discography / All Songs                         */}
      {/* ================================================================ */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{
          mb: 3,
          '& .MuiTabs-indicator': {
            backgroundColor: '#12A64A',
            height: 3,
            borderRadius: 2,
          },
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.9rem',
            minWidth: 'auto',
            px: 2.5,
            transition: 'color 0.2s ease',
            '&.Mui-selected': {
              color: '#12A64A',
            },
          },
        }}
      >
        <Tab
          label="Popular"
          icon={<MusicNoteIcon sx={{ fontSize: 18 }} />}
          iconPosition="start"
        />
        <Tab
          label="Discography"
          icon={<AlbumIcon sx={{ fontSize: 18 }} />}
          iconPosition="start"
        />
        <Tab label={`All Songs (${artistSongs.length})`} />
      </Tabs>

      {/* ---- Tab 0: Popular Songs ---- */}
      {activeTab === 0 && (
        <Box>
          {artistSongs.length === 0 ? (
            <Paper
              sx={{
                p: 6,
                textAlign: 'center',
                borderRadius: 3,
                bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
              }}
            >
              <MusicNoteIcon
                sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3, mb: 1 }}
              />
              <Typography variant="h6" fontWeight={600} gutterBottom>
                No songs yet
              </Typography>
              <Typography color="text.secondary" variant="body2">
                This artist hasn't published any music.
              </Typography>
            </Paper>
          ) : (
            <>
              {/* Table header */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 2,
                  mb: 1,
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ width: 32, textAlign: 'center', fontWeight: 600 }}
                >
                  #
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ flex: 1, ml: 6, fontWeight: 600 }}
                >
                  Title
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: { xs: 'none', sm: 'block' },
                    mr: 2,
                    fontWeight: 600,
                  }}
                >
                  Plays
                </Typography>
                <AccessTimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              </Box>
              <Divider sx={{ mb: 0.5 }} />

              <List disablePadding>
                {popularSongs.map((song, i) => (
                  <SongListItem
                    key={song.id}
                    song={song}
                    index={i}
                    queue={artistSongs}
                  />
                ))}
              </List>

              {artistSongs.length > 5 && (
                <Button
                  variant="text"
                  onClick={() => setShowAllSongs(!showAllSongs)}
                  sx={{
                    mt: 1.5,
                    fontWeight: 700,
                    textTransform: 'none',
                    color: 'text.secondary',
                    borderRadius: 2,
                    px: 2,
                    '&:hover': {
                      color: '#12A64A',
                      bgcolor: 'rgba(18,166,74,0.06)',
                    },
                  }}
                >
                  {showAllSongs
                    ? 'Show Less'
                    : `Show All ${artistSongs.length} Songs`}
                </Button>
              )}
            </>
          )}
        </Box>
      )}

      {/* ---- Tab 1: Discography ---- */}
      {activeTab === 1 && (
        <Box>
          {/* Albums */}
          {artistAlbums.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 2.5,
                }}
              >
                <AlbumIcon sx={{ fontSize: 20, color: '#12A64A' }} />
                <Typography variant="h6" fontWeight={700}>
                  Albums
                </Typography>
                <Chip
                  label={artistAlbums.length}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    ml: 0.5,
                    height: 22,
                    bgcolor: isDark ? 'rgba(18,166,74,0.1)' : 'rgba(7,137,48,0.06)',
                    color: '#12A64A',
                  }}
                />
              </Box>
              <Grid container spacing={2}>
                {[...artistAlbums]
                  .sort(
                    (a, b) =>
                      new Date(b.release_date).getTime() -
                      new Date(a.release_date).getTime(),
                  )
                  .map((album) => (
                    <Grid key={album.id} size={{ xs: 6, sm: 4, md: 3 }}>
                      <Paper
                        sx={{
                          borderRadius: 3,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          border: isDark
                            ? '1px solid rgba(255,255,255,0.04)'
                            : '1px solid rgba(0,0,0,0.04)',
                          '&:hover': {
                            transform: 'translateY(-6px)',
                            boxShadow: isDark
                              ? '0 16px 48px rgba(18,166,74,0.15)'
                              : '0 16px 40px rgba(0,0,0,0.12)',
                            borderColor: isDark
                              ? 'rgba(18,166,74,0.15)'
                              : 'rgba(7,137,48,0.1)',
                          },
                        }}
                        onClick={() => navigate(`/album/${album.id}`)}
                      >
                        <Box sx={{ position: 'relative' }}>
                          <Avatar
                            variant="square"
                            src={album.cover_image_url || ALBUM_PLACEHOLDER}
                            alt={album.title}
                            sx={{
                              width: '100%',
                              height: 0,
                              paddingTop: '100%',
                              bgcolor: isDark ? '#1E1E2A' : '#E0E0E0',
                            }}
                          />
                          {/* Play overlay */}
                          <Box
                            sx={{
                              position: 'absolute',
                              bottom: 8,
                              right: 8,
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              bgcolor: '#12A64A',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 4px 16px rgba(18,166,74,0.4)',
                              opacity: 0,
                              transform: 'translateY(8px)',
                              transition: 'all 0.25s ease',
                              '.MuiPaper-root:hover &': {
                                opacity: 1,
                                transform: 'translateY(0)',
                              },
                            }}
                          >
                            <PlayArrowIcon
                              sx={{ color: '#000', fontSize: 22 }}
                            />
                          </Box>
                        </Box>
                        <Box sx={{ p: 1.5 }}>
                          <Typography variant="body2" fontWeight={700} noWrap>
                            {album.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(album.release_date).getFullYear()} • Album
                          </Typography>
                          <Box sx={{ mt: 0.75 }}>
                            <Chip
                              label={album.genre}
                              size="small"
                              sx={{ fontSize: '0.6rem', height: 20 }}
                            />
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
              </Grid>
            </Box>
          )}

          {/* Singles */}
          {singles.length > 0 && (
            <Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 2.5,
                }}
              >
                <MusicNoteIcon sx={{ fontSize: 20, color: '#12A64A' }} />
                <Typography variant="h6" fontWeight={700}>
                  Singles
                </Typography>
                <Chip
                  label={singles.length}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    ml: 0.5,
                    height: 22,
                    bgcolor: isDark ? 'rgba(18,166,74,0.1)' : 'rgba(7,137,48,0.06)',
                    color: '#12A64A',
                  }}
                />
              </Box>
              <Grid container spacing={2}>
                {[...singles]
                  .sort(
                    (a, b) =>
                      new Date(b.created_at).getTime() -
                      new Date(a.created_at).getTime(),
                  )
                  .map((song) => (
                    <Grid key={song.id} size={{ xs: 6, sm: 4, md: 3 }}>
                      <Paper
                        sx={{
                          borderRadius: 3,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          border: isDark
                            ? '1px solid rgba(255,255,255,0.04)'
                            : '1px solid rgba(0,0,0,0.04)',
                          '&:hover': {
                            transform: 'translateY(-6px)',
                            boxShadow: isDark
                              ? '0 16px 48px rgba(18,166,74,0.15)'
                              : '0 16px 40px rgba(0,0,0,0.12)',
                            borderColor: isDark
                              ? 'rgba(18,166,74,0.15)'
                              : 'rgba(7,137,48,0.1)',
                          },
                        }}
                        onClick={() => {
                          if (requireAuth()) {
                            dispatch(
                              playTrack({ track: song, queue: artistSongs }),
                            );
                          }
                        }}
                      >
                        <Box sx={{ position: 'relative' }}>
                          <Avatar
                            variant="square"
                            src={song.cover_image_url || SONG_PLACEHOLDER}
                            alt={song.title}
                            sx={{
                              width: '100%',
                              height: 0,
                              paddingTop: '100%',
                              bgcolor: isDark ? '#1E1E2A' : '#E0E0E0',
                            }}
                          />
                          <Box
                            sx={{
                              position: 'absolute',
                              bottom: 8,
                              right: 8,
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              bgcolor: '#12A64A',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 4px 16px rgba(18,166,74,0.4)',
                              opacity: 0,
                              transform: 'translateY(8px)',
                              transition: 'all 0.25s ease',
                              '.MuiPaper-root:hover &': {
                                opacity: 1,
                                transform: 'translateY(0)',
                              },
                            }}
                          >
                            <PlayArrowIcon
                              sx={{ color: '#000', fontSize: 22 }}
                            />
                          </Box>
                        </Box>
                        <Box sx={{ p: 1.5 }}>
                          <Typography variant="body2" fontWeight={700} noWrap>
                            {song.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Single • {formatDuration(song.duration)}
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
              </Grid>
            </Box>
          )}

          {artistAlbums.length === 0 && singles.length === 0 && (
            <Paper
              sx={{
                p: 6,
                textAlign: 'center',
                borderRadius: 3,
                bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
              }}
            >
              <AlbumIcon
                sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3, mb: 1 }}
              />
              <Typography variant="h6" fontWeight={600} gutterBottom>
                No releases yet
              </Typography>
              <Typography color="text.secondary" variant="body2">
                This artist hasn't released any albums or singles.
              </Typography>
            </Paper>
          )}
        </Box>
      )}

      {/* ---- Tab 2: All Songs ---- */}
      {activeTab === 2 && (
        <Box>
          {artistSongs.length === 0 ? (
            <Paper
              sx={{
                p: 6,
                textAlign: 'center',
                borderRadius: 3,
                bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
              }}
            >
              <Typography color="text.secondary">
                This artist has no songs.
              </Typography>
            </Paper>
          ) : (
            <>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 2,
                  mb: 1,
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ width: 32, textAlign: 'center', fontWeight: 600 }}
                >
                  #
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ flex: 1, ml: 6, fontWeight: 600 }}
                >
                  Title
                </Typography>
                <AccessTimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              </Box>
              <Divider sx={{ mb: 0.5 }} />
              <List disablePadding>
                {artistSongs.map((song, i) => (
                  <SongListItem
                    key={song.id}
                    song={song}
                    index={i}
                    queue={artistSongs}
                  />
                ))}
              </List>
            </>
          )}
        </Box>
      )}

      {/* ================================================================ */}
      {/*  About Section — Premium bio card + social links                  */}
      {/* ================================================================ */}
      {(artist.bio || Object.values(socialLinks).some((v) => v)) && (
        <>
          <Divider sx={{ my: 4 }} />
          <Box sx={{ maxWidth: 650 }}>
            <Typography
              variant="h6"
              fontWeight={800}
              sx={{
                mb: 2.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <PersonIcon sx={{ fontSize: 22, color: '#12A64A' }} />
              About {artist.stage_name}
            </Typography>

            {artist.bio && (
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 3,
                  mb: 3,
                  position: 'relative',
                  overflow: 'hidden',
                  background: isDark
                    ? 'linear-gradient(135deg, rgba(18,166,74,0.04) 0%, rgba(10,10,15,0.6) 100%)'
                    : 'linear-gradient(135deg, rgba(7,137,48,0.03) 0%, #fff 100%)',
                  border: isDark
                    ? '1px solid rgba(255,255,255,0.05)'
                    : '1px solid rgba(0,0,0,0.05)',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: 3,
                    height: '100%',
                    background: 'linear-gradient(180deg, #12A64A 0%, #078930 100%)',
                    borderRadius: '3px 0 0 3px',
                  },
                }}
              >
                <Typography variant="body2" sx={{ lineHeight: 1.8, pl: 1 }}>
                  {artist.bio}
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 3,
                    mt: 2.5,
                    pt: 2,
                    borderTop: isDark
                      ? '1px solid rgba(255,255,255,0.05)'
                      : '1px solid rgba(0,0,0,0.05)',
                    flexWrap: 'wrap',
                    pl: 1,
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    <strong style={{ color: '#12A64A' }}>
                      {formatStreamCount(totalStreams)}
                    </strong>{' '}
                    total streams
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    <strong>{artistSongs.length}</strong> songs
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    <strong>{artistAlbums.length}</strong> albums
                  </Typography>
                </Box>
              </Paper>
            )}

            {/* Social link buttons */}
            {Object.keys(socialLinks).length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {socialLinks.twitter && (
                  <Chip
                    icon={<TwitterIcon sx={{ fontSize: 16 }} />}
                    label="Twitter"
                    component="a"
                    href={socialLinks.twitter}
                    target="_blank"
                    clickable
                    variant="outlined"
                    size="small"
                    sx={{
                      fontWeight: 600,
                      borderRadius: 500,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: '#1DA1F2',
                        bgcolor: 'rgba(29,161,242,0.06)',
                      },
                    }}
                  />
                )}
                {socialLinks.instagram && (
                  <Chip
                    icon={<InstagramIcon sx={{ fontSize: 16 }} />}
                    label="Instagram"
                    component="a"
                    href={socialLinks.instagram}
                    target="_blank"
                    clickable
                    variant="outlined"
                    size="small"
                    sx={{
                      fontWeight: 600,
                      borderRadius: 500,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: '#E1306C',
                        bgcolor: 'rgba(225,48,108,0.06)',
                      },
                    }}
                  />
                )}
                {socialLinks.youtube && (
                  <Chip
                    icon={<YouTubeIcon sx={{ fontSize: 16 }} />}
                    label="YouTube"
                    component="a"
                    href={socialLinks.youtube}
                    target="_blank"
                    clickable
                    variant="outlined"
                    size="small"
                    sx={{
                      fontWeight: 600,
                      borderRadius: 500,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: '#FF0000',
                        bgcolor: 'rgba(255,0,0,0.06)',
                      },
                    }}
                  />
                )}
                {socialLinks.tiktok && (
                  <Chip
                    icon={<LanguageIcon sx={{ fontSize: 16 }} />}
                    label="TikTok"
                    component="a"
                    href={socialLinks.tiktok}
                    target="_blank"
                    clickable
                    variant="outlined"
                    size="small"
                    sx={{
                      fontWeight: 600,
                      borderRadius: 500,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: '#69C9D0',
                        bgcolor: 'rgba(105,201,208,0.06)',
                      },
                    }}
                  />
                )}
              </Box>
            )}
          </Box>
        </>
      )}
    </Box>
  );
};

export default ArtistDetailPage;
