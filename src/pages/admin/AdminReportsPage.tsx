/**
 * Sheba Sound — Admin Reports Page (Real Analytics)
 * ---------------------------------------------------
 * Platform analytics with REAL data: user growth chart, stream trends,
 * genre distribution, listener demographics, geographic distribution,
 * top artists & top songs leaderboards.
 * Uses real API data from the admin dashboard backend.
 */

import React from 'react';
import {
  Box, Typography, Paper, Grid, Avatar,
  Stack, Divider, CircularProgress,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import BarChartIcon from '@mui/icons-material/BarChart';
import PublicIcon from '@mui/icons-material/Public';
import GroupsIcon from '@mui/icons-material/Groups';
import { useGetAdminReportsQuery } from '@/features/music/musicApi';
import { formatStreamCount } from '@/utils/helpers';

const GENRE_COLORS = ['#12A64A', '#FCDD09', '#DA121A', '#5B9BD5', '#9B59B6', '#1ABC9C', '#F39C12', '#E74C3C'];
const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const DEMO_COLORS = {
  byRole: ['#5B9BD5', '#9B59B6', '#E74C3C'],
  byTier: ['#95A5A6', '#F39C12'],
};

/* ---- Summary Card ---- */
interface SumCardProps { icon: React.ReactNode; color: string; value: string; label: string }
const SumCard: React.FC<SumCardProps> = ({ icon, color, value, label }) => (
  <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider', textAlign: 'center', transition: 'all 0.2s ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 10px 28px rgba(0,0,0,0.15)' }, position: 'relative', overflow: 'hidden' }}>
    <Box sx={{ position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)', width: 80, height: 80, borderRadius: '50%', bgcolor: color, opacity: 0.1, filter: 'blur(20px)', pointerEvents: 'none' }} />
    <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1 }}>
      <Box sx={{ color }}>{icon}</Box>
    </Box>
    <Typography variant="h4" fontWeight={800}>{value}</Typography>
    <Typography variant="caption" color="text.secondary" fontWeight={600}>{label}</Typography>
  </Paper>
);

