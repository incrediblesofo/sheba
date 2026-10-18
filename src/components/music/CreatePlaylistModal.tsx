/**
 * Sheba Sound — Create Playlist Modal
 * -------------------------------------
 * Premium glassmorphic dialog for playlist creation.
 * Shows the user's playlist quota and redirects to the
 * subscription page when free users hit the limit.
 */

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Box,
  Typography,
  CircularProgress,
  Slide,
  Alert,
  IconButton,
} from '@mui/material';
import type { TransitionProps } from '@mui/material/transitions';
import CloseIcon from '@mui/icons-material/Close';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import LockIcon from '@mui/icons-material/Lock';
import { useNavigate } from 'react-router-dom';
import { useCreatePlaylistMutation } from '@/features/music/musicApi';
import { ROUTES } from '@/utils/constants';
import React from 'react';

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface CreatePlaylistModalProps {
  open: boolean;
  onClose: () => void;
  /** Current number of playlists the user owns. */
  currentCount: number;
  /** Max playlists allowed (null = unlimited). */
  limit: number | null;
  /** Whether the user has premium. */
  isPremium: boolean;
}

const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
  open,
  onClose,
  currentCount,
  limit,
  isPremium,
}) => {
  const navigate = useNavigate();
  const [createPlaylist, { isLoading }] = useCreatePlaylistMutation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const limitReached = limit !== null && currentCount >= limit;

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      setError('Playlist name is required.');
      return;
    }
    setError(null);
    try {
      await createPlaylist({
        title: title.trim(),
        description: description.trim(),
        is_public: isPublic,
      }).unwrap();
      // Success — reset form and close
      setTitle('');
      setDescription('');
      setIsPublic(true);
      onClose();
    } catch (err: any) {
      if (err?.status === 403 && err?.data?.limit_reached) {
        // Limit reached — redirect to subscription
        onClose();
        navigate(ROUTES.LISTENER_SUBSCRIPTION);
      } else {
        setError(err?.data?.detail || 'Failed to create playlist. Please try again.');
      }
    }
  }, [title, description, isPublic, createPlaylist, onClose, navigate]);

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setIsPublic(true);
    setError(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'linear-gradient(145deg, rgba(20,20,30,0.98) 0%, rgba(10,10,15,0.99) 100%)'
              : 'linear-gradient(145deg, #FFFFFF 0%, #F5F5F5 100%)',
          backdropFilter: 'blur(24px)',
          border: (theme) =>
            theme.palette.mode === 'dark'
              ? '1px solid rgba(18, 166, 74, 0.15)'
              : '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
          overflow: 'visible',
        },
      }}
    >
      {/* ---- Header ---- */}
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          pb: 1,
          pt: 3,
          px: 3,
        }}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #12A64A 0%, #078930 100%)',
            boxShadow: '0 4px 16px rgba(18, 166, 74, 0.3)',
          }}
        >
          <QueueMusicIcon sx={{ color: '#fff', fontSize: 24 }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={700}>
            Create Playlist
          </Typography>
          {!isPremium && limit !== null && (
            <Typography variant="caption" color="text.secondary">
              {currentCount}/{limit} playlists used
            </Typography>
          )}
        </Box>
        <IconButton onClick={handleClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* ---- Content ---- */}
      <DialogContent sx={{ px: 3, pt: 1 }}>
        {limitReached ? (
          /* ---- Limit Reached State ---- */
          <Box
            sx={{
              textAlign: 'center',
              py: 4,
              px: 2,
            }}
          >
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                mx: 'auto',
                mb: 2.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #FCDD09 0%, #DA121A 100%)',
                boxShadow: '0 8px 32px rgba(218, 18, 26, 0.25)',
              }}
            >
              <LockIcon sx={{ fontSize: 36, color: '#fff' }} />
            </Box>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Playlist Limit Reached
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 340, mx: 'auto' }}>
              Free accounts can create up to {limit} playlists.
              Upgrade to <strong>Premium</strong> for unlimited playlists and more!
            </Typography>
            <Button
              variant="contained"
              onClick={() => {
                handleClose();
                navigate(ROUTES.LISTENER_SUBSCRIPTION);
              }}
              sx={{
                borderRadius: 20,
                px: 5,
                py: 1.2,
                fontWeight: 700,
                textTransform: 'none',
                background: 'linear-gradient(135deg, #FCDD09 0%, #DA121A 100%)',
                color: '#fff',
                fontSize: '0.95rem',
                boxShadow: '0 6px 24px rgba(218, 18, 26, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #FFE44D 0%, #E63946 100%)',
                  boxShadow: '0 8px 32px rgba(218, 18, 26, 0.4)',
                },
              }}
            >
              Upgrade to Premium
            </Button>
          </Box>
        ) : (
          /* ---- Create Form ---- */
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <TextField
              label="Playlist Name"
              placeholder="My awesome playlist…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              required
              autoFocus
              inputProps={{ maxLength: 100 }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />

            <TextField
              label="Description"
              placeholder="What's this playlist about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={3}
              inputProps={{ maxLength: 500 }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {isPublic ? 'Public' : 'Private'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {isPublic
                      ? 'Anyone can see and play this playlist'
                      : 'Only you can see this playlist'}
                  </Typography>
                </Box>
              }
              sx={{ ml: 0 }}
            />
          </Box>
        )}
      </DialogContent>

      {/* ---- Actions ---- */}
      {!limitReached && (
        <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
          <Button
            onClick={handleClose}
            sx={{
              borderRadius: 20,
              px: 3,
              textTransform: 'none',
              fontWeight: 600,
              color: 'text.secondary',
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={isLoading || !title.trim()}
            sx={{
              borderRadius: 20,
              px: 4,
              fontWeight: 700,
              textTransform: 'none',
              background: 'linear-gradient(135deg, #12A64A 0%, #078930 100%)',
              boxShadow: '0 4px 16px rgba(18, 166, 74, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1ED760 0%, #12A64A 100%)',
                boxShadow: '0 6px 24px rgba(18, 166, 74, 0.4)',
              },
              '&.Mui-disabled': {
                background: 'rgba(18, 166, 74, 0.3)',
                color: 'rgba(255,255,255,0.5)',
              },
            }}
          >
            {isLoading ? (
              <CircularProgress size={20} sx={{ color: '#fff' }} />
            ) : (
              'Create Playlist'
            )}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default CreatePlaylistModal;
