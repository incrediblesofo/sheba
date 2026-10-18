/**
 * Sheba Sound — Full-Screen "Now Playing" Overlay
 * -------------------------------------------------
 * Slides up from the bottom bar to cover the entire viewport.
 * Inspired by Spotify's Now Playing view:
 *   • Blurred / colour-washed cover image fills the background
 *   • Large centered album art with pulse animation while playing
 *   • Full playback controls + seek bar + volume
 *   • Chevron-down button collapses back to the mini-bar
 */

import { useRef } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Slider,
  useTheme,
  useMediaQuery,
  Fade,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import RepeatIcon from '@mui/icons-material/Repeat';
import RepeatOneIcon from '@mui/icons-material/RepeatOne';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeDownIcon from '@mui/icons-material/VolumeDown';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  togglePlayPause,
  nextTrack,
  prevTrack,
  seekTo,
  setVolume,
  toggleMute,
  toggleShuffle,
  cycleRepeat,
  setFullScreen,
} from '@/features/player/playerSlice';
import { formatDuration } from '@/utils/helpers';
import type { SongWithArtist } from '@/features/music/musicApi';
import { SONG_PLACEHOLDER } from '@/utils/placeholders';

/* ─────────────────────────────────────────────────────────── */

const FullScreenPlayer: React.FC = () => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    progress,
    duration,
    shuffle,
    repeat,
    isFullScreen,
  } = useAppSelector((state) => state.player);

  const containerRef = useRef<HTMLDivElement>(null);

  if (!currentTrack) return null;

  const artistName = (currentTrack as SongWithArtist).artist_name ?? 'Unknown Artist';
  const coverUrl = currentTrack.cover_image_url || SONG_PLACEHOLDER;

  const VolumeIcon =
    isMuted || volume === 0
      ? VolumeOffIcon
      : volume < 0.5
        ? VolumeDownIcon
        : VolumeUpIcon;

  const handleProgressChange = (_e: Event, value: number | number[]) => {
    dispatch(seekTo(value as number));
  };

  const handleVolumeChange = (_e: Event, value: number | number[]) => {
    dispatch(setVolume(value as number));
  };

  const close = () => dispatch(setFullScreen(false));

  /* ── Slide-up / slide-down transform ── */
  const slideStyle = {
    transform: isFullScreen ? 'translateY(0)' : 'translateY(100%)',
    transition: 'transform 0.45s cubic-bezier(0.32, 0.72, 0, 1)',
  };

  /* ── Accent color (Ethiopian green) ── */
  const accent = '#1DB954';

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: theme.zIndex.modal + 10,
        pointerEvents: isFullScreen ? 'auto' : 'none',
        ...slideStyle,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ── Blurred background ── */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: coverUrl ? `url(${coverUrl})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(80px) saturate(200%) brightness(0.35)',
          transform: 'scale(1.15)', // prevent blur edges
          zIndex: 0,
        }}
      />

      {/* ── Dark overlay ── */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          bgcolor: 'rgba(0,0,0,0.45)',
          zIndex: 1,
        }}
      />

      {/* ── Content ── */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          px: { xs: 3, sm: 6, md: 10 },
          pt: { xs: 2, sm: 3 },
          pb: { xs: 3, sm: 4 },
          maxWidth: 680,
          width: '100%',
          mx: 'auto',
        }}
      >
        {/* ── Top bar ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 3, sm: 4 } }}>
          <IconButton
            onClick={close}
            sx={{
              color: 'rgba(255,255,255,0.85)',
              '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
            }}
          >
            <KeyboardArrowDownIcon sx={{ fontSize: 32 }} />
          </IconButton>

          <Typography
            variant="overline"
            sx={{
              color: 'rgba(255,255,255,0.7)',
              letterSpacing: 2,
              fontSize: '0.65rem',
              fontWeight: 600,
            }}
          >
            Now Playing
          </Typography>

          <IconButton
            sx={{
              color: 'rgba(255,255,255,0.85)',
              '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
            }}
          >
            <MoreHorizIcon />
          </IconButton>
        </Box>

        {/* ── Album art ── */}
        <Fade in={isFullScreen} timeout={500}>
          <Box
            sx={{
              mx: 'auto',
              mb: { xs: 4, sm: 5 },
              width: { xs: '72vw', sm: 340, md: 380 },
              height: { xs: '72vw', sm: 340, md: 380 },
              maxWidth: 400,
              maxHeight: 400,
              borderRadius: 3,
              overflow: 'hidden',
              boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
              flexShrink: 0,
              /* Subtle grow pulse when playing */
              animation: isPlaying ? 'albumPulse 3s ease-in-out infinite' : 'none',
              '@keyframes albumPulse': {
                '0%, 100%': { transform: 'scale(1)' },
                '50%': { transform: 'scale(1.025)' },
              },
            }}
          >
            {coverUrl ? (
              <Box
                component="img"
                src={coverUrl}
                alt={currentTrack.title}
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  bgcolor: 'rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography sx={{ fontSize: 80 }}>🎵</Typography>
              </Box>
            )}
          </Box>
        </Fade>

        {/* ── Track info + Like ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ overflow: 'hidden', flex: 1, mr: 2 }}>
            <Typography
              variant={isMobile ? 'h6' : 'h5'}
              fontWeight={700}
              noWrap
              sx={{ color: '#fff', lineHeight: 1.2 }}
            >
              {currentTrack.title}
            </Typography>
            <Typography
              variant="body1"
              noWrap
              sx={{ color: 'rgba(255,255,255,0.65)', mt: 0.5, fontSize: '0.9rem' }}
            >
              {artistName}
            </Typography>
          </Box>

          <IconButton
            sx={{
              color: 'rgba(255,255,255,0.65)',
              '&:hover': { color: accent },
              transition: 'color 0.2s',
              flexShrink: 0,
            }}
          >
            <FavoriteBorderIcon />
          </IconButton>
        </Box>

        {/* ── Progress bar ── */}
        <Box sx={{ mb: 0.5, mt: 1.5 }}>
          <Slider
            value={progress}
            max={duration || 1}
            onChange={handleProgressChange}
            sx={{
              color: '#fff',
              height: 4,
              padding: '10px 0',
              '& .MuiSlider-thumb': {
                width: 14,
                height: 14,
                opacity: 0,
                transition: 'opacity 0.2s',
                boxShadow: 'none',
              },
              '&:hover .MuiSlider-thumb': { opacity: 1 },
              '& .MuiSlider-track': {
                border: 'none',
                bgcolor: '#fff',
              },
              '& .MuiSlider-rail': {
                opacity: 0.25,
                bgcolor: '#fff',
              },
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: -0.5 }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>
              {formatDuration(progress)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>
              {formatDuration(duration)}
            </Typography>
          </Box>
        </Box>

        {/* ── Playback controls ── */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mt: 1,
            mb: 1.5,
          }}
        >
          {/* Shuffle */}
          <IconButton
            onClick={() => dispatch(toggleShuffle())}
            sx={{
              color: shuffle ? accent : 'rgba(255,255,255,0.55)',
              '&:hover': { color: shuffle ? '#1ED760' : '#fff' },
              transition: 'color 0.2s',
            }}
          >
            <ShuffleIcon sx={{ fontSize: 22 }} />
          </IconButton>

          {/* Previous */}
          <IconButton
            onClick={() => dispatch(prevTrack())}
            sx={{
              color: 'rgba(255,255,255,0.85)',
              '&:hover': { color: '#fff' },
            }}
          >
            <SkipPreviousIcon sx={{ fontSize: 36 }} />
          </IconButton>

          {/* Play / Pause — large circular button */}
          <IconButton
            onClick={() => dispatch(togglePlayPause())}
            sx={{
              bgcolor: '#fff',
              color: '#000',
              width: 64,
              height: 64,
              '&:hover': {
                bgcolor: '#f0f0f0',
                transform: 'scale(1.06)',
              },
              transition: 'transform 0.15s ease, background-color 0.15s ease',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
          >
            {isPlaying ? (
              <PauseIcon sx={{ fontSize: 32 }} />
            ) : (
              <PlayArrowIcon sx={{ fontSize: 32 }} />
            )}
          </IconButton>

          {/* Next */}
          <IconButton
            onClick={() => dispatch(nextTrack())}
            sx={{
              color: 'rgba(255,255,255,0.85)',
              '&:hover': { color: '#fff' },
            }}
          >
            <SkipNextIcon sx={{ fontSize: 36 }} />
          </IconButton>

          {/* Repeat */}
          <IconButton
            onClick={() => dispatch(cycleRepeat())}
            sx={{
              color: repeat !== 'off' ? accent : 'rgba(255,255,255,0.55)',
              '&:hover': { color: repeat !== 'off' ? '#1ED760' : '#fff' },
              transition: 'color 0.2s',
            }}
          >
            {repeat === 'one' ? (
              <RepeatOneIcon sx={{ fontSize: 22 }} />
            ) : (
              <RepeatIcon sx={{ fontSize: 22 }} />
            )}
          </IconButton>
        </Box>

        {/* ── Volume ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 'auto' }}>
          <IconButton
            size="small"
            onClick={() => dispatch(toggleMute())}
            sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#fff' } }}
          >
            <VolumeIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <Slider
            size="small"
            value={isMuted ? 0 : volume}
            max={1}
            step={0.01}
            onChange={handleVolumeChange}
            sx={{
              color: '#fff',
              flex: 1,
              height: 4,
              '& .MuiSlider-thumb': {
                width: 12,
                height: 12,
                opacity: 0,
                transition: 'opacity 0.2s',
              },
              '&:hover .MuiSlider-thumb': { opacity: 1 },
              '& .MuiSlider-track': { border: 'none', bgcolor: '#fff' },
              '& .MuiSlider-rail': { opacity: 0.25, bgcolor: '#fff' },
            }}
          />
          <VolumeUpIcon sx={{ fontSize: 20, color: 'rgba(255,255,255,0.6)' }} />
        </Box>
      </Box>
    </Box>
  );
};

export default FullScreenPlayer;
