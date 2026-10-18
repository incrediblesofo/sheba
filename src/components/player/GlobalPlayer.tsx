/**
 * Sheba Sound — Global Audio Player
 * -----------------------------------
 * Persistent bottom bar with sleek design,
 * Ethiopian green accent on controls, and smooth animations.
 * Theme-aware: adapts to dark and light mode.
 * Calls stream/history API when a song plays.
 *
 * Layout: [TrackInfo] [PlaybackControls + ProgressBar] [VolumeSlider + Queue]
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Slider,
  Avatar,
  useMediaQuery,
  useTheme,
} from '@mui/material';
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
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import RadioIcon from '@mui/icons-material/Radio';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  togglePlayPause,
  nextTrack,
  prevTrack,
  setProgress,
  seekTo,
  setDuration,
  setVolume,
  toggleMute,
  toggleShuffle,
  cycleRepeat,
  toggleFullScreen,
  toggleRadioMode,
} from '@/features/player/playerSlice';
import { formatDuration } from '@/utils/helpers';
import { useStreamSongMutation, useRecordListenMutation } from '@/features/music/musicApi';
import type { SongWithArtist } from '@/features/music/musicApi';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { BOTTOM_NAV_HEIGHT } from '@/utils/constants';
import { useRadioEngine } from '@/hooks/useRadioEngine';
import AudioQualityBadge from '@/components/premium/AudioQualityBadge';
import AudioAdOverlay from '@/components/ads/AudioAdOverlay';
import DownloadButton from '@/components/music/DownloadButton';
import { SONG_PLACEHOLDER } from '@/utils/placeholders';
import FullScreenPlayer from './FullScreenPlayer';
import QueueDrawer from './QueueDrawer';

/** Height of the player bar in pixels. */
export const PLAYER_HEIGHT = 72;
export const PLAYER_HEIGHT_MOBILE = 64;

