/**
 * Sheba Sound — Album Card
 * -------------------------
 * Card with rounded cover art, hover play overlay,
 * and genre chip with Ethiopian color accents.
 * Theme-aware: adapts to dark and light mode.
 */

import {
  Card,
  CardMedia,
  CardContent,
  CardActionArea,
  Typography,
  Box,
  Chip,
  IconButton,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { useNavigate } from "react-router-dom";
import type { Album } from "@/types/models";
import { ALBUM_PLACEHOLDER } from "@/utils/placeholders";

interface AlbumCardProps {
  album: Album;
  artistName?: string;
}

const AlbumCard: React.FC<AlbumCardProps> = ({ album, artistName }) => {
  const navigate = useNavigate();

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
      }}
    >
      <CardActionArea
        onClick={() => navigate(`/album/${album.id}`)}
        sx={{ p: 1.5, pb: 0 }}
      >
        <Box sx={{ position: "relative" }}>
          <CardMedia
            component="img"
            height={160}
            image={
              album.cover_image_url || ALBUM_PLACEHOLDER
            }
            alt={album.title}
            sx={{
              objectFit: "cover",
              borderRadius: 1.5,
              aspectRatio: "1 / 1",
            }}
          />
          <IconButton
            className="play-btn"
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
            {album.title}
          </Typography>
          <Typography
            variant="caption"
            noWrap
            component="p"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              if (album.artist) navigate(`/artist/${album.artist}`);
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
            {artistName ?? (album as any).artist_name ?? "Unknown Artist"}
          </Typography>
          <Chip
            label={album.genre}
            size="small"
            sx={{
              mt: 0.75,
              fontSize: "0.625rem",
              height: 22,
              fontWeight: 600,
              bgcolor: "rgba(29, 185, 84, 0.15)",
              color: "#1DB954",
              borderRadius: 500,
            }}
          />
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default AlbumCard;
