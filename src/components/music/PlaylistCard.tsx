/**
 * Sheba Sound — Playlist Card
 * ----------------------------
 * Playlist card with cover art, play-all overlay button,
 * and subtle hover transformation.
 * Theme-aware: adapts to dark and light mode.
 */

import {
  Card,
  CardMedia,
  CardContent,
  CardActionArea,
  Typography,
  Box,
  IconButton,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { useNavigate } from "react-router-dom";
import type { Playlist } from "@/types/models";
import { PLAYLIST_PLACEHOLDER } from "@/utils/placeholders";

interface PlaylistCardProps {
  playlist: Playlist;
}

const PlaylistCard: React.FC<PlaylistCardProps> = ({ playlist }) => {
  const navigate = useNavigate();

  const handlePlay = (e: React.MouseEvent): void => {
    e.stopPropagation();
    navigate(`/playlist/${playlist.id}`);
  };

  return (
    <Card
      sx={{
        width: "100%",
        maxWidth: 200,
        minWidth: 160,
        bgcolor: "background.paper",
        borderRadius: 2,
        transition: "all 0.3s ease",
        cursor: "pointer",
        overflow: "hidden",
        "&:hover": {
          bgcolor: (t) =>
            t.palette.mode === "dark"
              ? "rgba(255,255,255,0.08)"
              : "rgba(0,0,0,0.04)",
          "& .play-btn": {
            opacity: 1,
            transform: "translateY(0)",
          },
        },
        position: "relative",
      }}
    >
      <CardActionArea
        onClick={() => navigate(`/playlist/${playlist.id}`)}
        sx={{ p: 1.5, pb: 0 }}
      >
        <Box sx={{ position: "relative" }}>
          <CardMedia
            component="img"
            height={160}
            image={
              playlist.cover_image_url || PLAYLIST_PLACEHOLDER
            }
            alt={playlist.title}
            sx={{
              objectFit: "cover",
              borderRadius: 1.5,
              aspectRatio: "1 / 1",
            }}
          />
          <IconButton
            className="play-btn"
            onClick={handlePlay}
            sx={{
              position: "absolute",
              bottom: 8,
              right: 8,
              bgcolor: "#1DB954",
              color: "#000",
              "&:hover": {
                bgcolor: "#1ED760",
                transform: "scale(1.06) translateY(0) !important",
              },
              width: 44,
              height: 44,
              opacity: 0,
              transform: "translateY(8px)",
              transition: "all 0.25s ease",
              boxShadow: "0 8px 16px rgba(0,0,0,0.4)",
            }}
            size="medium"
          >
            <PlayArrowIcon sx={{ fontSize: 22 }} />
          </IconButton>
        </Box>
        <CardContent sx={{ px: 0.5, pt: 1.5, pb: "12px !important" }}>
          <Typography
            variant="body2"
            fontWeight={700}
            noWrap
            sx={{ color: "text.primary", fontSize: "0.875rem" }}
          >
            {playlist.title}
          </Typography>
          <Typography
            variant="caption"
            noWrap
            component="p"
            sx={{ color: "text.secondary", mt: 0.25 }}
          >
            {playlist.songs.length} songs
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default PlaylistCard;
