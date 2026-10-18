/**
 * Sheba Sound — Artist Notifications Page
 * -----------------------------------------
 * Displays a feed of notifications: new followers, milestone alerts,
 * revenue updates, and moderation results. Supports mark-as-read.
 * Uses real API data from the backend.
 */

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Tooltip,
  Button,
  Chip,
  Divider,
  CircularProgress,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import { NotificationType } from '@/types/models';
import { useAppDispatch } from '@/app/hooks';
import { showSnackbar } from '@/features/ui/uiSlice';
import { useGetNotificationsQuery, useMarkNotificationReadMutation } from '@/features/music/musicApi';

const notifIcon = (type: string): React.ReactNode => {
  switch (type) {
    case NotificationType.NewFollower:     return <PersonAddIcon />;
    case NotificationType.StreamMilestone: return <WhatshotIcon />;
    case NotificationType.RevenueUpdate:   return <AttachMoneyIcon />;
    case NotificationType.SongApproved:    return <CheckCircleIcon />;
    case NotificationType.SongRejected:    return <CancelIcon />;
    default: return <WhatshotIcon />;
  }
};

const notifColor = (type: string): string => {
  switch (type) {
    case NotificationType.NewFollower:     return '#5B9BD5';
    case NotificationType.StreamMilestone: return '#F39C12';
    case NotificationType.RevenueUpdate:   return '#2ECC71';
    case NotificationType.SongApproved:    return '#27AE60';
    case NotificationType.SongRejected:    return '#E74C3C';
    default: return '#888';
  }
};

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const ArtistNotificationsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { data: notifications = [], isLoading } = useGetNotificationsQuery();
  const [markRead] = useMarkNotificationReadMutation();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkRead = async (id: string) => {
    try {
      await markRead(id).unwrap();
    } catch {
      // silent fail
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    try {
      await Promise.all(unread.map((n) => markRead(n.id).unwrap()));
      dispatch(showSnackbar({ message: 'All notifications marked as read.', severity: 'success' }));
    } catch {
      dispatch(showSnackbar({ message: 'Could not mark all as read.', severity: 'error' }));
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* ---- Header ---- */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h4" fontWeight={700}>
              Notifications
            </Typography>
            {unreadCount > 0 && (
              <Chip label={`${unreadCount} new`} color="primary" size="small" sx={{ fontWeight: 700 }} />
            )}
          </Box>
          <Typography variant="body1" color="text.secondary">
            Stay on top of your followers, milestones, and revenue updates.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {unreadCount > 0 && (
            <Button startIcon={<DoneAllIcon />} variant="outlined" size="small" onClick={handleMarkAllRead}>
              Mark All Read
            </Button>
          )}
        </Box>
      </Box>

      {/* ---- Notification Feed ---- */}
      {notifications.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
          <NotificationsOffIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
          <Typography color="text.secondary">You're all caught up — no notifications.</Typography>
        </Paper>
      ) : (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <List disablePadding>
            {notifications.map((notif, idx) => {
              const color = notifColor(notif.type);
              return (
                <Box key={notif.id}>
                  <ListItem
                    onClick={() => handleMarkRead(notif.id)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: notif.is_read ? 'transparent' : (theme) =>
                        theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      '&:hover': { bgcolor: 'action.hover' },
                      py: 2,
                    }}
                    secondaryAction={
                      <Tooltip title={timeAgo(notif.created_at)}>
                        <Typography variant="caption" color="text.secondary">
                          {timeAgo(notif.created_at)}
                        </Typography>
                      </Tooltip>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: `${color}20`, color }}>
                        {notifIcon(notif.type)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight={notif.is_read ? 400 : 700} sx={{ mr: 8 }}>
                            {notif.message}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Chip
                          label={notif.type.replace('_', ' ')}
                          size="small"
                          sx={{
                            mt: 0.5,
                            height: 18,
                            fontSize: '0.6rem',
                            bgcolor: `${color}15`,
                            color,
                            fontWeight: 600,
                            textTransform: 'capitalize',
                          }}
                        />
                      }
                    />
                    {!notif.is_read && (
                      <Box
                        sx={{
                          position: 'absolute',
                          left: 8,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                        }}
                      />
                    )}
                  </ListItem>
                  {idx < notifications.length - 1 && <Divider />}
                </Box>
              );
            })}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default ArtistNotificationsPage;
