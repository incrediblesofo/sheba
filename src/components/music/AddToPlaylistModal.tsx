/**
 * Sheba Sound — Add to Playlist Modal
 * --------------------------------------
 * A reusable bottom-sheet style Dialog that lets authenticated users
 * add any approved song to one of their playlists, or create a new
 * playlist with that song as the first track.
 *
 * Uses the new dedicated POST /playlists/<id>/songs/ endpoint
 * instead of the old "replace entire songs array" PATCH approach.
 *
 * Props:
 *   open      — whether the modal is visible
 *   onClose   — callback to close it
 *   songId    — UUID of the song to add
 */

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Avatar,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Divider,
  CircularProgress,
  IconButton,
  TextField,
  InputAdornment,
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import {
  useGetMyPlaylistsQuery,
  useAddSongToPlaylistMutation,
  useCreatePlaylistMutation,
  useGetSongByIdQuery,
} from '@/features/music/musicApi';
import { ROUTES } from '@/utils/constants';
import { SONG_PLACEHOLDER } from "@/utils/placeholders";

interface AddToPlaylistModalProps {
  open: boolean;
  onClose: () => void;
  songId: string;
  songTitle?: string; // optional hint for "create" label
}

const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  open,
  onClose,
  songId,
  songTitle,
}) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);

  const { data: myPlaylistData, isLoading } = useGetMyPlaylistsQuery(undefined, {
    skip: !open,
  });

  // Fetch song info for cover art fallback
  const { data: songDetail } = useGetSongByIdQuery(songId, { skip: !open || !songId });

  const [addSongToPlaylist] = useAddSongToPlaylistMutation();
  const [createPlaylist] = useCreatePlaylistMutation();

  const handleClose = () => {
    setSearch('');
    setAddingId(null);
    setAddedIds(new Set());
    onClose();
  };

  const handleAdd = async (playlistId: string) => {
    if (addingId) return; // prevent double-click
    setAddingId(playlistId);
    try {
      await addSongToPlaylist({ playlistId, songId }).unwrap();
      setAddedIds((prev) => new Set([...prev, playlistId]));
    } catch (err: any) {
      // 409 = already in playlist — still mark as "added"
      if (err?.status === 409) {
        setAddedIds((prev) => new Set([...prev, playlistId]));
      }
    } finally {
      setAddingId(null);
    }
  };

  const handleCreate = async () => {
    // Check free tier limit
    if (myPlaylistData && !myPlaylistData.is_premium && myPlaylistData.limit !== null) {
      if (myPlaylistData.count >= myPlaylistData.limit) {
        handleClose();
        navigate(ROUTES.LISTENER_SUBSCRIPTION);
        return;
      }
    }

    setIsCreating(true);
    try {
      await createPlaylist({
        title: songTitle ?? 'New Playlist',
        description: '',
        is_public: true,
        songs: [songId],
      }).unwrap();
      handleClose();
    } catch (err: any) {
      if (err?.status === 403) {
        handleClose();
        navigate(ROUTES.LISTENER_SUBSCRIPTION);
      }
    } finally {
      setIsCreating(false);
    }
  };

  // Filter playlists by search
  const filteredPlaylists = (myPlaylistData?.playlists ?? []).filter((pl) =>
    pl.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          maxHeight: '75vh',
          background: (t) =>
            t.palette.mode === 'dark'
              ? 'linear-gradient(160deg, #1A1A27 0%, #14141E 100%)'
              : '#FFFFFF',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Typography variant="h6" fontWeight={800}>
          Add to Playlist
        </Typography>
        <IconButton size="small" onClick={handleClose}>
          <CloseIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2, pt: 0, pb: 2 }}>
        {/* Search bar — only show if user has playlists */}
        {(myPlaylistData?.playlists.length ?? 0) > 4 && (
          <TextField
            placeholder="Search playlists…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        )}

        {/* Create new playlist button */}
        <ListItemButton
          onClick={handleCreate}
          disabled={isCreating}
          sx={{
            borderRadius: 2,
            mb: 0.5,
            py: 1,
            border: '1px dashed',
            borderColor: '#12A64A55',
            '&:hover': { bgcolor: 'rgba(18,166,74,0.08)', borderColor: '#12A64A' },
          }}
        >
          <ListItemAvatar sx={{ minWidth: 44 }}>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: 'rgba(18,166,74,0.15)',
                color: '#12A64A',
                borderRadius: 1.5,
              }}
            >
              {isCreating ? <CircularProgress size={16} /> : <AddIcon sx={{ fontSize: 20 }} />}
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={
              <Typography variant="body2" fontWeight={700} color="#12A64A">
                New Playlist
              </Typography>
            }
            secondary={
              <Typography variant="caption" color="text.secondary">
                {songTitle ? `Start with "${songTitle}"` : 'Create and add this song'}
              </Typography>
            }
          />
          {/* Premium limit chip */}
          {myPlaylistData &&
            !myPlaylistData.is_premium &&
            myPlaylistData.limit !== null &&
            myPlaylistData.count >= myPlaylistData.limit && (
              <Chip
                icon={<LockIcon sx={{ fontSize: 12 }} />}
                label="Upgrade"
                size="small"
                sx={{ fontSize: '0.6rem', bgcolor: 'rgba(218,18,26,0.1)', color: 'error.main' }}
              />
            )}
        </ListItemButton>

        <Divider sx={{ my: 1 }} />

        {/* Existing playlists */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : filteredPlaylists.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: 'center', py: 3, fontStyle: 'italic' }}
          >
            {search ? 'No playlists match your search.' : 'No playlists yet.'}
          </Typography>
        ) : (
          <List disablePadding sx={{ maxHeight: 320, overflowY: 'auto' }}>
            {filteredPlaylists.map((pl) => {
              const alreadyAdded = pl.songs.includes(songId) || addedIds.has(pl.id);
              const isAdding = addingId === pl.id;

              return (
                <ListItemButton
                  key={pl.id}
                  onClick={() => !alreadyAdded && handleAdd(pl.id)}
                  disabled={alreadyAdded || !!addingId}
                  sx={{
                    borderRadius: 2,
                    py: 0.75,
                    opacity: alreadyAdded ? 0.6 : 1,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <ListItemAvatar sx={{ minWidth: 44 }}>
                    <Avatar
                      variant="rounded"
                      src={(pl.cover_image_url ?? songDetail?.cover_image_url) || SONG_PLACEHOLDER}
                      sx={{ width: 36, height: 36, borderRadius: 1 }}
                    >
                      <QueueMusicIcon sx={{ fontSize: 20 }} />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {pl.title}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {pl.songs.length} {pl.songs.length === 1 ? 'song' : 'songs'}
                        {!pl.is_public && ' • Private'}
                      </Typography>
                    }
                  />
                  {isAdding ? (
                    <CircularProgress size={18} sx={{ ml: 1 }} />
                  ) : alreadyAdded ? (
                    <CheckCircleIcon sx={{ fontSize: 18, color: '#1DB954', ml: 1 }} />
                  ) : null}
                </ListItemButton>
              );
            })}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddToPlaylistModal;
