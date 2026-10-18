/**
 * Sheba Sound — Song List Item
 * -----------------------------
 * Horizontal row with hover number→play transition, like button,
 * "Add to Playlist" menu, subtle background highlight, and clean
 * typography hierarchy. Theme-aware: adapts to dark and light mode.
 */

import { useState } from "react";
import {
  ListItem,
  ListItemButton,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Typography,
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon as MuiListItemIcon,
  Chip,
  Divider,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import EqualizerIcon from "@mui/icons-material/Equalizer";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import QueueMusicIcon from "@mui/icons-material/QueueMusic";
import DownloadForOfflineIcon from "@mui/icons-material/DownloadForOffline";
import LockIcon from "@mui/icons-material/Lock";
import PersonIcon from "@mui/icons-material/Person";
import ShareIcon from "@mui/icons-material/Share";
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay";
import { useNavigate } from "react-router-dom";
import type { Song } from "@/types/models";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { playTrack, togglePlayPause, addToQueue, playNext } from "@/features/player/playerSlice";
import { formatDuration, formatStreamCount } from "@/utils/helpers";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useToggleLikeMutation, useDownloadSongMutation } from "@/features/music/musicApi";
import type { SongWithArtist } from "@/features/music/musicApi";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useTranslation } from "@/i18n/useTranslation";
import { ROUTES } from "@/utils/constants";
import AddToPlaylistModal from "./AddToPlaylistModal";
import { SONG_PLACEHOLDER } from "@/utils/placeholders";

interface SongListItemProps {
  song: Song;
  index: number;
  queue?: Song[];
}

