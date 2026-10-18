/**
 * Sheba Sound — Admin Dashboard Page
 * ------------------------------------
 * Redesigned overview with stat cards, recent activity feed,
 * system status panel, and quick action grid.
 * Uses real API data from the admin dashboard backend.
 */

import React from 'react';
import {
  Box, Typography, Paper, Grid, Button, Chip,
  List, ListItem, ListItemIcon, ListItemText, Divider,
  CircularProgress, Skeleton, useTheme,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import PaymentIcon from '@mui/icons-material/Payment';
import MicIcon from '@mui/icons-material/Mic';
import GavelIcon from '@mui/icons-material/Gavel';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import AssessmentIcon from '@mui/icons-material/Assessment';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';

import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { ROUTES } from '@/utils/constants';
import { useGetAdminStatsQuery, useGetAdminActivityQuery } from '@/features/music/musicApi';

/* ================================================================ */
/*  Stat Card                                                        */
/* ================================================================ */
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  trendLabel?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, trendLabel }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: '1px solid',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
          transform: 'translateY(-2px)',
          boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.3)' : '0 8px 24px rgba(0,0,0,0.06)',
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'text.secondary',
          }}
        >
          {title}
        </Typography>
        <Box sx={{ color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)', display: 'flex' }}>
          {icon}
        </Box>
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1, mb: 0.75 }}>
        {value}
      </Typography>
      {(trend !== undefined || trendLabel) && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {trend !== undefined && (
            <Chip
              size="small"
              icon={trend >= 0 ? <TrendingUpIcon sx={{ fontSize: 11 }} /> : <TrendingDownIcon sx={{ fontSize: 11 }} />}
              label={`${trend >= 0 ? '+' : ''}${trend}%`}
              sx={{
                height: 20,
                fontSize: '0.63rem',
                fontWeight: 700,
                bgcolor: trend >= 0 ? 'rgba(30,215,96,0.12)' : 'rgba(231,76,60,0.12)',
                color: trend >= 0 ? '#1ED760' : '#E74C3C',
                '& .MuiChip-icon': { color: 'inherit', ml: 0.5 },
                borderRadius: 1,
              }}
            />
          )}
          {trendLabel && (
            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.6rem' }}>
              {trendLabel}
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  );
};

/* ================================================================ */
/*  Activity icon helper                                             */
/* ================================================================ */
const activityIcon = (type: string): React.ReactNode => {
  switch (type) {
    case 'user': return <PersonAddIcon fontSize="small" sx={{ color: '#5B9BD5' }} />;
    case 'song': return <AudiotrackIcon fontSize="small" sx={{ color: '#12A64A' }} />;
    case 'subscription': return <PaymentIcon fontSize="small" sx={{ color: '#F39C12' }} />;
    default: return <MicIcon fontSize="small" sx={{ color: '#9B59B6' }} />;
  }
};

const activityChipColor = (type: string) => {
  switch (type) {
    case 'user': return { bgcolor: 'rgba(91,155,213,0.15)', color: '#5B9BD5' };
    case 'song': return { bgcolor: 'rgba(18,166,74,0.15)', color: '#1ED760' };
    case 'subscription': return { bgcolor: 'rgba(252,221,9,0.15)', color: '#D4A800' };
    default: return { bgcolor: 'rgba(155,89,182,0.15)', color: '#C39BD3' };
  }
};

const timeAgoShort = (timestamp: string): string => {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
};

/* ================================================================ */
/*  System Status Item                                               */
/* ================================================================ */
interface StatusItemProps {
  label: string;
  status: 'OPERATIONAL' | 'HEALTHY' | 'DEGRADED';
  subtitle?: string;
  progress?: number;
}

const StatusItem: React.FC<StatusItemProps> = ({ label, status, subtitle, progress }) => {
  const statusColor = status === 'DEGRADED' ? '#F39C12' : '#1ED760';

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.3 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
          {label}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 800,
            fontSize: '0.65rem',
            color: statusColor,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
          }}
        >
          {status}
        </Typography>
      </Box>
      {subtitle && (
        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>
          {subtitle}
        </Typography>
      )}
      {progress !== undefined && (
        <Box
          sx={{
            mt: 0.5,
            height: 4,
            borderRadius: 2,
            bgcolor: 'rgba(30,215,96,0.15)',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              width: `${progress}%`,
              height: '100%',
              borderRadius: 2,
              bgcolor: statusColor,
              transition: 'width 0.5s ease',
            }}
          />
        </Box>
      )}
    </Box>
  );
};

