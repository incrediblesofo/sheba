/**
 * Sheba Sound — Artist Analytics Page
 * --------------------------------------
 * Comprehensive analytics: summary stats (streams, listeners, revenue estimate),
 * monthly bar chart, fan engagement, geographic listener breakdown, and top songs.
 * Uses real API data from the backend.
 */

import {
  Box,
  Typography,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  LinearProgress,
  Chip,
  CircularProgress,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PeopleIcon from '@mui/icons-material/People';
import FavoriteIcon from '@mui/icons-material/Favorite';
import CommentIcon from '@mui/icons-material/Comment';
import ShareIcon from '@mui/icons-material/Share';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PublicIcon from '@mui/icons-material/Public';
import { useGetArtistAnalyticsQuery, useGetMySongsQuery, useGetArtistEarningsQuery } from '@/features/music/musicApi';
import { formatDuration, formatStreamCount } from '@/utils/helpers';
import { SONG_PLACEHOLDER } from "@/utils/placeholders";

/* ---- Reusable Stat Card ---- */
interface StatCardProps { title: string; value: string | number; icon: React.ReactNode; color: string; sub?: string; }
const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, sub }) => (
  <Paper sx={{ p: 3, borderRadius: 3 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
      <Box sx={{ bgcolor: `${color}20`, color, borderRadius: 1.5, p: 0.75, display: 'flex' }}>{icon}</Box>
      <Typography variant="body2" color="text.secondary" fontWeight={600}>{title}</Typography>
    </Box>
    <Typography variant="h4" fontWeight={800} color={color}>{value}</Typography>
    {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
  </Paper>
);

const ArtistAnalyticsPage: React.FC = () => {
  const { data: analytics, isLoading: analyticsLoading } = useGetArtistAnalyticsQuery();
  const { data: songs = [], isLoading: songsLoading } = useGetMySongsQuery();
  const { data: earningsData } = useGetArtistEarningsQuery();

  const isLoading = analyticsLoading || songsLoading;

  if (isLoading || !analytics) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress />
      </Box>
    );
  }

  const totalStreams = analytics.total_streams;
  const monthlyData = analytics.monthly_streams;
  const engagement = analytics.engagement;
  const geoData = analytics.geo_listeners;
  const unpaidEarnings = earningsData?.unpaid_earnings ?? 0;
  const monthlyListeners = analytics.monthly_listeners;

  const topSongs = [...songs].sort((a, b) => b.stream_count - a.stream_count).slice(0, 5);
  const maxMonthly = Math.max(...monthlyData.map((d) => d.streams), 1);
  const topSongMaxStreams = topSongs[0]?.stream_count ?? 1;
  const geoMax = Math.max(...geoData.map((g) => g.listeners), 1);

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>Analytics</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Track your streaming performance, audience, and earnings.
      </Typography>

      {/* ---- Summary Stats ---- */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Streams"
            value={formatStreamCount(totalStreams)}
            icon={<TrendingUpIcon />}
            color="#F39C12"
            sub="All time"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Monthly Listeners"
            value={formatStreamCount(monthlyListeners)}
            icon={<PeopleIcon />}
            color="#5B9BD5"
            sub="This month"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Published Songs"
            value={songs.length}
            icon={<MusicNoteIcon />}
            color="#2ECC71"
            sub={`${formatStreamCount(Math.round(totalStreams / Math.max(songs.length, 1)))} avg. per song`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Pending Payout"
            value={`$${unpaidEarnings.toFixed(2)}`}
            icon={<AttachMoneyIcon />}
            color="#27AE60"
            sub="Estimated revenue"
          />
        </Grid>
      </Grid>

      {/* ---- Monthly Streams Bar Chart ---- */}
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Monthly Streams</Typography>
      <Paper sx={{ p: 3, borderRadius: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 200, overflowX: 'auto' }}>
          {monthlyData.map((d) => {
            const heightPercent = (d.streams / maxMonthly) * 100;
            return (
              <Box key={d.month} sx={{ flex: '1 0 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                  {formatStreamCount(d.streams)}
                </Typography>
                <Box
                  sx={{
                    width: '100%', maxWidth: 36, height: `${heightPercent}%`, minHeight: 8,
                    bgcolor: 'primary.main', borderRadius: '6px 6px 0 0',
                    transition: 'height 0.3s ease',
                    '&:hover': { bgcolor: 'primary.dark' },
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{d.month}</Typography>
              </Box>
            );
          })}
        </Box>
      </Paper>

      {/* ---- Fan Engagement ---- */}
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Fan Engagement</Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          { label: 'Total Likes', value: engagement.total_likes.toLocaleString(), icon: <FavoriteIcon />, color: '#E74C3C' },
          { label: 'Total Comments', value: engagement.total_comments.toLocaleString(), icon: <CommentIcon />, color: '#5B9BD5' },
          { label: 'Total Shares', value: engagement.total_shares.toLocaleString(), icon: <ShareIcon />, color: '#9B59B6' },
          { label: 'New Followers', value: `+${engagement.new_followers_this_month.toLocaleString()}`, icon: <PeopleIcon />, color: '#2ECC71' },
        ].map(({ label, value, icon, color }) => (
          <Grid key={label} size={{ xs: 6, md: 3 }}>
            <Paper sx={{ p: 2.5, borderRadius: 3, textAlign: 'center' }}>
              <Box sx={{ color, mb: 0.5 }}>{icon}</Box>
              <Typography variant="h5" fontWeight={700}>{value}</Typography>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
      <Paper sx={{ p: 2, borderRadius: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PeopleIcon sx={{ color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            Total followers: <strong>{engagement.total_followers.toLocaleString()}</strong>
            {' '}· gained{' '}
            <Chip label={`+${engagement.new_followers_this_month.toLocaleString()} this month`} size="small" color="success" sx={{ fontWeight: 700 }} />
          </Typography>
        </Box>
      </Paper>

      {/* ---- Geographic Listeners ---- */}
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PublicIcon />
          Geographic Listener Breakdown
        </Box>
      </Typography>
      <Paper sx={{ borderRadius: 3, overflow: 'hidden', mb: 4 }}>
        <List disablePadding>
          {geoData.map((g, idx) => (
            <ListItem key={g.country} divider={idx < geoData.length - 1}>
              <Typography variant="h6" sx={{ width: 28, mr: 1, fontSize: '1.2rem' }}>{g.flag}</Typography>
              <ListItemText
                primary={g.country}
                primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                sx={{ flex: '0 0 140px', mr: 2 }}
              />
              <Box sx={{ flex: 1, mr: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={(g.listeners / geoMax) * 100}
                  sx={{ height: 8, borderRadius: 4, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 4 } }}
                />
              </Box>
              <Typography variant="body2" fontWeight={600} sx={{ minWidth: 80, textAlign: 'right' }}>
                {g.listeners.toLocaleString()}
              </Typography>
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* ---- Top Songs ---- */}
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Top Songs</Typography>
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {topSongs.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">Upload songs to see your top tracks here.</Typography>
          </Box>
        ) : (
          <List disablePadding>
            {topSongs.map((song, index) => (
              <ListItem key={song.id} divider>
                <Typography
                  variant="h6" fontWeight={700} color="text.secondary"
                  sx={{ width: 32, textAlign: 'center', mr: 1 }}
                >
                  {index + 1}
                </Typography>
                <ListItemAvatar sx={{ minWidth: 56 }}>
                  <Avatar variant="rounded" src={song.cover_image_url || SONG_PLACEHOLDER} sx={{ width: 44, height: 44, borderRadius: 1.5 }} />
                </ListItemAvatar>
                <ListItemText
                  primary={<Typography variant="body2" fontWeight={600}>{song.title}</Typography>}
                  secondary={`${formatDuration(song.duration)} · ${song.genre}`}
                  sx={{ flex: '0 0 auto', minWidth: 150, mr: 2 }}
                />
                <Box sx={{ flex: 1, display: { xs: 'none', sm: 'block' }, mr: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={(song.stream_count / topSongMaxStreams) * 100}
                    sx={{ height: 8, borderRadius: 4, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 4 } }}
                  />
                </Box>
                <Typography variant="body2" fontWeight={500} sx={{ minWidth: 70, textAlign: 'right' }}>
                  {formatStreamCount(song.stream_count)}
                </Typography>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default ArtistAnalyticsPage;