/* ---- Mini Bar Chart (pure CSS) ---- */
interface MiniBarChartProps {
  data: { label: string; value: number }[];
  color: string;
  height?: number;
}
const MiniBarChart: React.FC<MiniBarChartProps> = ({ data, color, height = 140 }) => {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, height, overflowX: 'auto', pb: 0.5 }}>
      {data.map((d, i) => {
        const pct = (d.value / maxVal) * 100;
        return (
          <Box key={i} sx={{ flex: '1 0 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.3, minWidth: 18 }}>
            <Typography variant="caption" sx={{ fontSize: '0.5rem', color: 'text.secondary', writingMode: 'horizontal-tb' }}>
              {d.value > 0 ? d.value : ''}
            </Typography>
            <Box
              sx={{
                width: '100%', maxWidth: 28, height: `${Math.max(pct, 3)}%`, minHeight: 3,
                bgcolor: color, borderRadius: '4px 4px 0 0', opacity: 0.85,
                transition: 'height 0.4s cubic-bezier(0.25,0.8,0.25,1)',
                '&:hover': { opacity: 1, transform: 'scaleY(1.05)' },
              }}
            />
            <Typography variant="caption" sx={{ fontSize: '0.45rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
              {d.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
};

/* ---- Donut Chart (pure CSS) ---- */
interface DonutSegment { label: string; value: number; color: string }
const DonutChart: React.FC<{ segments: DonutSegment[]; size?: number }> = ({ segments, size = 120 }) => {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let cumDeg = 0;
  const gradientParts = segments.map((seg) => {
    const startDeg = cumDeg;
    const angleDeg = (seg.value / total) * 360;
    cumDeg += angleDeg;
    return `${seg.color} ${startDeg}deg ${cumDeg}deg`;
  });

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
      <Box
        sx={{
          width: size, height: size, borderRadius: '50%',
          background: `conic-gradient(${gradientParts.join(', ')})`,
          position: 'relative', flexShrink: 0,
          '&::after': {
            content: '""', position: 'absolute',
            top: '25%', left: '25%', width: '50%', height: '50%',
            borderRadius: '50%', bgcolor: 'background.paper',
          },
        }}
      />
      <Stack spacing={0.8}>
        {segments.map((seg) => (
          <Box key={seg.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: seg.color, flexShrink: 0 }} />
            <Typography variant="caption" fontWeight={600}>
              {seg.label}: {seg.value.toLocaleString()} ({Math.round((seg.value / total) * 100)}%)
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};

/* ------------------------------------------------------------------ */

const AdminReportsPage: React.FC = () => {
  const { data: reports, isLoading } = useGetAdminReportsQuery();

  if (isLoading || !reports) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress />
      </Box>
    );
  }

  const genreData = Object.entries(reports.genreDistribution)
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count);

  const totalSongsForGenre = genreData.reduce((sum, g) => sum + g.count, 0) || 1;
  const topArtistStreams = reports.topArtists[0]?.total_streams ?? 1;
  const topSongStreams = reports.topSongs[0]?.stream_count ?? 1;
  const maxGeoStreams = reports.geographicDistribution[0]?.streams ?? 1;

  return (
    <Box>
      {/* ---- Header ---- */}
      <Box
        sx={{
          p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(27,188,156,0.15) 0%, rgba(18,166,74,0.08) 100%)',
          border: '1px solid rgba(27,188,156,0.25)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(27,188,156,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChartIcon sx={{ color: '#1ABC9C' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800}>Platform Reports</Typography>
            <Typography variant="caption" color="text.secondary">
              Real-time analytics powered by live stream tracking.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ---- Summary ---- */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 6, sm: 4 }}>
          <SumCard icon={<PeopleIcon />}    color="#5B9BD5" value={String(reports.totalUsers)}             label="Total Users"   />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <SumCard icon={<MusicNoteIcon />} color="#12A64A" value={String(reports.totalSongs)}             label="Total Songs"   />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <SumCard icon={<TrendingUpIcon />} color="#1ABC9C" value={formatStreamCount(reports.totalStreams)} label="Total Streams" />
        </Grid>
      </Grid>

      {/* ---- User Growth & Stream Trends ---- */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <PeopleIcon sx={{ color: '#5B9BD5', fontSize: 20 }} />
              <Typography variant="h6" fontWeight={700}>User Growth</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Monthly registrations (last 12 months)
            </Typography>
            {reports.userGrowth.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No user data yet.</Typography>
            ) : (
              <MiniBarChart
                data={reports.userGrowth.map((d) => ({ label: d.month.split(' ')[0], value: d.count }))}
                color="#5B9BD5"
                height={160}
              />
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <TrendingUpIcon sx={{ color: '#1ABC9C', fontSize: 20 }} />
              <Typography variant="h6" fontWeight={700}>Stream Trends</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Daily streams (last 30 days)
            </Typography>
            {reports.streamTrends.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No stream data yet.</Typography>
            ) : (
              <MiniBarChart
                data={reports.streamTrends.map((d) => ({ label: d.date.split(' ')[1] ?? d.date, value: d.streams }))}
                color="#1ABC9C"
                height={160}
              />
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* ---- Demographics & Geographic Distribution ---- */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <GroupsIcon sx={{ color: '#9B59B6', fontSize: 20 }} />
              <Typography variant="h6" fontWeight={700}>Listener Demographics</Typography>
            </Box>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  By Role
                </Typography>
                <DonutChart
                  segments={reports.listenerDemographics.byRole.map((d, i) => ({
                    label: d.label,
                    value: d.value,
                    color: DEMO_COLORS.byRole[i] ?? '#999',
                  }))}
                  size={100}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  By Subscription
                </Typography>
                <DonutChart
                  segments={reports.listenerDemographics.byTier.map((d, i) => ({
                    label: d.label,
                    value: d.value,
                    color: DEMO_COLORS.byTier[i] ?? '#999',
                  }))}
                  size={100}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <PublicIcon sx={{ color: '#1ABC9C', fontSize: 20 }} />
              <Typography variant="h6" fontWeight={700}>Geographic Distribution</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Top countries by stream count
            </Typography>
            {reports.geographicDistribution.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Geographic data will populate as users stream songs.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {reports.geographicDistribution.map((geo) => {
                  const pct = Math.round((geo.streams / maxGeoStreams) * 100);
                  return (
                    <Box key={geo.code}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                        <Typography variant="caption" fontWeight={700}>
                          {geo.flag} {geo.country}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatStreamCount(geo.streams)} streams
                        </Typography>
                      </Box>
                      <Box sx={{ height: 6, borderRadius: 99, bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        <Box sx={{ width: `${pct}%`, height: '100%', borderRadius: 99, bgcolor: '#1ABC9C', transition: 'width 0.5s cubic-bezier(0.25,0.8,0.25,1)' }} />
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* ---- Genre Distribution ---- */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>Genre Distribution</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2.5 }}>Songs per genre</Typography>
            {genreData.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No song data yet.</Typography>
            ) : (
              <Stack spacing={2}>
                {genreData.map(({ genre, count }, i) => {
                  const pct = Math.round((count / totalSongsForGenre) * 100);
                  const color = GENRE_COLORS[i % GENRE_COLORS.length];
                  return (
                    <Box key={genre}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'capitalize', color }}>
                          {genre}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">{count} · {pct}%</Typography>
                      </Box>
                      <Box sx={{ height: 7, borderRadius: 99, bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        <Box sx={{ width: `${pct}%`, height: '100%', borderRadius: 99, bgcolor: color, transition: 'width 0.5s cubic-bezier(0.25,0.8,0.25,1)' }} />
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Paper>
        </Grid>

        {/* ---- Top Artists ---- */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmojiEventsIcon sx={{ color: '#FFD700', fontSize: 20 }} />
              <Typography variant="h6" fontWeight={700}>Top Artists</Typography>
            </Box>
            <Divider />
            {reports.topArtists.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">No artist data yet.</Typography>
              </Box>
            ) : (
              reports.topArtists.map((item, idx) => (
                <React.Fragment key={item.id}>
                  <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, '&:hover': { bgcolor: 'action.hover' }, transition: 'background-color 0.15s' }}>
                    <Typography variant="h6" fontWeight={800} sx={{ width: 24, color: MEDAL_COLORS[idx] ?? 'text.disabled', textAlign: 'center' }}>
                      {idx + 1}
                    </Typography>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 38, height: 38 }}>
                      {item.stage_name[0]}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={700} noWrap>{item.stage_name}</Typography>
                      <Box sx={{ mt: 0.5, height: 5, borderRadius: 99, bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        <Box sx={{ width: `${(item.total_streams / topArtistStreams) * 100}%`, height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #9B59B6, #6C3483)' }} />
                      </Box>
                    </Box>
                    <Typography variant="caption" fontWeight={700} sx={{ color: '#9B59B6', minWidth: 52, textAlign: 'right' }}>
                      {formatStreamCount(item.total_streams)}
                    </Typography>
                  </Box>
                  {idx < reports.topArtists.length - 1 && <Divider sx={{ mx: 2.5 }} />}
                </React.Fragment>
              ))
            )}
          </Paper>
        </Grid>

        {/* ---- Top Songs ---- */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <MusicNoteIcon sx={{ color: '#1ED760', fontSize: 20 }} />
              <Typography variant="h6" fontWeight={700}>Top Songs</Typography>
            </Box>
            <Divider />
            {reports.topSongs.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">No song data yet.</Typography>
              </Box>
            ) : (
              reports.topSongs.map((song, idx) => (
                <React.Fragment key={song.id}>
                  <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, '&:hover': { bgcolor: 'action.hover' }, transition: 'background-color 0.15s' }}>
                    <Typography variant="h6" fontWeight={800} sx={{ width: 24, color: MEDAL_COLORS[idx] ?? 'text.disabled', textAlign: 'center' }}>
                      {idx + 1}
                    </Typography>
                    <Avatar variant="rounded" sx={{ width: 38, height: 38, borderRadius: 1.5, bgcolor: 'rgba(18,166,74,0.15)' }}>
                      <MusicNoteIcon fontSize="small" />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={700} noWrap>{song.title}</Typography>
                      <Box sx={{ mt: 0.5, height: 5, borderRadius: 99, bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        <Box sx={{ width: `${(song.stream_count / topSongStreams) * 100}%`, height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #12A64A, #1ED760)' }} />
                      </Box>
                    </Box>
                    <Typography variant="caption" fontWeight={700} sx={{ color: '#1ED760', minWidth: 52, textAlign: 'right' }}>
                      {formatStreamCount(song.stream_count)}
                    </Typography>
                  </Box>
                  {idx < reports.topSongs.length - 1 && <Divider sx={{ mx: 2.5 }} />}
                </React.Fragment>
              ))
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminReportsPage;