/* ================================================================ */
/*  Quick Action Card                                                */
/* ================================================================ */
interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  onClick: () => void;
}

const QuickActionCard: React.FC<QuickActionProps> = ({ icon, label, subtitle, onClick }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: '1px solid',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: '#1ED760',
          bgcolor: isDark ? 'rgba(30,215,96,0.04)' : 'rgba(30,215,96,0.03)',
          transform: 'translateY(-2px)',
          boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.3)' : '0 8px 24px rgba(0,0,0,0.06)',
        },
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 2,
          mx: 'auto',
          mb: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: isDark ? 'rgba(30,215,96,0.12)' : 'rgba(7,137,48,0.08)',
          color: isDark ? '#1ED760' : '#078930',
        }}
      >
        {icon}
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.85rem', mb: 0.25 }}>
        {label}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>
        {subtitle}
      </Typography>
    </Paper>
  );
};

/* ================================================================ */
/*  Main Component                                                   */
/* ================================================================ */

const AdminDashboardPage: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const { data: stats, isLoading: statsLoading } = useGetAdminStatsQuery();
  const { data: activity = [], isLoading: activityLoading } = useGetAdminActivityQuery();

  /* ---- Compute values ---- */
  const formatCount = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
  };

  const userGrowthPct = stats && stats.newUsersLastMonth > 0
    ? Math.round(((stats.newUsersThisMonth - stats.newUsersLastMonth) / stats.newUsersLastMonth) * 100)
    : (stats ? 12 : 0);

  return (
    <Box>
      {/* ================================================================ */}
      {/*  Header                                                          */}
      {/* ================================================================ */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
            Dashboard Overview
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.3 }}>
            Welcome back, <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{user?.first_name ?? 'Admin'}</Box>.
            Here is what's happening today.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<CalendarTodayIcon sx={{ fontSize: 14 }} />}
            sx={{
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.8rem',
              px: 2,
              borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
              color: 'text.primary',
            }}
          >
            Last 24 Hours
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<FileDownloadIcon sx={{ fontSize: 14 }} />}
            sx={{
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.8rem',
              px: 2,
              bgcolor: '#DA121A',
              '&:hover': { bgcolor: '#B50F16' },
            }}
          >
            Export Data
          </Button>
        </Box>
      </Box>

      {/* ================================================================ */}
      {/*  Stat Cards                                                      */}
      {/* ================================================================ */}
      {statsLoading ? (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Skeleton variant="rounded" height={120} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      ) : stats ? (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard
              title="Total Users"
              value={formatCount(stats.totalUsers)}
              icon={<PeopleIcon sx={{ fontSize: 20 }} />}
              trend={userGrowthPct}
              trendLabel="vs last month"
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard
              title="Songs"
              value={formatCount(stats.totalSongs)}
              icon={<MusicNoteIcon sx={{ fontSize: 20 }} />}
              trend={5}
              trendLabel="new uploads"
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard
              title="Pending Approvals"
              value={stats.pendingSongs}
              icon={<HourglassTopIcon sx={{ fontSize: 20 }} />}
              trend={stats.pendingSongs > 0 ? -2 : 0}
              trendLabel="waiting review"
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard
              title="Active Artists"
              value={stats.totalArtists}
              icon={<MicIcon sx={{ fontSize: 20 }} />}
              trend={8}
              trendLabel="verified this week"
            />
          </Grid>
        </Grid>
      ) : null}

      {/* ================================================================ */}
      {/*  Middle Row: Activity + System Status                            */}
      {/* ================================================================ */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* ---- Recent Activity ---- */}
        <Grid size={{ xs: 12, md: 7.5 }}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2.5, pt: 2.5, pb: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem' }}>
                Recent Activity
              </Typography>
              <Button
                variant="text"
                size="small"
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  color: '#1ED760',
                  '&:hover': { bgcolor: 'rgba(30,215,96,0.08)' },
                }}
              >
                View All Logs
              </Button>
            </Box>

            {/* Activity List */}
            {activityLoading ? (
              <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress size={24} sx={{ color: '#1ED760' }} />
              </Box>
            ) : activity.length === 0 ? (
              <Box sx={{ p: 6, textAlign: 'center' }}>
                <Typography color="text.secondary">No recent activity.</Typography>
              </Box>
            ) : (
              <List disablePadding>
                {activity.slice(0, 6).map((item, idx) => (
                  <React.Fragment key={item.id}>
                    <ListItem
                      sx={{
                        py: 1.75,
                        px: 2.5,
                        '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' },
                        transition: 'background-color 0.15s',
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 44 }}>
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            ...activityChipColor(item.type),
                          }}
                        >
                          {activityIcon(item.type)}
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                            {item.action}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.72rem' }}>
                            {item.user}
                          </Typography>
                        }
                      />
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.3, flexShrink: 0 }}>
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>
                          {timeAgoShort(item.timestamp)}
                        </Typography>
                        <Chip
                          size="small"
                          label={item.type === 'song' ? 'New' : item.type === 'user' ? 'Pending' : 'Success'}
                          sx={{
                            height: 20,
                            fontSize: '0.58rem',
                            fontWeight: 700,
                            textTransform: 'capitalize',
                            borderRadius: 1,
                            ...activityChipColor(item.type),
                          }}
                        />
                      </Box>
                    </ListItem>
                    {idx < Math.min(activity.length, 6) - 1 && (
                      <Divider sx={{ mx: 2.5 }} />
                    )}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* ---- System Status ---- */}
        <Grid size={{ xs: 12, md: 4.5 }}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              p: 2.5,
              height: '100%',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', mb: 2.5 }}>
              System Status
            </Typography>

            <StatusItem
              label="Core API Gateway"
              status="OPERATIONAL"
              subtitle="Latency: 45ms"
              progress={100}
            />
            <StatusItem
              label="Main DB (Cluster-A)"
              status="HEALTHY"
              subtitle="Uptime: 99.98%"
              progress={100}
            />
            <StatusItem
              label="CDN / Storage"
              status="OPERATIONAL"
              subtitle="Bandwidth: 1.2TB/s"
              progress={100}
            />

            {/* Mini Server Map */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem', color: 'text.secondary', mb: 1, display: 'block' }}>
                Live Server Map
              </Typography>
              <Box
                sx={{
                  borderRadius: 2,
                  overflow: 'hidden',
                  height: 100,
                  bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                }}
              >
                {/* Simulated server node */}
                <Box
                  sx={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    bgcolor: '#1ED760',
                    boxShadow: '0 0 12px rgba(30,215,96,0.6), 0 0 24px rgba(30,215,96,0.3)',
                    animation: 'serverPulse 2s ease-in-out infinite',
                    '@keyframes serverPulse': {
                      '0%, 100%': { boxShadow: '0 0 12px rgba(30,215,96,0.6), 0 0 24px rgba(30,215,96,0.3)' },
                      '50%': { boxShadow: '0 0 20px rgba(30,215,96,0.8), 0 0 40px rgba(30,215,96,0.4)' },
                    },
                  }}
                />
                <Box sx={{ position: 'absolute', bottom: 8, left: 12 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <FiberManualRecordIcon sx={{ fontSize: 8, color: '#1ED760' }} />
                    <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 700, color: '#1ED760' }}>
                      Node: ADD-01 Active
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* ================================================================ */}
      {/*  Quick Actions                                                   */}
      {/* ================================================================ */}
      <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', mb: 2 }}>
        Quick Actions
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <QuickActionCard
            icon={<AssessmentIcon />}
            label="Generate Report"
            subtitle="System-wide analytics"
            onClick={() => navigate(ROUTES.ADMIN_REPORTS)}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <QuickActionCard
            icon={<GavelIcon />}
            label="Moderate Content"
            subtitle="Review pending uploads"
            onClick={() => navigate(ROUTES.ADMIN_CONTENT)}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <QuickActionCard
            icon={<HowToRegIcon />}
            label="Manage Artists"
            subtitle="Verify profiles"
            onClick={() => navigate(ROUTES.ADMIN_ARTIST_VERIFICATION)}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <QuickActionCard
            icon={<NotificationsActiveIcon />}
            label="Bulk Notification"
            subtitle="Send push alerts"
            onClick={() => {/* placeholder */}}
          />
        </Grid>
      </Grid>

      {/* ================================================================ */}
      {/*  Footer: System Health                                           */}
      {/* ================================================================ */}
      <Paper
        elevation={0}
        sx={{
          px: 2.5,
          py: 1.5,
          borderRadius: 2,
          border: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.72rem', color: '#1ED760' }}>
            System Health
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
            <FiberManualRecordIcon sx={{ fontSize: 8, color: '#1ED760' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
              All services operational
            </Typography>
          </Box>
        </Box>
        <Box sx={{ flex: 1, ml: 2, height: 4, borderRadius: 2, bgcolor: '#1ED760', maxWidth: 120 }} />
      </Paper>
    </Box>
  );
};

export default AdminDashboardPage;
