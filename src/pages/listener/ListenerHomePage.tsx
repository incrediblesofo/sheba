/**
 * Sheba Sound — Listener Home Page
 * ----------------------------------
 * Mobile-first home page matching JioSaavn-style design:
 * - Green gradient header with greeting
 * - Search bar
 * - Ethiopian language filter chips (Amharic, Oromic, Tigrigna, Gurage)
 * - Featured music grid (2-column)
 * - Trending Now list
 * - Popular Albums horizontal scroll
 * - Top Playlists horizontal scroll
 * Desktop layout preserves the existing design.
 */

import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  List,
  Avatar,
  useTheme,
  Skeleton,
  Chip,
  IconButton,
  useMediaQuery,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import VerifiedIcon from "@mui/icons-material/Verified";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import SettingsIcon from "@mui/icons-material/Settings";
import SearchIcon from "@mui/icons-material/Search";
import { useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "@/app/hooks";
import { setQueue } from "@/features/player/playerSlice";
import { formatStreamCount } from "@/utils/helpers";
import { useTranslation } from "@/i18n";
import SongCard from "@/components/music/SongCard";
import AlbumCard from "@/components/music/AlbumCard";
import PlaylistCard from "@/components/music/PlaylistCard";
import SongListItem from "@/components/music/SongListItem";
import {
  useGetSongsQuery,
  useGetAlbumsQuery,
  useGetPlaylistsQuery,
  useGetArtistsQuery,
} from "@/features/music/musicApi";
import type { SongWithArtist } from "@/features/music/musicApi";
import AdBanner from "@/components/ads/AdBanner";
import { ROUTES } from "@/utils/constants";
import { SONG_PLACEHOLDER, ALBUM_PLACEHOLDER, PLAYLIST_PLACEHOLDER } from "@/utils/placeholders";

/* ------------------------------------------------------------------ */
/*  Language filter chips config                                        */
/* ------------------------------------------------------------------ */
const LANGUAGE_CHIPS = [
  { key: "amharic", label: "Amharic", labelAm: "አማርኛ" },
  { key: "oromic", label: "Oromic", labelAm: "ኦሮሚክ" },
  { key: "tigrigna", label: "Tigrigna", labelAm: "ትግርኛ" },
  { key: "gurage", label: "Gurage", labelAm: "ጉራግኛ" },
];

/** Section Title with theme-aware typography */
const SectionTitle: React.FC<{ children: React.ReactNode; mt?: number }> = ({
  children,
  mt = 4,
}) => (
  <Typography
    variant="h5"
    sx={{
      fontWeight: 800,
      mt,
      mb: 2.5,
      color: "text.primary",
      fontSize: { xs: "1.15rem", sm: "1.5rem" },
      letterSpacing: "-0.02em",
    }}
  >
    {children}
  </Typography>
);

/** Horizontally scrollable row of cards. */
const ScrollRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box
    sx={{
      display: "flex",
      gap: 2,
      overflowX: "auto",
      pb: 1,
      mx: -1,
      px: 1,
      /* thin scrollbar */
      "&::-webkit-scrollbar": { height: 0 },
      scrollbarWidth: "none",
    }}
  >
    {children}
  </Box>
);

/** Loading skeleton row */
const SkeletonRow: React.FC = () => (
  <Box sx={{ display: "flex", gap: 2 }}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Skeleton key={i} variant="rounded" width={180} height={240} sx={{ borderRadius: 2, flexShrink: 0 }} />
    ))}
  </Box>
);

