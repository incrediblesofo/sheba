/**
 * Sheba Sound — Song Card
 * ------------------------
 * Premium card with scaling cover art, animated equaliser overlay,
 * hover play FAB, like button, and Ethiopian genre tags. Theme-aware.
 */

import {
  Card,
  CardMedia,
  CardContent,
  CardActionArea,
  Typography,
  Box,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
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
import { formatDuration } from "@/utils/helpers";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useToggleLikeMutation, useDownloadSongMutation } from "@/features/music/musicApi";
import type { SongWithArtist } from "@/features/music/musicApi";
import { useState } from "react";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useTranslation } from "@/i18n/useTranslation";
import { ROUTES } from "@/utils/constants";
import AddToPlaylistModal from "./AddToPlaylistModal";
import { SONG_PLACEHOLDER } from "@/utils/placeholders";

/* Genre → accent colour mapping */
const GENRE_COLORS: Record<string, { bg: string; text: string }> = {
  tizita:      { bg: "rgba(252, 221, 9, 0.15)",   text: "#FCDD09" },
  afrobeat:    { bg: "rgba(18, 166, 74, 0.15)",   text: "#12A64A" },
  "ethio-jazz":{ bg: "rgba(15, 71, 175, 0.18)",   text: "#6B9FFF" },
  gospel:      { bg: "rgba(218, 18, 26, 0.15)",   text: "#F06E73" },
  traditional: { bg: "rgba(252, 221, 9, 0.15)",   text: "#FCDD09" },
  pop:         { bg: "rgba(180, 80, 220, 0.15)",  text: "#C97EE8" },
  default:     { bg: "rgba(18, 166, 74, 0.15)",   text: "#12A64A" },
};

const getGenreColor = (genre?: string) =>
  GENRE_COLORS[genre?.toLowerCase() ?? "default"] ?? GENRE_COLORS.default;

interface SongCardProps {
  song: Song;
  queue?: Song[];
}

