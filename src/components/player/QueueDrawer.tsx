/**
 * Sheba Sound — Queue Drawer
 * ----------------------------
 * Slide-out drawer showing the upcoming tracks in the current queue.
 * Allows removing songs from the queue.
 */

import {
  Drawer,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  Divider,
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EqualizerIcon from '@mui/icons-material/Equalizer';
import RadioIcon from '@mui/icons-material/Radio';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { playTrack, removeFromQueue } from '@/features/player/playerSlice';
import { formatDuration } from '@/utils/helpers';
import type { SongWithArtist } from '@/features/music/musicApi';
import { SONG_PLACEHOLDER } from "@/utils/placeholders";

interface QueueDrawerProps {
  open: boolean;
  onClose: () => void;
}

const QueueDrawer: React.FC<QueueDrawerProps> = ({ open, onClose }) => {
  const dispatch = useAppDispatch();
  const { queue, queueIndex, currentTrack, isPlaying, radioMode } = useAppSelector(
    (state) => state.player,
  );

  const upcomingQueue = queue.slice(queueIndex + 1);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 380 },
          bgcolor: 'background.paper',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: (t) => `1px solid ${t.palette.divider}`,
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          Queue
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* ---- Now Playing ---- */}
      {currentTrack && (
        <>
          <Box sx={{ px: 2, pt: 2, pb: 1 }}>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ fontWeight: 700 }}
            >
              Now Playing
            </Typography>
          </Box>
          <List disablePadding>
            <ListItem sx={{ px: 2 }}>
              <ListItemAvatar sx={{ minWidth: 48 }}>
                <Avatar
                  variant="rounded"
                  src={currentTrack.cover_image_url || SONG_PLACEHOLDER}
                  alt={currentTrack.title}
                  sx={{ width: 44, height: 44, borderRadius: 1 }}
                />
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    noWrap
                    sx={{ color: '#1DB954' }}
                  >
                    {currentTrack.title}
                  </Typography>
                }
                secondary={
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{ color: 'text.secondary' }}
                  >
                    {(currentTrack as SongWithArtist).artist_name ?? 'Unknown Artist'}
                  </Typography>
                }
              />
              {isPlaying && (
                <EqualizerIcon sx={{ fontSize: 18, color: '#1DB954', ml: 1 }} />
              )}
            </ListItem>
          </List>
          <Divider sx={{ mx: 2, my: 1 }} />
        </>
      )}

      {/* ---- Up Next ---- */}
      <Box sx={{ px: 2, pt: 1, pb: 0.5 }}>
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ fontWeight: 700 }}
        >
          Up Next ({upcomingQueue.length})
        </Typography>
      </Box>

      {upcomingQueue.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {radioMode
              ? 'Radio is finding songs for you…'
              : 'No more songs in queue'}
          </Typography>
        </Box>
      ) : (
        <List disablePadding sx={{ overflow: 'auto', flex: 1 }}>
          {upcomingQueue.map((song, i) => {
            const absoluteIndex = queueIndex + 1 + i;
            return (
              <ListItem
                key={`${song.id}-${absoluteIndex}`}
                disablePadding
                secondaryAction={
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => dispatch(removeFromQueue(absoluteIndex))}
                    sx={{ color: 'text.disabled' }}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                }
              >
                <ListItemButton
                  onClick={() => dispatch(playTrack({ track: song, queue }))}
                  sx={{ py: 0.75, px: 2 }}
                >
                  <ListItemAvatar sx={{ minWidth: 44 }}>
                    <Avatar
                      variant="rounded"
                      src={song.cover_image_url || SONG_PLACEHOLDER}
                      alt={song.title}
                      sx={{ width: 36, height: 36, borderRadius: 0.75 }}
                    />
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="body2" noWrap sx={{ fontSize: '0.8125rem' }}>
                        {song.title}
                      </Typography>
                    }
                    secondary={
                      <Typography
                        variant="caption"
                        noWrap
                        sx={{ color: 'text.secondary', fontSize: '0.6875rem' }}
                      >
                        {(song as SongWithArtist).artist_name ?? 'Unknown Artist'} • {formatDuration(song.duration)}
                      </Typography>
                    }
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      )}

      {/* Radio footer — shown when radio mode is active */}
      {radioMode && (
        <Box
          sx={{
            p: 2,
            borderTop: (t) => `1px solid ${t.palette.divider}`,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Chip
            icon={<RadioIcon sx={{ fontSize: '14px !important', color: '#1DB954 !important' }} />}
            label="Radio • auto-playing similar songs"
            size="small"
            sx={{
              bgcolor: 'rgba(29,185,84,0.1)',
              color: '#1DB954',
              fontWeight: 700,
              fontSize: '0.7rem',
              border: '1px solid rgba(29,185,84,0.25)',
              animation: 'radioFooterPulse 3s ease-in-out infinite',
              '@keyframes radioFooterPulse': {
                '0%, 100%': { opacity: 0.8 },
                '50%': { opacity: 1 },
              },
            }}
          />
        </Box>
      )}
    </Drawer>
  );
};

export default QueueDrawer;