const ListenerHomePage: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { t } = useTranslation();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [selectedLang, setSelectedLang] = useState<string | null>(null);

  // Fetch real data from API
  const { data: songs = [], isLoading: songsLoading } = useGetSongsQuery({ ordering: '-stream_count' });
  const { data: albums = [], isLoading: albumsLoading } = useGetAlbumsQuery({ });
  const { data: playlists = [], isLoading: playlistsLoading } = useGetPlaylistsQuery();
  const { data: artists = [], isLoading: artistsLoading } = useGetArtistsQuery();

  const trendingSongs = [...songs].sort(
    (a, b) => b.stream_count - a.stream_count,
  );

  const newReleases = [...albums].sort(
    (a, b) =>
      new Date(b.release_date).getTime() - new Date(a.release_date).getTime(),
  );

  const handlePlayAll = (): void => {
    dispatch(setQueue(trendingSongs as SongWithArtist[]));
  };

  // Greeting based on time of day
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? t("home.morning") : hour < 18 ? t("home.afternoon") : t("home.evening");
  const greeting = t("home.greeting", { timeOfDay });

  /* ================================================================ */
  /*  MOBILE LAYOUT                                                    */
  /* ================================================================ */
  if (isMobile) {
    return (
      <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
        {/* ---- Green Gradient Header ---- */}
        <Box
          sx={{
            background: "linear-gradient(180deg, #1DB954 0%, #0D7A3A 40%, #0A0A0F 100%)",
            pt: 5,
            pb: 3,
            px: 2,
          }}
        >
          {/* Greeting row */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                color: "#fff",
                fontSize: "1.5rem",
                letterSpacing: "-0.02em",
              }}
            >
              {greeting}
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <IconButton sx={{ color: "rgba(255,255,255,0.85)" }}>
                <AccessTimeIcon />
              </IconButton>
              <IconButton
                sx={{ color: "rgba(255,255,255,0.85)" }}
                onClick={() => navigate(ROUTES.LISTENER_SETTINGS)}
              >
                <SettingsIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Search Bar */}
          <Box
            onClick={() => navigate(ROUTES.LISTENER_SEARCH)}
            sx={{
              display: "flex",
              alignItems: "center",
              bgcolor: "#fff",
              borderRadius: "8px",
              px: 1.5,
              py: 1,
              mb: 2.5,
              cursor: "pointer",
            }}
          >
            <SearchIcon sx={{ color: "rgba(0,0,0,0.5)", fontSize: 20, mr: 1 }} />
            <Typography sx={{ color: "rgba(0,0,0,0.5)", fontSize: "0.875rem" }}>
              {t("home.searchPrompt")}
            </Typography>
          </Box>

          {/* Language Filter Chips */}
          <Box
            sx={{
              display: "flex",
              gap: 1,
              overflowX: "auto",
              pb: 1,
              "&::-webkit-scrollbar": { height: 0 },
              scrollbarWidth: "none",
            }}
          >
            {LANGUAGE_CHIPS.map((chip) => {
              const active = selectedLang === chip.key;
              return (
                <Chip
                  key={chip.key}
                  label={chip.label}
                  onClick={() => setSelectedLang(active ? null : chip.key)}
                  sx={{
                    bgcolor: active ? "#1DB954" : "rgba(255,255,255,0.15)",
                    color: active ? "#000" : "#fff",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    borderRadius: "20px",
                    border: "none",
                    height: 32,
                    "&:hover": {
                      bgcolor: active ? "#1ED760" : "rgba(255,255,255,0.25)",
                    },
                    flexShrink: 0,
                  }}
                />
              );
            })}
          </Box>
        </Box>

        {/* ---- Content below gradient ---- */}
        <Box sx={{ px: 2, pb: 2 }}>

          {/* Featured Music Grid (2 columns) */}
          {!songsLoading && trendingSongs.length > 0 && (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 1,
                mt: 2,
              }}
            >
              {trendingSongs.slice(0, 6).map((song) => (
                <Box
                  key={song.id}
                  onClick={() => {
                    dispatch(setQueue([song as SongWithArtist]));
                    navigate(`/artist/${song.artist}`);
                  }}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    bgcolor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.04)",
                    borderRadius: "6px",
                    overflow: "hidden",
                    cursor: "pointer",
                    transition: "background 0.2s",
                    "&:hover": {
                      bgcolor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
                    },
                  }}
                >
                  <Avatar
                    variant="square"
                    src={song.cover_image_url || SONG_PLACEHOLDER}
                    alt={song.title}
                    sx={{ width: 56, height: 56, borderRadius: 0, flexShrink: 0 }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0, pr: 1 }}>
                    <Typography
                      variant="body2"
                      noWrap
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        color: "text.primary",
                      }}
                    >
                      {song.title}
                    </Typography>
                    <Typography
                      variant="caption"
                      noWrap
                      sx={{
                        color: "text.secondary",
                        fontSize: "0.65rem",
                      }}
                    >
                      {(song as SongWithArtist).artist_name ?? "Artist"}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          {songsLoading && (
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mt: 2 }}>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} variant="rounded" height={56} sx={{ borderRadius: "6px" }} />
              ))}
            </Box>
          )}

          {/* Trending Now Section */}
          <SectionTitle mt={3}>{t("home.trendingNow")}</SectionTitle>
          {songsLoading ? (
            <Box>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} variant="rounded" height={64} sx={{ mb: 1, borderRadius: 2 }} />
              ))}
            </Box>
          ) : (
            <Box
              sx={{
                borderRadius: 2,
                overflow: "hidden",
                bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
              }}
            >
              <List disablePadding>
                {trendingSongs.slice(0, 6).map((song, index) => (
                  <SongListItem
                    key={song.id}
                    song={song}
                    index={index}
                    queue={trendingSongs}
                  />
                ))}
              </List>
            </Box>
          )}

          {/* ---- Ad Banner ---- */}
          <Box sx={{ mt: 3 }}>
            <AdBanner variant={0} />
          </Box>

          {/* Popular Albums */}
          <SectionTitle>{t("home.popularAlbums")}</SectionTitle>
          {albumsLoading ? (
            <Box sx={{ display: "flex", gap: 1.5 }}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rounded" width={130} height={170} sx={{ borderRadius: 2, flexShrink: 0 }} />
              ))}
            </Box>
          ) : (
            <Box
              sx={{
                display: "flex",
                gap: 1.5,
                overflowX: "auto",
                pb: 1,
                "&::-webkit-scrollbar": { height: 0 },
                scrollbarWidth: "none",
              }}
            >
              {newReleases.map((album) => (
                <Box
                  key={album.id}
                  onClick={() => navigate(`/album/${album.id}`)}
                  sx={{ flex: "0 0 auto", width: 130, cursor: "pointer" }}
                >
                  <Avatar
                    variant="rounded"
                    src={album.cover_image_url || ALBUM_PLACEHOLDER}
                    alt={album.title}
                    sx={{ width: 130, height: 130, borderRadius: 2, mb: 0.75 }}
                  />
                  <Typography
                    variant="body2"
                    noWrap
                    sx={{ fontWeight: 700, fontSize: "0.78rem", color: "text.primary" }}
                  >
                    {album.title}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {/* Top Playlists */}
          <SectionTitle>{t("home.topPlaylists")}</SectionTitle>
          {playlistsLoading ? (
            <Box sx={{ display: "flex", gap: 1.5 }}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rounded" width={130} height={170} sx={{ borderRadius: 2, flexShrink: 0 }} />
              ))}
            </Box>
          ) : (
            <Box
              sx={{
                display: "flex",
                gap: 1.5,
                overflowX: "auto",
                pb: 1,
                "&::-webkit-scrollbar": { height: 0 },
                scrollbarWidth: "none",
              }}
            >
              {playlists.map((playlist) => (
                <Box
                  key={playlist.id}
                  onClick={() => navigate(`/playlist/${playlist.id}`)}
                  sx={{ flex: "0 0 auto", width: 130, cursor: "pointer" }}
                >
                  <Avatar
                    variant="rounded"
                    src={playlist.cover_image_url || PLAYLIST_PLACEHOLDER}
                    alt={playlist.title}
                    sx={{
                      width: 130,
                      height: 130,
                      borderRadius: 2,
                      mb: 0.75,
                      bgcolor: "#1DB954",
                    }}
                  />
                  <Typography
                    variant="body2"
                    noWrap
                    sx={{ fontWeight: 700, fontSize: "0.78rem", color: "text.primary" }}
                  >
                    {playlist.title}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {/* Popular Artists */}
          <SectionTitle>{t("home.popularArtists")}</SectionTitle>
          {artistsLoading ? (
            <Box sx={{ display: "flex", gap: 2 }}>
              {[1, 2, 3].map((i) => (
                <Box key={i} sx={{ textAlign: "center", flexShrink: 0 }}>
                  <Skeleton variant="circular" width={80} height={80} />
                  <Skeleton variant="text" width={60} sx={{ mx: "auto", mt: 1 }} />
                </Box>
              ))}
            </Box>
          ) : (
            <Box
              sx={{
                display: "flex",
                gap: 2,
                overflowX: "auto",
                pb: 1,
                "&::-webkit-scrollbar": { height: 0 },
                scrollbarWidth: "none",
              }}
            >
              {artists.map((artist) => (
                <Box
                  key={artist.id}
                  onClick={() => navigate(`/artist/${artist.id}`)}
                  sx={{
                    textAlign: "center",
                    cursor: "pointer",
                    flexShrink: 0,
                    width: 90,
                  }}
                >
                  <Avatar
                    src={artist.profile_image_url ?? undefined}
                    alt={artist.stage_name}
                    sx={{
                      width: 80,
                      height: 80,
                      mx: "auto",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                      fontSize: 28,
                      bgcolor: "#12A64A",
                    }}
                  />
                  <Box sx={{ mt: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 0.3 }}>
                    <Typography variant="caption" fontWeight={700} noWrap sx={{ maxWidth: 80, fontSize: "0.7rem" }}>
                      {artist.stage_name}
                    </Typography>
                    {artist.verified && (
                      <VerifiedIcon sx={{ fontSize: 10, color: "#5B9BD5" }} />
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          {/* ---- Ad Banner 2 ---- */}
          <Box sx={{ mt: 3 }}>
            <AdBanner variant={1} />
          </Box>
        </Box>
      </Box>
    );
  }

  /* ================================================================ */
  /*  DESKTOP LAYOUT (existing design)                                 */
  /* ================================================================ */
  return (
    <Box>
      {/* Hero Banner — Ethiopian-inspired gradient */}
      <Box
        sx={{
          p: { xs: 3, sm: 5 },
          mb: 3,
          borderRadius: 2,
          background: isDark
            ? "linear-gradient(135deg, #1a4a2e 0%, #121212 40%, #2a1a2e 70%, #121212 100%)"
            : "linear-gradient(135deg, #e8f5e9 0%, #ffffff 40%, #f3e5f5 70%, #ffffff 100%)",
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background:
              "linear-gradient(90deg, #078930 0%, #078930 33%, #FCDD09 33%, #FCDD09 66%, #DA121A 66%, #DA121A 100%)",
          },
        }}
      >
        <Typography
          variant="h2"
          sx={{
            fontWeight: 900,
            color: "text.primary",
            fontSize: { xs: "1.75rem", sm: "2.5rem", md: "3rem" },
            letterSpacing: "-0.03em",
            mb: 1,
          }}
        >
          {greeting}, {user?.first_name ?? t("roles.listener")}
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: "text.secondary",
            maxWidth: 520,
            mb: 3,
            fontSize: { xs: "0.875rem", sm: "1rem" },
            lineHeight: 1.6,
          }}
        >
          {t("home.heroSubtitle")}
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<PlayArrowIcon />}
          onClick={handlePlayAll}
          disabled={trendingSongs.length === 0}
          sx={{
            bgcolor: "#1DB954",
            color: "#000",
            borderRadius: 500,
            px: 4,
            py: 1.2,
            fontWeight: 800,
            fontSize: "0.9375rem",
            "&:hover": {
              bgcolor: "#1ED760",
              transform: "scale(1.04)",
            },
            transition: "all 0.15s ease",
          }}
        >
          {t("home.playTrending")}
        </Button>
      </Box>

      {/* Trending Songs (card row) */}
      <SectionTitle mt={1}>{t("home.trendingSongs")}</SectionTitle>
      {songsLoading ? (
        <SkeletonRow />
      ) : (
        <ScrollRow>
          {trendingSongs.map((song) => (
            <Box key={song.id} sx={{ flex: "0 0 auto" }}>
              <SongCard song={song} queue={trendingSongs} />
            </Box>
          ))}
        </ScrollRow>
      )}

      {/* ---- Ad Banner (between sections, free users only) ---- */}
      <Box sx={{ mt: 3 }}>
        <AdBanner variant={0} />
      </Box>

      {/* Popular Artists */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 4, mb: 2.5 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 800,
            color: "text.primary",
            fontSize: { xs: "1.25rem", sm: "1.5rem" },
            letterSpacing: "-0.02em",
          }}
        >
          {t("home.popularArtists")}
        </Typography>
        <Button
          variant="text"
          size="small"
          onClick={() => navigate('/artists')}
          sx={{
            fontWeight: 700,
            textTransform: 'none',
            color: 'text.secondary',
            fontSize: '0.82rem',
            '&:hover': { color: '#12A64A' },
          }}
        >
          {t("common.seeAll")} →
        </Button>
      </Box>
      {artistsLoading ? (
        <Box sx={{ display: "flex", gap: 3 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Box key={i} sx={{ textAlign: "center", flexShrink: 0 }}>
              <Skeleton variant="circular" width={120} height={120} />
              <Skeleton variant="text" width={80} sx={{ mx: "auto", mt: 1 }} />
            </Box>
          ))}
        </Box>
      ) : (
        <ScrollRow>
          {artists.map((artist) => (
            <Box
              key={artist.id}
              onClick={() => navigate(`/artist/${artist.id}`)}
              sx={{
                textAlign: "center",
                cursor: "pointer",
                flexShrink: 0,
                width: { xs: 110, sm: 140 },
                transition: "all 0.2s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  "& .artist-avatar": {
                    boxShadow: isDark
                      ? "0 12px 40px rgba(18,166,74,0.25)"
                      : "0 12px 32px rgba(0,0,0,0.15)",
                  },
                },
              }}
            >
              <Avatar
                className="artist-avatar"
                src={artist.profile_image_url ?? undefined}
                alt={artist.stage_name}
                sx={{
                  width: { xs: 88, sm: 120 },
                  height: { xs: 88, sm: 120 },
                  mx: "auto",
                  boxShadow: isDark
                    ? "0 8px 24px rgba(0,0,0,0.5)"
                    : "0 8px 24px rgba(0,0,0,0.12)",
                  transition: "box-shadow 0.25s ease",
                  fontSize: { xs: 36, sm: 48 },
                  bgcolor: "#12A64A",
                }}
              />
              <Box sx={{ mt: 1.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
                <Typography
                  variant="body2"
                  fontWeight={700}
                  noWrap
                  sx={{ maxWidth: 120 }}
                >
                  {artist.stage_name}
                </Typography>
                {artist.verified && (
                  <VerifiedIcon sx={{ fontSize: 14, color: "#5B9BD5" }} />
                )}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
                {formatStreamCount(artist.total_streams)} {t("home.streams")}
              </Typography>
            </Box>
          ))}
        </ScrollRow>
      )}

      {/* New Releases (album cards) */}
      <SectionTitle>{t("home.newReleases")}</SectionTitle>
      {albumsLoading ? (
        <SkeletonRow />
      ) : (
        <ScrollRow>
          {newReleases.map((album) => (
            <Box key={album.id} sx={{ flex: "0 0 auto" }}>
              <AlbumCard album={album} />
            </Box>
          ))}
        </ScrollRow>
      )}

      {/* ---- Ad Banner (second placement, free users only) ---- */}
      <Box sx={{ mt: 3 }}>
        <AdBanner variant={1} />
      </Box>

      {/* Featured Playlists */}
      <SectionTitle>{t("home.featuredPlaylists")}</SectionTitle>
      {playlistsLoading ? (
        <SkeletonRow />
      ) : (
        <ScrollRow>
          {playlists.map((playlist) => (
            <Box key={playlist.id} sx={{ flex: "0 0 auto" }}>
              <PlaylistCard playlist={playlist} />
            </Box>
          ))}
        </ScrollRow>
      )}

      {/* Top Tracks List */}
      <SectionTitle>{t("home.topTracks")}</SectionTitle>
      {songsLoading ? (
        <Box>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="rounded" height={56} sx={{ mb: 1, borderRadius: 2 }} />
          ))}
        </Box>
      ) : (
        <Box
          sx={{
            borderRadius: 2,
            overflow: "hidden",
            bgcolor: isDark
              ? "rgba(255,255,255,0.03)"
              : "rgba(0,0,0,0.02)",
          }}
        >
          <List disablePadding>
            {trendingSongs.slice(0, 8).map((song, index) => (
              <SongListItem
                key={song.id}
                song={song}
                index={index}
                queue={trendingSongs}
              />
            ))}
          </List>
        </Box>
      )}
    </Box>
  );
};

export default ListenerHomePage;