const SongCard: React.FC<SongCardProps> = ({ song, queue }) => {
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

  // Context menu state
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
  const isThisPlaying = isCurrentSong && isPlaying;
  // Use artist_name from API if available, otherwise fallback
  const artistName = (song as SongWithArtist).artist_name ?? 'Unknown Artist';
  const genreColor = getGenreColor(song.genre);

  const handlePlay = (): void => {
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

  const handleDownload = async (): Promise<void> => {
    setMenuAnchor(null);

    if (!isPremium) {
      setSnackbar({
        open: true,
        message: t('common.premiumRequired'),
        severity: 'info',
      });
      // Short delay so the user sees the toast before navigating
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

  return (
    <>
    <Card
      sx={{
        width: "100%",
        maxWidth: { xs: 165, sm: 210 },
        minWidth: { xs: 140, sm: 170 },
        bgcolor: (t) => t.palette.mode === "dark" ? "#16161F" : "#FFFFFF",
        borderRadius: 2,
        transition: "all 0.28s cubic-bezier(0.25, 0.8, 0.25, 1)",
        cursor: "pointer",
        overflow: "hidden",
        border: isCurrentSong
          ? "1.5px solid rgba(18, 166, 74, 0.5)"
          : "1.5px solid transparent",
        "&:hover": {
          bgcolor: (t) =>
            t.palette.mode === "dark" ? "#1E1E2A" : "rgba(0,0,0,0.03)",
          boxShadow: "0 12px 40px rgba(18, 166, 74, 0.18)",
          transform: "translateY(-4px)",
          "& .song-cover": {
            transform: "scale(1.06)",
          },
          "& .play-btn": {
            opacity: 1,
            transform: "translateY(0) scale(1)",
          },
          "& .like-btn": {
            opacity: 1,
          },
          "& .more-btn": {
            opacity: 1,
          },
        },
        position: "relative",
      }}
    >
      <CardActionArea onClick={handlePlay} sx={{ p: 1.5, pb: 0 }}>
        <Box sx={{ position: "relative", overflow: "hidden", borderRadius: 1.5 }}>
          <CardMedia
            component="img"
            image={song.cover_image_url || SONG_PLACEHOLDER}
            alt={song.title}
            className="song-cover"
            sx={{
              height: { xs: 140, sm: 175 },
              objectFit: "cover",
              borderRadius: 1.5,
              aspectRatio: "1 / 1",
              transition: "transform 0.35s cubic-bezier(0.25, 0.8, 0.25, 1)",
              display: "block",
            }}
          />

          {/* Green glow overlay when active */}
          {isCurrentSong && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                borderRadius: 1.5,
                background: "linear-gradient(180deg, transparent 40%, rgba(18,166,74,0.3) 100%)",
                pointerEvents: "none",
              }}
            />
          )}

          {/* Equaliser animation — bottom-left when playing */}
          {isThisPlaying && (
            <Box
              sx={{
                position: "absolute",
                bottom: 10,
                left: 10,
                bgcolor: "rgba(0,0,0,0.55)",
                borderRadius: 1,
                px: 0.75,
                py: 0.5,
              }}
            >
              <Box className="eq-bars">
                <span />
                <span />
                <span />
              </Box>
            </Box>
          )}

          {/* Like button — top-right */}
          {isAuthenticated && (
            <IconButton
              className="like-btn"
              onClick={handleLike}
              size="small"
              sx={{
                position: "absolute",
                top: 6,
                right: 6,
                opacity: liked ? 1 : 0,
                transition: "opacity 0.2s",
                bgcolor: "rgba(0,0,0,0.5)",
                "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
                color: liked ? "#e91e63" : "#fff",
                width: 30,
                height: 30,
              }}
            >
              {liked ? <FavoriteIcon sx={{ fontSize: 16 }} /> : <FavoriteBorderIcon sx={{ fontSize: 16 }} />}
            </IconButton>
          )}

          {/* Three-dot menu placeholder — space is occupied but button is rendered outside CardActionArea */}

          {/* Play / Pause FAB — slides up on hover */}
          <IconButton
            className="play-btn"
            onClick={handlePlay}
            sx={{
              position: "absolute",
              bottom: 8,
              right: 8,
              background: "linear-gradient(135deg, #12A64A 0%, #078930 100%)",
              color: "#000",
              "&:hover": {
                background: "linear-gradient(135deg, #1ED760 0%, #12A64A 100%)",
                transform: "scale(1.08) translateY(0) !important",
              },
              width: { xs: 38, sm: 46 },
              height: { xs: 38, sm: 46 },
              opacity: isThisPlaying ? 1 : 0,
              transform: isThisPlaying ? "translateY(0) scale(1)" : "translateY(10px) scale(0.9)",
              transition: "all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}
            size="medium"
          >
            {isThisPlaying ? (
              <PauseIcon sx={{ fontSize: 22 }} />
            ) : (
              <PlayArrowIcon sx={{ fontSize: 22 }} />
            )}
          </IconButton>
        </Box>

        <CardContent sx={{ px: 0.5, pt: 1.5, pb: "12px !important" }}>
          <Typography
            variant="body2"
            fontWeight={700}
            noWrap
            sx={{
              color: isCurrentSong ? "#12A64A" : "text.primary",
              fontSize: "0.875rem",
            }}
          >
            {song.title}
          </Typography>
          <Typography
            variant="caption"
            noWrap
            component="p"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              if (song.artist) navigate(`/artist/${song.artist}`);
            }}
            sx={{
              color: "text.secondary",
              mt: 0.25,
              cursor: "pointer",
              '&:hover': {
                color: "text.primary",
                textDecoration: "underline",
              },
            }}
          >
            {artistName}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 0.75 }}>
            {song.genre && (
              <Chip
                label={song.genre}
                size="small"
                sx={{
                  fontSize: "0.6rem",
                  height: 20,
                  fontWeight: 700,
                  bgcolor: genreColor.bg,
                  color: genreColor.text,
                  borderRadius: 500,
                  letterSpacing: "0.03em",
                }}
              />
            )}
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", fontSize: "0.65rem", ml: "auto" }}
            >
              {formatDuration(song.duration)}
            </Typography>
          </Box>
        </CardContent>
      </CardActionArea>

      {/* Three-dot menu — rendered OUTSIDE CardActionArea to avoid click conflicts */}
      {isAuthenticated && (
        <IconButton
          className="more-btn"
          onClick={handleOpenMenu}
          size="small"
          sx={{
            position: "absolute",
            top: 12,
            left: 12,
            opacity: 0,
            transition: "opacity 0.2s",
            bgcolor: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(8px)",
            "&:hover": { bgcolor: "rgba(0,0,0,0.75)" },
            color: "#fff",
            width: 30,
            height: 30,
            zIndex: 2,
          }}
        >
          <MoreVertIcon sx={{ fontSize: 16 }} />
        </IconButton>
      )}
    </Card>

    {/* ---- Context Menu ---- */}
    <Menu
      anchorEl={menuAnchor}
      open={Boolean(menuAnchor)}
      onClose={() => setMenuAnchor(null)}
      transformOrigin={{ horizontal: 'left', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
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
        <Box
          component="img"
          src={song.cover_image_url || SONG_PLACEHOLDER}
          alt={song.title}
          sx={{ width: 40, height: 40, borderRadius: 1, objectFit: 'cover', flexShrink: 0 }}
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
        <ListItemIcon><QueueMusicIcon sx={{ fontSize: 20 }} /></ListItemIcon>
        <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem', fontWeight: 500 }}>Add to Queue</ListItemText>
      </MenuItem>

      <MenuItem onClick={handlePlayNext} sx={{ py: 1, px: 2 }}>
        <ListItemIcon><PlaylistPlayIcon sx={{ fontSize: 20 }} /></ListItemIcon>
        <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem', fontWeight: 500 }}>Play Next</ListItemText>
      </MenuItem>

      <MenuItem
        onClick={() => { setMenuAnchor(null); setPlaylistModalOpen(true); }}
        sx={{ py: 1, px: 2 }}
      >
        <ListItemIcon><PlaylistAddIcon sx={{ fontSize: 20 }} /></ListItemIcon>
        <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem', fontWeight: 500 }}>Add to Playlist</ListItemText>
      </MenuItem>

      <Divider sx={{ my: 0.5 }} />

      <MenuItem onClick={handleGoToArtist} sx={{ py: 1, px: 2 }}>
        <ListItemIcon><PersonIcon sx={{ fontSize: 20 }} /></ListItemIcon>
        <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem', fontWeight: 500 }}>Go to Artist</ListItemText>
      </MenuItem>

      <MenuItem onClick={handleShare} sx={{ py: 1, px: 2 }}>
        <ListItemIcon><ShareIcon sx={{ fontSize: 20 }} /></ListItemIcon>
        <ListItemText primaryTypographyProps={{ fontSize: '0.8125rem', fontWeight: 500 }}>Share</ListItemText>
      </MenuItem>

      <Divider sx={{ my: 0.5 }} />

      {/* ---- Download (Premium Feature) ---- */}
      <MenuItem
        onClick={handleDownload}
        sx={{ py: 1, px: 2, opacity: isPremium ? 1 : 0.85 }}
      >
        <ListItemIcon>
          {isDownloading ? (
            <CircularProgress size={20} sx={{ color: '#12A64A' }} />
          ) : isPremium ? (
            <DownloadForOfflineIcon sx={{ fontSize: 20, color: '#12A64A' }} />
          ) : (
            <LockIcon sx={{ fontSize: 20, color: '#F39C12' }} />
          )}
        </ListItemIcon>
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
  </>);
};

export default SongCard;
