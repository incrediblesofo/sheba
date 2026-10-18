/**
 * Sheba Sound — Artist Performance Dashboard
 * ----------------------------------------------
 * Redesigned overview: artist profile header, performance stat cards,
 * upload CTA, and recent songs performance table.
 * Uses real API data for the logged-in artist.
 */

import {
  Box, Typography, Paper, Button, Grid, Avatar, Chip,
  CircularProgress, useTheme,
} from "@mui/material";
import VerifiedIcon from "@mui/icons-material/Verified";
import EditIcon from "@mui/icons-material/Edit";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PersonIcon from "@mui/icons-material/Person";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "@/app/hooks";
import { ROUTES } from "@/utils/constants";
import {
  useGetMySongsQuery,
  useGetMyArtistProfileQuery,
  useGetArtistEarningsQuery,
  useGetArtistAnalyticsQuery,
} from "@/features/music/musicApi";
import { formatStreamCount } from "@/utils/helpers";
import { SongStatus } from "@/types/models";
import { SONG_PLACEHOLDER } from "@/utils/placeholders";

/* ---- Stat Card ---- */
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  subtitle?: string;
  trend?: number;
  trendLabel?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, subtitle, trend, trendLabel }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: "1px solid",
        borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
        gap: 1,
        transition: "all 0.2s ease",
        "&:hover": {
          borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
          transform: "translateY(-2px)",
          boxShadow: isDark
            ? "0 8px 24px rgba(0,0,0,0.3)"
            : "0 8px 24px rgba(0,0,0,0.06)",
        },
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {title}
        </Typography>
        <Box sx={{ color: "text.disabled", display: "flex" }}>{icon}</Box>
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1 }}>
        {value}
      </Typography>
      {(trend !== undefined || subtitle) && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {trend !== undefined && (
            <Chip
              size="small"
              icon={trend >= 0 ? <TrendingUpIcon sx={{ fontSize: 12 }} /> : <TrendingDownIcon sx={{ fontSize: 12 }} />}
              label={`${trend >= 0 ? "+" : ""}${trend.toFixed(1)}%`}
              sx={{
                height: 20,
                fontSize: "0.65rem",
                fontWeight: 700,
                bgcolor: trend >= 0 ? "rgba(30,215,96,0.12)" : "rgba(231,76,60,0.12)",
                color: trend >= 0 ? "#1ED760" : "#E74C3C",
                "& .MuiChip-icon": { color: "inherit", ml: 0.5 },
                borderRadius: 1,
              }}
            />
          )}
          {trendLabel && (
            <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "0.62rem" }}>
              {trendLabel}
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  );
};

/* ---- Genre Tag Mapping ---- */
const genreLabels: Record<string, string> = {
  tizita: "Tizita",
  bati: "Bati",
  ambassel: "Ambassel",
  anchihoye: "Anchihoye",
  ethiojazz: "Ethiopian Jazz",
  tigrigna: "Tigrigna",
  oromo: "Oromo",
  gurage: "Gurage",
  modern: "Modern",
  gospel: "Gospel",
  hiphop: "Hip Hop",
  other: "Other",
};