const SongListItem: React.FC<SongListItemProps> = ({ song, index, queue }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { currentTrack, isPlaying } = useAppSelector((state) => state.player);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const { requireAuth } = useRequireAuth();
  const [toggleLike] = useToggleLikeMutation();
  const [downloadSong] = useDownloadSongMutation();
  const [liked, setLiked] = useState(false);
  const { isPremium } = usePremiumStatus();
  const { t } = useTranslation();

  // Menu state
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);

  // Download state
  const [isDownloading, setIsDownloading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'info' | 'error';
  }>({ open: false, message: '', severity: 'info' });

  const isCurrentSong = currentTrack?.id === song.id;
  const artistName = (song as SongWithArtist).artist_name ?? 'Unknown Artist';

  const handleClick = (): void => {
    if (!requireAuth()) return;
    if (isCurrentSong) {
      dispatch(togglePlayPause());
    } else {
      dispatch(playTrack({ track: song, queue }));
    }
  };

  const handleLike = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (!requireAuth()) return;
    setLiked(!liked);
    toggleLike(song.id).catch(() => setLiked(liked));
  };

  const handleOpenMenu = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    if (!requireAuth()) return;
    setMenuAnchor(e.currentTarget);
  };

  const handleDownload = async (): Promise<void> => {
    setMenuAnchor(null);

    if (!isPremium) {
      setSnackbar({
        open: true,
        message: t('common.premiumRequired'),
        severity: 'info',
      });
      setTimeout(() => navigate(ROUTES.LISTENER_SUBSCRIPTION), 1500);
      return;
    }

    // Premium user — save to in-app downloads via API
    setIsDownloading(true);
    setSnackbar({ open: true, message: t('common.downloading'), severity: 'info' });

    try {
      await downloadSong(song.id).unwrap();
      setIsDownloading(false);
      setSnackbar({
        open: true,
        message: t('common.downloadComplete', { title: song.title }),
        severity: 'success',
      });
    } catch {
      setIsDownloading(false);
      setSnackbar({
        open: true,
        message: 'Download failed. Please try again.',
        severity: 'error',
      });
    }
  };

  const handleAddToQueue = (): void => {
    dispatch(addToQueue(song));
    setMenuAnchor(null);
    setSnackbar({ open: true, message: `"${song.title}" added to queue`, severity: 'success' });
  };

  const handlePlayNext = (): void => {
    dispatch(playNext(song));
    setMenuAnchor(null);
    setSnackbar({ open: true, message: `"${song.title}" will play next`, severity: 'success' });
  };

  const handleGoToArtist = (): void => {
    setMenuAnchor(null);
    if (song.artist) navigate(`/artist/${song.artist}`);
  };

  const handleShare = async (): Promise<void> => {
    setMenuAnchor(null);
    const shareUrl = `${window.location.origin}/song/${song.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: song.title,
          text: `Listen to "${song.title}" by ${artistName} on Sheba Sound`,
          url: shareUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setSnackbar({ open: true, message: 'Link copied to clipboard!', severity: 'success' });
    }
  };


  return (
    <ListItem
      disablePadding
      secondaryAction={
        isAuthenticated ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
            <IconButton
              size="small"
              onClick={handleLike}
              sx={{ color: liked ? "#e91e63" : "text.disabled" }}
            >
              {liked ? <FavoriteIcon sx={{ fontSize: 18 }} /> : <FavoriteBorderIcon sx={{ fontSize: 18 }} />}
            </IconButton>
            <IconButton
              size="small"
              onClick={handleOpenMenu}
              sx={{
                color: "text.disabled",
                "&:hover": { color: "text.primary" },
              }}
            >
              <MoreVertIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        ) : undefined
      }
    >
      <ListItemButton
        onClick={handleClick}
        sx={{
          borderRadius: 1,
          py: 0.75,
          px: { xs: 1, sm: 2 },
          "&:hover": {
            bgcolor: "action.hover",
          },
          "&:hover .song-index": { display: "none" },
          "&:hover .song-play": { display: "flex" },
        }}
      >
        {/* Index / Play icon */}
        <Box sx={{ width: 32, textAlign: "center", mr: 1.5, flexShrink: 0 }}>
          {isCurrentSong && isPlaying ? (
            <EqualizerIcon sx={{ fontSize: 16, color: "#1DB954" }} />
          ) : (
            <>
              <Typography
                className="song-index"
                variant="body2"
                sx={{
                  fontSize: "0.8125rem",
                  color: isCurrentSong ? "#1DB954" : "text.secondary",
                }}
              >
                {index + 1}
              </Typography>
              <PlayArrowIcon
                className="song-play"
                sx={{ fontSize: 16, display: "none", color: "text.primary" }}
              />
            </>
          )}
        </Box>

        {/* Thumbnail */}
        <ListItemAvatar sx={{ minWidth: 48 }}>
          <Avatar
            variant="rounded"
            src={song.cover_image_url || SONG_PLACEHOLDER}
            alt={song.title}
            sx={{ width: 40, height: 40, borderRadius: 1 }}
          />
        </ListItemAvatar>

        {/* Title + Artist */}
        <ListItemText
          primary={
            <Typography
              variant="body2"
              fontWeight={500}
              noWrap
              sx={{
                color: isCurrentSong ? "#1DB954" : "text.primary",
                fontSize: "0.875rem",
              }}
            >
              {song.title}
            </Typography>
          }
          secondary={
            <Typography
              variant="caption"
              noWrap
              component="span"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                if (song.artist) navigate(`/artist/${song.artist}`);
              }}
              sx={{
                color: "text.secondary",
                fontSize: "0.6875rem",
                cursor: "pointer",
                '&:hover': {
                  color: "text.primary",
                  textDecoration: "underline",
                },
              }}
            >
              {artistName}
            </Typography>
          }
          sx={{ mr: 2 }}
        />

        {/* Stream Count */}
        <Typography
          variant="caption"
          sx={{
            mr: 2,
            display: { xs: "none", sm: "block" },
            color: "text.secondary",
            fontSize: "0.6875rem",
          }}
        >
          {formatStreamCount(song.stream_count)} plays
        </Typography>

        {/* Duration */}
        <Typography
          variant="caption"
          sx={{ color: "text.secondary", fontSize: "0.6875rem", mr: isAuthenticated ? { xs: 5, sm: 7 } : 0 }}
        >
          {formatDuration(song.duration)}
        </Typography>
      </ListItemButton>

      {/* ---- Context Menu ---- */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              minWidth: 220,
              bgcolor: (th) => th.palette.mode === 'dark' ? '#282838' : '#fff',
              boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
              border: (th) => th.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
              backdropFilter: 'blur(20px)',
              overflow: 'visible',
              py: 0.5,
            },
          },
        }}
      >
        {/* Song info header */}
        <Box sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            variant="rounded"
            src={song.cover_image_url || SONG_PLACEHOLDER}
            alt={song.title}
            sx={{ width: 40, height: 40, borderRadius: 1 }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} noWrap sx={{ fontSize: '0.8125rem' }}>
              {song.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.6875rem' }}>
              {artistName}
            </Typography>
          </Box>
        </Box>
        <Divider sx={{ my: 0.5 }} />

        <MenuItem onClick={handleAddToQueue} sx={{ py: 1, px: 2 }}>
          <MuiListItemIcon><QueueMusicIcon sx={{ fontSize: 20 }} /></MuiListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem', fontWeight: 500 }}>Add to Queue</ListItemText>
        </MenuItem>

        <MenuItem onClick={handlePlayNext} sx={{ py: 1, px: 2 }}>
          <MuiListItemIcon><PlaylistPlayIcon sx={{ fontSize: 20 }} /></MuiListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem', fontWeight: 500 }}>Play Next</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => { setMenuAnchor(null); setPlaylistModalOpen(true); }} sx={{ py: 1, px: 2 }}>
          <MuiListItemIcon><PlaylistAddIcon sx={{ fontSize: 20 }} /></MuiListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem', fontWeight: 500 }}>Add to Playlist</ListItemText>
        </MenuItem>

        <Divider sx={{ my: 0.5 }} />

        <MenuItem onClick={handleGoToArtist} sx={{ py: 1, px: 2 }}>
          <MuiListItemIcon><PersonIcon sx={{ fontSize: 20 }} /></MuiListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem', fontWeight: 500 }}>Go to Artist</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleShare} sx={{ py: 1, px: 2 }}>
          <MuiListItemIcon><ShareIcon sx={{ fontSize: 20 }} /></MuiListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem', fontWeight: 500 }}>Share</ListItemText>
        </MenuItem>

        <Divider sx={{ my: 0.5 }} />

        {/* ---- Download (Premium Feature) ---- */}
        <MenuItem
          onClick={handleDownload}
          sx={{ py: 1, px: 2, opacity: isPremium ? 1 : 0.85 }}
        >
          <MuiListItemIcon>
            {isDownloading ? (
              <CircularProgress size={20} sx={{ color: '#12A64A' }} />
            ) : isPremium ? (
              <DownloadForOfflineIcon sx={{ fontSize: 20, color: '#12A64A' }} />
            ) : (
              <LockIcon sx={{ fontSize: 20, color: '#F39C12' }} />
            )}
          </MuiListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem', fontWeight: 500 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {t('common.download')}
              {!isPremium && (
                <Chip
                  label={t('common.premiumOnly')}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    bgcolor: 'rgba(243,156,18,0.15)',
                    color: '#F39C12',
                    borderRadius: 99,
                  }}
                />
              )}
            </Box>
          </ListItemText>
        </MenuItem>
      </Menu>

      {/* ---- Add to Playlist Modal ---- */}
      <AddToPlaylistModal
        open={playlistModalOpen}
        onClose={() => setPlaylistModalOpen(false)}
        songId={song.id}
        songTitle={song.title}
      />

      {/* ---- Download Feedback Snackbar ---- */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%', borderRadius: 2, fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </ListItem>
  );
};

export default SongListItem;
