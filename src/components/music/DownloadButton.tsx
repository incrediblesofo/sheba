/**
 * Sheba Sound — Download Button
 * --------------------------------
 * Allows premium users to download songs for offline playback.
 * Shows lock icon for free users with upgrade prompt.
 */

import React, { useState, useCallback } from 'react';
import { IconButton, Tooltip, CircularProgress } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import DownloadDoneIcon from '@mui/icons-material/DownloadDone';
import LockIcon from '@mui/icons-material/Lock';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useNavigate } from 'react-router-dom';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useAppDispatch } from '@/app/hooks';
import { showSnackbar } from '@/features/ui/uiSlice';
import { ROUTES } from '@/utils/constants';
import {
  useDownloadSongMutation,
  useRemoveDownloadMutation,
} from '@/features/music/musicApi';

interface DownloadButtonProps {
  songId: string;
  /** Whether this song is already in the user's downloads list. */
  isDownloaded?: boolean;
  /** Size of the icon button. */
  size?: 'small' | 'medium';
  /** Callback after successful download/remove. */
  onStatusChange?: () => void;
}

const DownloadButton: React.FC<DownloadButtonProps> = ({
  songId,
  isDownloaded = false,
  size = 'small',
  onStatusChange,
}) => {
  const { isPremium } = usePremiumStatus();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [downloaded, setDownloaded] = useState(isDownloaded);
  const [showRemove, setShowRemove] = useState(false);

  const [downloadSong, { isLoading: downloading }] = useDownloadSongMutation();
  const [removeDownload, { isLoading: removing }] = useRemoveDownloadMutation();

  const handleDownload = useCallback(async () => {
    if (!isPremium) {
      navigate(ROUTES.LISTENER_SUBSCRIPTION);
      return;
    }

    try {
      await downloadSong(songId).unwrap();

      setDownloaded(true);
      dispatch(showSnackbar({ message: 'Song added to Downloads!', severity: 'success' }));
      onStatusChange?.();
    } catch (err: unknown) {
      const error = err as { data?: { detail?: string } };
      dispatch(
        showSnackbar({
          message: error?.data?.detail ?? 'Download failed. Please try again.',
          severity: 'error',
        })
      );
    }
  }, [isPremium, songId, downloadSong, dispatch, navigate, onStatusChange]);

  const handleRemove = useCallback(async () => {
    try {
      await removeDownload(songId).unwrap();
      setDownloaded(false);
      setShowRemove(false);
      dispatch(showSnackbar({ message: 'Download removed.', severity: 'info' }));
      onStatusChange?.();
    } catch {
      dispatch(
        showSnackbar({ message: 'Failed to remove download.', severity: 'error' })
      );
    }
  }, [songId, removeDownload, dispatch, onStatusChange]);

  const isLoading = downloading || removing;

  // Free user → lock icon
  if (!isPremium) {
    return (
      <Tooltip title="Premium feature — Upgrade to download" arrow>
        <IconButton
          size={size}
          onClick={() => navigate(ROUTES.LISTENER_SUBSCRIPTION)}
          sx={{ color: 'text.disabled' }}
        >
          <LockIcon sx={{ fontSize: size === 'small' ? 16 : 20 }} />
        </IconButton>
      </Tooltip>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <IconButton size={size} disabled>
        <CircularProgress size={size === 'small' ? 14 : 18} />
      </IconButton>
    );
  }

  // Already downloaded → show checkmark, hover to show remove
  if (downloaded) {
    return (
      <Tooltip title={showRemove ? 'Remove download' : 'Downloaded'} arrow>
        <IconButton
          size={size}
          onMouseEnter={() => setShowRemove(true)}
          onMouseLeave={() => setShowRemove(false)}
          onClick={handleRemove}
          sx={{
            color: showRemove ? 'error.main' : '#1DB954',
            transition: 'color 0.15s',
          }}
        >
          {showRemove ? (
            <DeleteOutlineIcon sx={{ fontSize: size === 'small' ? 16 : 20 }} />
          ) : (
            <DownloadDoneIcon sx={{ fontSize: size === 'small' ? 16 : 20 }} />
          )}
        </IconButton>
      </Tooltip>
    );
  }

  // Not downloaded → download icon
  return (
    <Tooltip title="Download for offline" arrow>
      <IconButton
        size={size}
        onClick={handleDownload}
        sx={{
          color: 'text.secondary',
          '&:hover': { color: '#1DB954' },
        }}
      >
        <DownloadIcon sx={{ fontSize: size === 'small' ? 16 : 20 }} />
      </IconButton>
    </Tooltip>
  );
};

export default DownloadButton;