const GlobalPlayer: React.FC = () => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDark = theme.palette.mode === 'dark';

  const {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    progress,
    duration,
    shuffle,
    repeat,
    radioMode,
  } = useAppSelector((state) => state.player);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [streamSong] = useStreamSongMutation();
  const [recordListen] = useRecordListenMutation();
  const [hasRecordedListen, setHasRecordedListen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const { isPremium } = usePremiumStatus();

  // Mount the radio engine — silently extends queue when radioMode is on
  useRadioEngine();

  // Ad interstitial state: show every 3 songs for free users
  const [songPlayCount, setSongPlayCount] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const AD_INTERVAL = 3;

  /* ---- Sync play/pause ---- */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying, currentTrack]);

  /* ---- Reset listen tracking on track change ---- */
  useEffect(() => {
    setHasRecordedListen(false);
    // Increment song play counter for ad logic
    setSongPlayCount((prev) => prev + 1);
  }, [currentTrack?.id]);

  /* ---- Show ad interstitial every N songs for free users ---- */
  useEffect(() => {
    if (!isPremium && songPlayCount > 0 && songPlayCount % AD_INTERVAL === 0) {
      setShowAd(true);
    }
  }, [songPlayCount, isPremium]);

  /* ---- Record listen after 30 seconds + increment stream ---- */
  useEffect(() => {
    if (hasRecordedListen || !currentTrack || !isPlaying) return;
    if (progress >= 30) {
      setHasRecordedListen(true);
      // Fire and forget — don't block playback
      streamSong(currentTrack.id).catch(() => {});
      if (isAuthenticated) {
        recordListen(currentTrack.id).catch(() => {});
      }
    }
  }, [progress, hasRecordedListen, currentTrack, isPlaying, streamSong, recordListen, isAuthenticated]);

  /* ---- Sync volume ---- */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  /* ---- Seek ---- */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (Math.abs(audio.currentTime - progress) > 1.5) {
      audio.currentTime = progress;
    }
  }, [progress, currentTrack]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (audio) dispatch(setProgress(audio.currentTime));
  }, [dispatch]);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (audio) dispatch(setDuration(audio.duration));
  }, [dispatch]);

  const handleEnded = useCallback(() => {
    dispatch(nextTrack());
  }, [dispatch]);

  const handleProgressChange = (_e: Event, value: number | number[]): void => {
    dispatch(seekTo(value as number));
  };

  const handleVolumeChange = (_e: Event, value: number | number[]): void => {
    dispatch(setVolume(value as number));
  };

  const VolumeIcon =
    isMuted || volume === 0
      ? VolumeOffIcon
      : volume < 0.5
        ? VolumeDownIcon
        : VolumeUpIcon;

  if (!currentTrack) return null;

  const artistName = (currentTrack as SongWithArtist).artist_name ?? 'Unknown Artist';
  const qualityTier = (currentTrack as SongWithArtist).quality_tier ?? (isPremium ? 'high' : 'standard');

  return (
    <>
      {/* Full-screen overlay */}
      <FullScreenPlayer />

      {/* Queue drawer */}
      <QueueDrawer open={queueOpen} onClose={() => setQueueOpen(false)} />

      {/* Ad interstitial for free users */}
      <AudioAdOverlay open={showAd} onClose={() => setShowAd(false)} />

      <audio
        ref={audioRef}
        src={currentTrack.audio_file_url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />

      <Box
        sx={{
          position: 'fixed',
          bottom: { xs: `${BOTTOM_NAV_HEIGHT}px`, md: 0 },
          left: { xs: '6px', md: 0 },
          right: { xs: '6px', md: 0 },
          height: { xs: PLAYER_HEIGHT_MOBILE, sm: PLAYER_HEIGHT },
          bgcolor: { xs: isDark ? 'rgba(18, 80, 40, 0.95)' : 'rgba(18, 166, 74, 0.12)', md: 'background.paper' },
          borderTop: { xs: 'none', md: (t: any) => `1px solid ${t.palette.divider}` },
          borderRadius: { xs: '8px', md: 0 },
          display: 'flex',
          alignItems: 'center',
          px: { xs: 0.75, sm: 2, md: 3 },
          zIndex: theme.zIndex.appBar + 1,
          gap: { xs: 0.5, sm: 2 },
          mb: { xs: '2px', md: 0 },
          backdropFilter: { xs: 'blur(16px)', md: 'none' },
        }}
      >
        {/* ---- Track Info (left) — click to open full-screen player ---- */}
        <Box
          component="div"
          title="Open full-screen player"
          onClick={() => dispatch(toggleFullScreen())}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 0.75, sm: 1.5 },
            minWidth: { xs: 80, sm: 180 },
            maxWidth: { xs: 120, sm: 280 },
            flex: '0 0 auto',
            cursor: 'pointer',
            borderRadius: 2,
            px: 0.5,
            py: 0.5,
            transition: 'background-color 0.15s',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <Avatar
            variant="rounded"
            src={currentTrack.cover_image_url || SONG_PLACEHOLDER}
            alt={currentTrack.title}
            sx={{
              width: { xs: 40, sm: 48 },
              height: { xs: 40, sm: 48 },
              borderRadius: 1,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              flexShrink: 0,
            }}
          />
          <Box sx={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              fontWeight={600}
              noWrap
              sx={{ color: 'text.primary', fontSize: { xs: '0.7rem', sm: '0.8125rem' } }}
            >
              {currentTrack.title}
            </Typography>
            <Typography
              variant="caption"
              noWrap
              sx={{ color: 'text.secondary', fontSize: { xs: '0.6rem', sm: '0.6875rem' } }}
            >
              {artistName}
            </Typography>
          </Box>
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 0.5 }}>
            <AudioQualityBadge quality={qualityTier} />
            <DownloadButton songId={currentTrack.id} size="small" />
            <OpenInFullIcon sx={{ fontSize: 14, color: 'text.disabled', flexShrink: 0, mr: 0.5 }} />
          </Box>
        </Box>

        {/* ---- Playback Controls + Progress (center) ---- */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: 0,
          }}
        >
          {/* Control buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {!isMobile && (
              <IconButton
                size="small"
                onClick={() => dispatch(toggleShuffle())}
                sx={{
                  color: shuffle ? '#1DB954' : 'text.secondary',
                  '&:hover': { color: shuffle ? '#1ED760' : 'text.primary' },
                }}
              >
                <ShuffleIcon sx={{ fontSize: 18 }} />
              </IconButton>
            )}

            <IconButton
              size="small"
              onClick={() => dispatch(prevTrack())}
              sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
            >
              <SkipPreviousIcon sx={{ fontSize: 20 }} />
            </IconButton>

            <IconButton
              onClick={() => dispatch(togglePlayPause())}
              sx={{
                bgcolor: isDark ? '#fff' : '#121212',
                color: isDark ? '#000' : '#fff',
                '&:hover': {
                  bgcolor: isDark ? '#fff' : '#121212',
                  transform: 'scale(1.06)',
                },
                width: 32,
                height: 32,
                transition: 'transform 0.15s ease',
              }}
            >
              {isPlaying ? (
                <PauseIcon sx={{ fontSize: 18 }} />
              ) : (
                <PlayArrowIcon sx={{ fontSize: 18 }} />
              )}
            </IconButton>

            <IconButton
              size="small"
              onClick={() => dispatch(nextTrack())}
              sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
            >
              <SkipNextIcon sx={{ fontSize: 20 }} />
            </IconButton>

            {!isMobile && (
              <IconButton
                size="small"
                onClick={() => dispatch(cycleRepeat())}
                sx={{
                  color: repeat !== 'off' ? '#1DB954' : 'text.secondary',
                  '&:hover': { color: repeat !== 'off' ? '#1ED760' : 'text.primary' },
                }}
              >
                {repeat === 'one' ? (
                  <RepeatOneIcon sx={{ fontSize: 18 }} />
                ) : (
                  <RepeatIcon sx={{ fontSize: 18 }} />
                )}
              </IconButton>
            )}
          </Box>

          {/* Progress bar */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              maxWidth: 600,
              gap: 1,
              mt: -0.5,
            }}
          >
            <Typography
              variant="caption"
              sx={{ minWidth: { xs: 28, sm: 36 }, textAlign: 'right', color: 'text.secondary', fontSize: { xs: '0.56rem', sm: '0.625rem' } }}
            >
              {formatDuration(progress)}
            </Typography>
            <Slider
              size="small"
              value={progress}
              max={duration || 1}
              onChange={handleProgressChange}
              sx={{
                flex: 1,
                height: 4,
                '& .MuiSlider-thumb': {
                  width: 12,
                  height: 12,
                  opacity: 0,
                  transition: 'opacity 0.2s',
                },
                '&:hover .MuiSlider-thumb': {
                  opacity: 1,
                },
                '& .MuiSlider-rail': {
                  opacity: 0.2,
                  bgcolor: isDark ? '#535353' : 'rgba(0,0,0,0.2)',
                },
                '& .MuiSlider-track': { border: 'none' },
              }}
            />
            <Typography
              variant="caption"
              sx={{ minWidth: { xs: 28, sm: 36 }, color: 'text.secondary', fontSize: { xs: '0.56rem', sm: '0.625rem' } }}
            >
              {formatDuration(duration)}
            </Typography>
          </Box>
        </Box>

        {/* ---- Volume + Queue (right, hidden on mobile) ---- */}
        {!isMobile && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              minWidth: 170,
              flex: '0 0 auto',
            }}
          >
            {/* Queue button */}
            <IconButton
              size="small"
              onClick={() => setQueueOpen(true)}
              sx={{
                color: queueOpen ? '#1DB954' : 'text.secondary',
                '&:hover': { color: 'text.primary' },
              }}
            >
              <QueueMusicIcon sx={{ fontSize: 18 }} />
            </IconButton>

            {/* Radio toggle chip */}
            <Box
              component="div"
              title={radioMode ? 'Radio ON — auto-playing similar songs' : 'Radio OFF — click to enable auto-play'}
              onClick={() => dispatch(toggleRadioMode())}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.4,
                px: 1,
                py: 0.3,
                borderRadius: 99,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: radioMode ? '#1DB954' : 'divider',
                bgcolor: radioMode ? 'rgba(29,185,84,0.12)' : 'transparent',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: radioMode ? '#1ED760' : 'text.secondary',
                  bgcolor: radioMode ? 'rgba(29,185,84,0.2)' : 'action.hover',
                },
                // Pulse glow when active
                ...(radioMode && {
                  boxShadow: '0 0 8px rgba(29,185,84,0.35)',
                  animation: 'radioPulse 2.5s ease-in-out infinite',
                  '@keyframes radioPulse': {
                    '0%, 100%': { boxShadow: '0 0 6px rgba(29,185,84,0.3)' },
                    '50%': { boxShadow: '0 0 14px rgba(29,185,84,0.55)' },
                  },
                }),
              }}
            >
              <RadioIcon
                sx={{
                  fontSize: 13,
                  color: radioMode ? '#1DB954' : 'text.disabled',
                }}
              />
              <Box
                component="span"
                sx={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  color: radioMode ? '#1DB954' : 'text.disabled',
                  textTransform: 'uppercase',
                }}
              >
                Radio
              </Box>
            </Box>

            <IconButton
              size="small"
              onClick={() => dispatch(toggleMute())}
              sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
            >
              <VolumeIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <Slider
              size="small"
              value={isMuted ? 0 : volume}
              max={1}
              step={0.01}
              onChange={handleVolumeChange}
              sx={{
                width: 100,
                height: 4,
                '& .MuiSlider-thumb': {
                  width: 12,
                  height: 12,
                  opacity: 0,
                  transition: 'opacity 0.2s',
                },
                '&:hover .MuiSlider-thumb': {
                  opacity: 1,
                },
                '& .MuiSlider-rail': {
                  opacity: 0.2,
                  bgcolor: isDark ? '#535353' : 'rgba(0,0,0,0.2)',
                },
                '& .MuiSlider-track': { border: 'none' },
              }}
            />
          </Box>
        )}
      </Box>
    </>
  );
};

export default GlobalPlayer;