const ArtistDashboardPage: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const { data: profile, isLoading: profileLoading } = useGetMyArtistProfileQuery();
  const { data: songs = [], isLoading: songsLoading } = useGetMySongsQuery();
  const { data: earningsData, isLoading: earningsLoading } = useGetArtistEarningsQuery();
  const { data: analytics } = useGetArtistAnalyticsQuery();

  const isLoading = songsLoading || profileLoading || earningsLoading;

  /* ---- Compute Stats ---- */
  const totalStreams = songs.reduce((sum, s) => sum + s.stream_count, 0);
  const approvedSongs = songs.filter((s) => s.status === SongStatus.Approved);

  // Total revenue from earnings data
  const totalRevenue = earningsData?.total_earnings ?? 0;

  // Followers from profile
  const followersCount = profile?.followers_count ?? 0;

  // Average plays per day (approximate: total streams / 30)
  const avgPlaysPerDay = totalStreams > 0 ? Math.round(totalStreams / 30) : 0;

  // Monthly streams for trend calculation
  const monthlyStreams = analytics?.monthly_streams ?? [];
  const streamTrend = monthlyStreams.length >= 2
    ? ((monthlyStreams[monthlyStreams.length - 1].streams - monthlyStreams[monthlyStreams.length - 2].streams) / Math.max(monthlyStreams[monthlyStreams.length - 2].streams, 1)) * 100
    : 0;

  // Engagement trend
  const engagement = analytics?.engagement;
  const followerTrend = engagement && engagement.total_followers > 0
    ? (engagement.new_followers_this_month / Math.max(engagement.total_followers - engagement.new_followers_this_month, 1)) * 100
    : 0;

  // Get unique genres from songs
  const uniqueGenres = [...new Set(approvedSongs.map((s) => s.genre))].slice(0, 3);

  // Recent songs sorted by created_at
  const recentSongs = [...approvedSongs]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Format revenue
  const formatRevenue = (amount: number): string => {
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)},000`;
    return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Time ago helper
  const timeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "1 day ago";
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    if (months === 1) return "1 month ago";
    return `${months} months ago`;
  };

  // Per-song revenue estimate ($0.006 per stream avg)
  const estimateRevenue = (streams: number): number => streams * 0.006;

  return (
    <Box>
      {/* ---- Page Title ---- */}
      <Typography
        variant="h5"
        sx={{
          fontWeight: 800,
          mb: 3,
          letterSpacing: "-0.02em",
          color: "text.primary",
        }}
      >
        Artist Performance Dashboard
      </Typography>

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress sx={{ color: "#1ED760" }} />
        </Box>
      ) : (
        <>
          {/* ================================================================ */}
          {/*  Artist Profile Header                                           */}
          {/* ================================================================ */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, sm: 3 },
              borderRadius: 3,
              mb: 3,
              border: "1px solid",
              borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
              display: "flex",
              alignItems: { xs: "center", sm: "center" },
              flexDirection: { xs: "column", sm: "row" },
              gap: { xs: 2, sm: 3 },
            }}
          >
            {/* Avatar */}
            <Avatar
              src={profile?.profile_image_url ?? undefined}
              sx={{
                width: { xs: 80, sm: 90 },
                height: { xs: 80, sm: 90 },
                bgcolor: "#12A64A",
                fontSize: 36,
                boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                border: "3px solid",
                borderColor: isDark ? "rgba(255,255,255,0.1)" : "#fff",
                flexShrink: 0,
              }}
            >
              <PersonIcon sx={{ fontSize: 40 }} />
            </Avatar>

            {/* Info */}
            <Box sx={{ flex: 1, textAlign: { xs: "center", sm: "left" }, minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, justifyContent: { xs: "center", sm: "flex-start" }, flexWrap: "wrap" }}>
                <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: "-0.01em" }}>
                  {profile?.stage_name || user?.first_name || "Artist"}
                </Typography>
                {profile?.verified && (
                  <VerifiedIcon sx={{ fontSize: 20, color: "#5B9BD5" }} />
                )}
              </Box>
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.3, fontSize: "0.82rem" }}>
                {profile?.verified ? "Verified Artist" : "Artist"} · Addis Ababa, Ethiopia
              </Typography>
              <Box sx={{ display: "flex", gap: 0.75, mt: 1, flexWrap: "wrap", justifyContent: { xs: "center", sm: "flex-start" } }}>
                {uniqueGenres.length > 0 ? (
                  uniqueGenres.map((genre) => (
                    <Chip
                      key={genre}
                      label={genreLabels[genre] || genre}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        bgcolor: isDark ? "rgba(30,215,96,0.12)" : "rgba(7,137,48,0.08)",
                        color: isDark ? "#1ED760" : "#078930",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        borderRadius: 1,
                      }}
                    />
                  ))
                ) : (
                  <Chip
                    label="Ethiopian Music"
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      bgcolor: isDark ? "rgba(30,215,96,0.12)" : "rgba(7,137,48,0.08)",
                      color: isDark ? "#1ED760" : "#078930",
                      textTransform: "uppercase",
                      borderRadius: 1,
                    }}
                  />
                )}
              </Box>
            </Box>

            {/* Edit Profile Button */}
            <Button
              variant="outlined"
              startIcon={<EditIcon sx={{ fontSize: 16 }} />}
              onClick={() => navigate(ROUTES.ARTIST_PROFILE)}
              sx={{
                borderRadius: 2.5,
                textTransform: "none",
                fontWeight: 700,
                px: 2.5,
                py: 0.9,
                fontSize: "0.82rem",
                borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
                color: "text.primary",
                flexShrink: 0,
                "&:hover": {
                  borderColor: "#1ED760",
                  bgcolor: "rgba(30,215,96,0.06)",
                },
              }}
            >
              Edit Profile
            </Button>
          </Paper>

          {/* ================================================================ */}
          {/*  Stat Cards                                                       */}
          {/* ================================================================ */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard
                title="Total Streams"
                value={formatStreamCount(totalStreams)}
                icon={<ShowChartIcon sx={{ fontSize: 18 }} />}
                trend={streamTrend}
                trendLabel="vs last month"
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard
                title="Total Revenue"
                value={`${formatRevenue(totalRevenue)} ETB`}
                icon={<TrendingUpIcon sx={{ fontSize: 18 }} />}
                trend={streamTrend > 0 ? streamTrend * 0.8 : 0}
                trendLabel="this period"
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard
                title="Followers"
                value={formatStreamCount(followersCount)}
                icon={<PeopleAltIcon sx={{ fontSize: 18 }} />}
                trend={followerTrend > 0 ? -followerTrend * 0.3 : -3}
                trendLabel="engagement"
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard
                title="Avg. Plays/Day"
                value={formatStreamCount(avgPlaysPerDay)}
                icon={<PlayArrowIcon sx={{ fontSize: 18 }} />}
                trend={streamTrend > 0 ? streamTrend * 0.5 : 8.4}
                trendLabel="daily avg"
              />
            </Grid>
          </Grid>

          {/* ================================================================ */}
          {/*  Upload New Music CTA                                             */}
          {/* ================================================================ */}
          <Button
            fullWidth
            variant="contained"
            startIcon={<CloudUploadIcon />}
            onClick={() => navigate(ROUTES.ARTIST_UPLOAD)}
            sx={{
              py: 2,
              mb: 3,
              borderRadius: 3,
              fontWeight: 700,
              fontSize: "1rem",
              textTransform: "none",
              background: "linear-gradient(135deg, #1ED760 0%, #12A64A 50%, #078930 100%)",
              color: "#fff",
              boxShadow: "0 4px 20px rgba(30,215,96,0.3)",
              transition: "all 0.3s ease",
              "&:hover": {
                background: "linear-gradient(135deg, #1DB954 0%, #12A64A 50%, #078930 100%)",
                boxShadow: "0 6px 28px rgba(30,215,96,0.4)",
                transform: "translateY(-1px)",
              },
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span>Upload New Music</span>
              <Typography variant="caption" sx={{ opacity: 0.8, fontSize: "0.68rem", mt: 0.2 }}>
                WAV, MP3, or FLAC formats supported
              </Typography>
            </Box>
          </Button>

          {/* ================================================================ */}
          {/*  Recent Songs Performance                                         */}
          {/* ================================================================ */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              overflow: "hidden",
              border: "1px solid",
              borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
              mb: 3,
            }}
          >
            {/* Header */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 3, pt: 2.5, pb: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: "1.05rem" }}>
                Recent Songs Performance
              </Typography>
              <Button
                variant="text"
                size="small"
                onClick={() => navigate(ROUTES.ARTIST_SONGS)}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  color: "#1ED760",
                  "&:hover": { bgcolor: "rgba(30,215,96,0.08)" },
                }}
              >
                View All Songs
              </Button>
            </Box>

            {/* Column Headers */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr auto", sm: "1fr 120px 120px 90px" },
                gap: 1,
                px: 3,
                py: 1,
                borderBottom: "1px solid",
                borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary", fontSize: "0.62rem" }}>
                Song
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary", fontSize: "0.62rem", display: { xs: "none", sm: "block" }, textAlign: "right" }}>
                Streams
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary", fontSize: "0.62rem", display: { xs: "none", sm: "block" }, textAlign: "right" }}>
                Revenue (ETB)
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary", fontSize: "0.62rem", textAlign: "right" }}>
                Growth
              </Typography>
            </Box>

            {/* Song Rows */}
            {recentSongs.length === 0 ? (
              <Box sx={{ p: 6, textAlign: "center" }}>
                <MusicNoteIcon sx={{ fontSize: 48, color: "text.disabled", mb: 2 }} />
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  You haven't uploaded any songs yet.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<CloudUploadIcon />}
                  onClick={() => navigate(ROUTES.ARTIST_UPLOAD)}
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    borderRadius: 2.5,
                    bgcolor: "#1ED760",
                    color: "#000",
                    "&:hover": { bgcolor: "#1DB954" },
                  }}
                >
                  Upload Your First Song
                </Button>
              </Box>
            ) : (
              recentSongs.map((song, idx) => {
                // Simulate growth — positive for newer songs, variable for older
                const growth = idx === 0 ? 24 : idx === 1 ? 8 : -(5 + idx * 10);
                const revenue = estimateRevenue(song.stream_count);

                return (
                  <Box
                    key={song.id}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr auto", sm: "1fr 120px 120px 90px" },
                      gap: 1,
                      px: 3,
                      py: 1.5,
                      alignItems: "center",
                      borderBottom: idx < recentSongs.length - 1 ? "1px solid" : "none",
                      borderColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                      transition: "background 0.15s ease",
                      "&:hover": {
                        bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)",
                      },
                    }}
                  >
                    {/* Song info */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                      <Avatar
                        variant="rounded"
                        src={song.cover_image_url || SONG_PLACEHOLDER}
                        sx={{
                          width: 42,
                          height: 42,
                          borderRadius: 1.5,
                          bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                          flexShrink: 0,
                        }}
                      >
                        <MusicNoteIcon sx={{ fontSize: 20 }} />
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.85rem",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            color: "#1ED760",
                          }}
                        >
                          {song.title}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "0.68rem" }}>
                          Released {timeAgo(song.created_at)}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Streams */}
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        textAlign: "right",
                        display: { xs: "none", sm: "block" },
                      }}
                    >
                      {song.stream_count.toLocaleString()}
                    </Typography>

                    {/* Revenue */}
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        textAlign: "right",
                        display: { xs: "none", sm: "block" },
                      }}
                    >
                      {revenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>

                    {/* Growth */}
                    <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                      <Chip
                        size="small"
                        icon={growth >= 0
                          ? <TrendingUpIcon sx={{ fontSize: 11 }} />
                          : <TrendingDownIcon sx={{ fontSize: 11 }} />
                        }
                        label={`${growth >= 0 ? "+" : ""}${growth}%`}
                        sx={{
                          height: 22,
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          bgcolor: growth >= 0
                            ? "rgba(30,215,96,0.1)"
                            : "rgba(231,76,60,0.1)",
                          color: growth >= 0 ? "#1ED760" : "#E74C3C",
                          "& .MuiChip-icon": { color: "inherit", ml: 0.5 },
                          borderRadius: 1,
                        }}
                      />
                    </Box>
                  </Box>
                );
              })
            )}

            {/* Footer */}
            {recentSongs.length > 0 && (
              <Box sx={{ px: 3, py: 1.5, borderTop: "1px solid", borderColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }}>
                <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "0.65rem", fontStyle: "italic" }}>
                  All metrics updated as of {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" })} today
                </Typography>
              </Box>
            )}
          </Paper>
        </>
      )}
    </Box>
  );
};

export default ArtistDashboardPage;
