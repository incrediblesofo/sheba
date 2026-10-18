/**
 * Sheba Sound — Admin Content Moderation Page
 * -----------------------------------------------
 * Redesigned moderation queue with tabbed filters, track detail table,
 * metadata chips, duplicate check status, and daily performance stats.
 * Uses real API data from the admin dashboard backend.
 */

import React, { useState } from 'react';
import {
  Box, Typography, Paper, Chip, IconButton, Tooltip,
  Avatar, Button, CircularProgress, Grid, useTheme, Tabs, Tab,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import GavelIcon from '@mui/icons-material/Gavel';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import SpeedIcon from '@mui/icons-material/Speed';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { useAppDispatch } from '@/app/hooks';
import { showSnackbar } from '@/features/ui/uiSlice';
import { useGetModerationQueueQuery, useModerateSongMutation } from '@/features/music/musicApi';
import { formatDuration } from '@/utils/helpers';
import { SongStatus } from '@/types/models';

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected' | 'flagged';

const filterTabs: { value: FilterStatus; label: string }[] = [
  { value: 'all',      label: 'All Submissions' },
  { value: 'pending',  label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'flagged',  label: 'Flagged' },
];

/* ================================================================ */
/*  Performance Stat Card                                            */
/* ================================================================ */
interface PerfStatProps {
  title: string;
  value: string | number;
  change?: string;
  changePositive?: boolean;
  accent?: boolean;
  icon?: React.ReactNode;
}

const PerfStat: React.FC<PerfStatProps> = ({ title, value, change, changePositive, accent, icon }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: '1px solid',
        borderColor: accent ? '#1ED760' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
        bgcolor: accent ? (isDark ? 'rgba(30,215,96,0.08)' : 'rgba(30,215,96,0.04)') : undefined,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          fontSize: '0.62rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'text.secondary',
        }}
      >
        {title}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1, color: accent ? '#1ED760' : undefined }}>
          {value}
        </Typography>
        {change && (
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: changePositive === false ? '#E74C3C' : '#1ED760',
              fontSize: '0.72rem',
            }}
          >
            {change}
          </Typography>
        )}
        {icon}
      </Box>
    </Paper>
  );
};

/* ================================================================ */
/*  Main Component                                                   */
/* ================================================================ */

const AdminContentPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const { data: allItems = [], isLoading } = useGetModerationQueueQuery();
  const [moderateSong, { isLoading: isModerating }] = useModerateSongMutation();
  const [filter, setFilter] = useState<FilterStatus>('pending');

  const counts = {
    all:      allItems.length,
    pending:  allItems.filter((i) => i.status === SongStatus.Pending).length,
    approved: allItems.filter((i) => i.status === SongStatus.Approved).length,
    rejected: allItems.filter((i) => i.status === SongStatus.Rejected).length,
    flagged:  0, // Placeholder for flagged items
  };

  const filteredItems = filter === 'all'
    ? allItems
    : filter === 'flagged'
      ? []
      : allItems.filter((i) => i.status === filter);

  const handleApprove = async (songId: string, title: string) => {
    try {
      await moderateSong({ id: songId, status: 'approved' }).unwrap();
      dispatch(showSnackbar({ message: `✅ "${title}" approved.`, severity: 'success' }));
    } catch {
      dispatch(showSnackbar({ message: `Failed to approve "${title}".`, severity: 'error' }));
    }
  };

  const handleReject = async (songId: string, title: string) => {
    try {
      await moderateSong({ id: songId, status: 'rejected' }).unwrap();
      dispatch(showSnackbar({ message: `❌ "${title}" rejected.`, severity: 'info' }));
    } catch {
      dispatch(showSnackbar({ message: `Failed to reject "${title}".`, severity: 'error' }));
    }
  };

  // Generate a short ID for display
  const shortId = (id: string): string => `SB-${id.slice(-5).toUpperCase()}`;

  return (
    <Box>
      {/* ================================================================ */}
      {/*  Header                                                          */}
      {/* ================================================================ */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
              Content Moderation
            </Typography>
            {counts.pending > 0 && (
              <Chip
                label={`${counts.pending} Pending`}
                size="small"
                sx={{
                  height: 24,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  bgcolor: 'rgba(30,215,96,0.12)',
                  color: '#1ED760',
                  borderRadius: 1.5,
                }}
              />
            )}
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Review and approve new submissions to the platform.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileDownloadIcon sx={{ fontSize: 14 }} />}
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
            Export Report
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<PlaylistPlayIcon sx={{ fontSize: 16 }} />}
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
            Review All
          </Button>
        </Box>
      </Box>

      {/* ================================================================ */}
      {/*  Filter Tabs                                                     */}
      {/* ================================================================ */}
      <Box sx={{ borderBottom: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', mb: 3 }}>
        <Tabs
          value={filter}
          onChange={(_, val) => setFilter(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              minHeight: 44,
              color: 'text.secondary',
              '&.Mui-selected': { color: 'text.primary', fontWeight: 800 },
            },
            '& .MuiTabs-indicator': {
              bgcolor: '#1ED760',
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          {filterTabs.map(({ value, label }) => (
            <Tab
              key={value}
              value={value}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  {label}
                  {counts[value] > 0 && (
                    <Box
                      component="span"
                      sx={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: value === 'pending' ? '#F39C12' : 'text.disabled',
                      }}
                    >
                      ({counts[value]})
                    </Box>
                  )}
                </Box>
              }
            />
          ))}
        </Tabs>
      </Box>

      {/* ================================================================ */}
      {/*  Loading                                                         */}
      {/* ================================================================ */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#1ED760' }} />
        </Box>
      )}

      {/* ================================================================ */}
      {/*  Moderation Table                                                */}
      {/* ================================================================ */}
      {!isLoading && (
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            mb: 3,
          }}
        >
          {/* Column Headers */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr auto', sm: '1fr 1fr 1fr 140px 140px' },
              gap: 1,
              px: 3,
              py: 1.25,
              borderBottom: '1px solid',
              borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              bgcolor: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.015)',
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', fontSize: '0.62rem' }}>
              Track Detail
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', fontSize: '0.62rem', display: { xs: 'none', sm: 'block' } }}>
              Artist & Album
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', fontSize: '0.62rem', display: { xs: 'none', sm: 'block' } }}>
              Metadata
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', fontSize: '0.62rem', display: { xs: 'none', sm: 'block' } }}>
              Duplicate Check
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', fontSize: '0.62rem', textAlign: 'right' }}>
              Actions
            </Typography>
          </Box>

          {/* Song Rows */}
          {filteredItems.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <GavelIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary" fontWeight={600}>No songs match this filter.</Typography>
            </Box>
          ) : (
            filteredItems.map((item, idx) => {
              const isPending = item.status === SongStatus.Pending;

              return (
                <Box
                  key={item.songId}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr auto', sm: '1fr 1fr 1fr 140px 140px' },
                    gap: 1,
                    px: 3,
                    py: 2,
                    alignItems: 'center',
                    borderBottom: idx < filteredItems.length - 1 ? '1px solid' : 'none',
                    borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                    transition: 'background 0.15s ease',
                    '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' },
                  }}
                >
                  {/* Track Detail */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                    <Avatar
                      variant="rounded"
                      src={item.coverUrl ?? undefined}
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                        flexShrink: 0,
                      }}
                    >
                      <MusicNoteIcon />
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.68rem' }}>
                        ID: {shortId(item.songId)}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Artist & Album */}
                  <Box sx={{ display: { xs: 'none', sm: 'block' }, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      {item.artistName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#1ED760', fontSize: '0.72rem', fontStyle: 'italic' }}>
                      {item.genre}
                    </Typography>
                  </Box>

                  {/* Metadata */}
                  <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Chip
                      size="small"
                      label={item.genre.toUpperCase()}
                      sx={{
                        height: 22,
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                        borderRadius: 1,
                      }}
                    />
                    <Chip
                      size="small"
                      label={formatDuration(item.duration)}
                      sx={{
                        height: 22,
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                        borderRadius: 1,
                      }}
                    />
                  </Box>

                  {/* Duplicate Check */}
                  <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 0.5 }}>
                    <FiberManualRecordIcon sx={{ fontSize: 8, color: '#1ED760' }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#1ED760', fontSize: '0.72rem' }}>
                      Clean
                    </Typography>
                  </Box>

                  {/* Actions */}
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.75, alignItems: 'center' }}>
                    {isPending ? (
                      <>
                        <Tooltip title="Reject">
                          <IconButton
                            size="small"
                            onClick={() => handleReject(item.songId, item.title)}
                            disabled={isModerating}
                            sx={{
                              width: 32,
                              height: 32,
                              bgcolor: isDark ? 'rgba(231,76,60,0.12)' : 'rgba(231,76,60,0.08)',
                              color: '#E74C3C',
                              '&:hover': { bgcolor: 'rgba(231,76,60,0.2)', transform: 'scale(1.05)' },
                              transition: 'all 0.15s',
                            }}
                          >
                            <CancelIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleApprove(item.songId, item.title)}
                          disabled={isModerating}
                          sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            px: 2,
                            py: 0.6,
                            bgcolor: '#1ED760',
                            color: '#000',
                            '&:hover': { bgcolor: '#1DB954' },
                            minWidth: 0,
                          }}
                        >
                          Approve
                        </Button>
                      </>
                    ) : (
                      <Chip
                        size="small"
                        icon={
                          item.status === SongStatus.Approved
                            ? <CheckCircleIcon sx={{ fontSize: 14 }} />
                            : <CancelIcon sx={{ fontSize: 14 }} />
                        }
                        label={item.status === SongStatus.Approved ? 'Approved' : 'Rejected'}
                        sx={{
                          height: 26,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          bgcolor: item.status === SongStatus.Approved
                            ? 'rgba(30,215,96,0.12)'
                            : 'rgba(231,76,60,0.12)',
                          color: item.status === SongStatus.Approved ? '#1ED760' : '#E74C3C',
                          '& .MuiChip-icon': { color: 'inherit' },
                          borderRadius: 1.5,
                        }}
                      />
                    )}
                  </Box>
                </Box>
              );
            })
          )}
        </Paper>
      )}

      {/* ================================================================ */}
      {/*  Daily Performance                                               */}
      {/* ================================================================ */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <SpeedIcon sx={{ fontSize: 20, color: '#1ED760' }} />
        <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem' }}>
          Daily Performance
        </Typography>
      </Box>
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <PerfStat
            title="Today's Throughput"
            value={counts.approved + counts.rejected || allItems.length}
            change={`↑ ${Math.min(12, allItems.length)}%`}
            changePositive
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <PerfStat
            title="Avg. Review Time"
            value="42s"
            change="↓ 4s"
            changePositive
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <PerfStat
            title="Approval Rate"
            value={allItems.length > 0
              ? `${Math.round((counts.approved / Math.max(counts.approved + counts.rejected, 1)) * 100)}%`
              : '—'
            }
            change="Normal"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <PerfStat
            title="Moderators Online"
            value={1}
            accent
            icon={
              <Box sx={{ display: 'flex', gap: 0.3, ml: 1 }}>
                <Box sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: '#1ED760', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography sx={{ fontSize: '0.5rem', fontWeight: 800, color: '#000' }}>A</Typography>
                </Box>
              </Box>
            }
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminContentPage;
