/**
 * Sheba Sound — Admin Artist Verification Page (Spotify-Inspired)
 * -----------------------------------------------------------------
 * Premium admin page for reviewing, approving, and rejecting artist
 * applications. Features tabbed status filters, card-based layout,
 * ID document preview, reject-with-reason dialog, and audit trail.
 */

import React, { useState } from 'react';
import {
  Box, Typography, Paper, Chip, Avatar, Stack, Divider,
  Button, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, TextField, IconButton, Tooltip,
  Skeleton, Badge,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import BadgeIcon from '@mui/icons-material/Badge';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VerifiedIcon from '@mui/icons-material/Verified';
import BlockIcon from '@mui/icons-material/Block';
import HistoryIcon from '@mui/icons-material/History';
import CloseIcon from '@mui/icons-material/Close';
import { useAppDispatch } from '@/app/hooks';
import { showSnackbar } from '@/features/ui/uiSlice';
import {
  useGetPendingArtistsQuery,
  useGetArtistVerificationDetailQuery,
  useVerifyArtistMutation,
  useRejectArtistMutation,
  type PendingArtistItem,
} from '@/features/music/musicApi';

/* ---- Types & helpers ---- */
type FilterStatus = 'pending' | 'verified' | 'rejected';

const statusStyle = (s: string) => {
  switch (s) {
    case 'verified': return { color: '#1ED760', bg: 'rgba(30,215,96,0.12)', border: 'rgba(30,215,96,0.25)', label: 'Verified', icon: <VerifiedIcon sx={{ fontSize: 14 }} /> };
    case 'rejected': return { color: '#E74C3C', bg: 'rgba(231,76,60,0.12)', border: 'rgba(231,76,60,0.25)', label: 'Rejected', icon: <BlockIcon sx={{ fontSize: 14 }} /> };
    default:         return { color: '#F39C12', bg: 'rgba(243,156,18,0.12)', border: 'rgba(243,156,18,0.25)', label: 'Pending',  icon: <HourglassTopIcon sx={{ fontSize: 14 }} /> };
  }
};

const filterTabs: { value: FilterStatus; label: string; color: string }[] = [
  { value: 'pending',  label: 'Pending Review', color: '#F39C12' },
  { value: 'verified', label: 'Verified',       color: '#1ED760' },
  { value: 'rejected', label: 'Rejected',       color: '#E74C3C' },
];

/* ---- Detail Dialog ---- */
const ArtistDetailDialog: React.FC<{
  artistId: string | null;
  open: boolean;
  onClose: () => void;
}> = ({ artistId, open, onClose }) => {
  const { data: detail, isLoading } = useGetArtistVerificationDetailQuery(artistId!, {
    skip: !artistId,
  });

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          maxHeight: '85vh',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VisibilityIcon sx={{ color: '#9B59B6' }} />
          <Typography fontWeight={800}>Application Details</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2.5 }}>
        {isLoading || !detail ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={2.5}>
            {/* Artist info */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Avatar
                src={detail.profile_image_url ?? undefined}
                sx={{ width: 64, height: 64, bgcolor: 'rgba(155,89,182,0.15)', color: '#9B59B6', fontSize: '1.5rem', fontWeight: 800 }}
              >
                {detail.stage_name[0]}
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={800}>{detail.stage_name}</Typography>
                <Typography variant="body2" color="text.secondary">{detail.user.full_name}</Typography>
                <Typography variant="caption" color="text.secondary">{detail.user.email || detail.user.phone_number || '—'}</Typography>
              </Box>
            </Box>

            {/* Status badge */}
            {(() => {
              const ss = statusStyle(detail.verification_status);
              return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, borderRadius: 2, bgcolor: ss.bg, border: `1px solid ${ss.border}` }}>
                  {ss.icon}
                  <Typography variant="body2" fontWeight={700} sx={{ color: ss.color }}>{ss.label}</Typography>
                </Box>
              );
            })()}

            {/* Bio */}
            {detail.bio && (
              <Box>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5, display: 'block' }}>
                  Bio
                </Typography>
                <Typography variant="body2">{detail.bio}</Typography>
              </Box>
            )}

            {/* ID Document */}
            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1, display: 'block' }}>
                ID Document ({detail.id_document_type === 'national_id' ? 'National ID' : 'Passport'})
              </Typography>
              {detail.id_document_url ? (
                <Box
                  sx={{
                    borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider',
                    bgcolor: 'action.hover', maxHeight: 300, display: 'flex', justifyContent: 'center',
                  }}
                >
                  <img
                    src={detail.id_document_url}
                    alt="ID Document"
                    style={{ maxHeight: 300, maxWidth: '100%', objectFit: 'contain' }}
                  />
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  No document available.
                </Typography>
              )}
            </Box>

            {/* Submission info */}
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Submitted</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {detail.submitted_at
                    ? new Date(detail.submitted_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                    : 'N/A'}
                </Typography>
              </Box>
              {detail.reviewed_at && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Reviewed</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {new Date(detail.reviewed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </Typography>
                </Box>
              )}
            </Stack>

            {/* Rejection reason */}
            {detail.rejection_reason && (
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.2)' }}>
                <Typography variant="caption" fontWeight={700} sx={{ color: '#E74C3C', display: 'block', mb: 0.5 }}>
                  Rejection Reason
                </Typography>
                <Typography variant="body2">{detail.rejection_reason}</Typography>
              </Box>
            )}

            {/* Audit log */}
            {detail.verification_logs.length > 0 && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                  <HistoryIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Audit Log
                  </Typography>
                </Box>
                <Stack spacing={1}>
                  {detail.verification_logs.map((log, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 1, borderLeft: '2px solid', borderColor: 'divider' }}>
                      <Box>
                        <Typography variant="caption" fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                          {log.action}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {log.performed_by ?? 'System'} · {new Date(log.created_at).toLocaleString()}
                        </Typography>
                        {log.reason && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic' }}>
                            "{log.reason}"
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
};

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

const AdminArtistVerificationPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const { data: artists = [], isLoading } = useGetPendingArtistsQuery({ status: filter });
  const [verifyArtist, { isLoading: isVerifying }] = useVerifyArtistMutation();
  const [rejectArtist, { isLoading: isRejecting }] = useRejectArtistMutation();

  // Dialog state
  const [detailId, setDetailId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<PendingArtistItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState<PendingArtistItem | null>(null);

  const handleApprove = async () => {
    if (!approveTarget) return;
    setApproveDialogOpen(false);
    try {
      await verifyArtist(approveTarget.id).unwrap();
      dispatch(showSnackbar({ message: `✅ "${approveTarget.stage_name}" has been verified as an artist!`, severity: 'success' }));
    } catch {
      dispatch(showSnackbar({ message: `Failed to verify artist.`, severity: 'error' }));
    }
    setApproveTarget(null);
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setRejectDialogOpen(false);
    try {
      await rejectArtist({ id: rejectTarget.id, rejection_reason: rejectReason }).unwrap();
      dispatch(showSnackbar({ message: `❌ "${rejectTarget.stage_name}" has been rejected.`, severity: 'info' }));
    } catch {
      dispatch(showSnackbar({ message: `Failed to reject artist.`, severity: 'error' }));
    }
    setRejectTarget(null);
    setRejectReason('');
  };

  const isMutating = isVerifying || isRejecting;

  return (
    <Box>
      {/* ---- Header ---- */}
      <Box
        sx={{
          p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(155,89,182,0.18) 0%, rgba(18,166,74,0.08) 50%, rgba(252,221,9,0.06) 100%)',
          border: '1px solid rgba(155,89,182,0.25)',
          position: 'relative', overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(155,89,182,0.25) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: 'rgba(155,89,182,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HowToRegIcon sx={{ color: '#9B59B6' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800}>Artist Verification</Typography>
            <Typography variant="caption" color="text.secondary">
              Review and manage artist applications for Sheba Sound
            </Typography>
          </Box>
        </Box>
        {filter === 'pending' && artists.length > 0 && (
          <Chip
            label={`${artists.length} application${artists.length !== 1 ? 's' : ''} awaiting review`}
            size="small"
            icon={<HourglassTopIcon />}
            sx={{
              bgcolor: 'rgba(243,156,18,0.15)', color: '#F39C12', fontWeight: 700,
              border: '1px solid rgba(243,156,18,0.3)',
              animation: 'pulse 2.5s infinite',
              '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.7 } },
            }}
          />
        )}
      </Box>

      {/* ---- Filter Tabs ---- */}
      <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap', gap: 0.5 }}>
        {filterTabs.map(({ value, label, color }) => (
          <Button
            key={value}
            variant={filter === value ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setFilter(value)}
            sx={{
              borderRadius: 99, px: 2.5, py: 0.75, fontSize: '0.8rem',
              ...(filter === value
                ? { bgcolor: color, '&:hover': { bgcolor: color, filter: 'brightness(0.9)' } }
                : { borderColor: 'divider', color: 'text.secondary', '&:hover': { borderColor: color, color } }),
            }}
          >
            {label}
          </Button>
        ))}
      </Stack>

      {/* ---- Loading ---- */}
      {isLoading && (
        <Stack spacing={2}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={140} sx={{ borderRadius: 3 }} />
          ))}
        </Stack>
      )}

      {/* ---- Artist Cards ---- */}
      {!isLoading && artists.length === 0 && (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <HowToRegIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5 }} />
          <Typography variant="h6" fontWeight={700} color="text.secondary">
            No {filter} applications
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {filter === 'pending' ? 'All artist applications have been reviewed.' : `No ${filter} applications found.`}
          </Typography>
        </Paper>
      )}

      {!isLoading && artists.length > 0 && (
        <Stack spacing={2}>
          {artists.map((artist) => {
            const ss = statusStyle(artist.verification_status);
            const isPending = artist.verification_status === 'pending';
            return (
              <Paper
                key={artist.id}
                sx={{
                  p: { xs: 2, sm: 2.5 }, borderRadius: 3,
                  border: '1px solid', borderColor: 'divider',
                  transition: 'all 0.2s ease',
                  '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' },
                  position: 'relative', overflow: 'hidden',
                }}
              >
                {/* Subtle gradient accent */}
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${ss.color}44, transparent)` }} />

                <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2.5 }, alignItems: 'flex-start', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                  {/* Avatar */}
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    badgeContent={
                      <Box sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: ss.bg, border: `2px solid`, borderColor: 'background.paper', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {ss.icon}
                      </Box>
                    }
                  >
                    <Avatar
                      src={artist.profile_image_url ?? undefined}
                      sx={{
                        width: 56, height: 56, bgcolor: 'rgba(155,89,182,0.15)',
                        color: '#9B59B6', fontWeight: 800, fontSize: '1.25rem',
                        border: `2px solid ${ss.color}33`,
                      }}
                    >
                      {artist.stage_name[0]}
                    </Avatar>
                  </Badge>

                  {/* Info */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                      <Typography variant="subtitle1" fontWeight={800} noWrap>{artist.stage_name}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 0.3, borderRadius: 99, bgcolor: ss.bg, border: `1px solid ${ss.border}` }}>
                        {ss.icon}
                        <Typography variant="caption" fontWeight={700} sx={{ color: ss.color }}>{ss.label}</Typography>
                      </Box>
                    </Box>

                    {/* Details row */}
                    <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {artist.user_full_name || artist.user_username}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <EmailIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">{artist.user_email || artist.user_phone_number || '—'}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <BadgeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                          {artist.id_document_type === 'national_id' ? 'National ID' : 'Passport'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalendarTodayIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {artist.submitted_at
                            ? new Date(artist.submitted_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                            : 'N/A'}
                        </Typography>
                      </Box>
                    </Stack>

                    {/* Bio snippet */}
                    {artist.bio && (
                      <Typography variant="body2" color="text.secondary" sx={{
                        overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', mb: 1.5,
                      }}>
                        {artist.bio}
                      </Typography>
                    )}
                  </Box>

                  {/* Actions */}
                  <Stack spacing={1} sx={{ flexShrink: 0, pt: 0.5 }}>
                    <Tooltip title="View full application">
                      <IconButton
                        size="small"
                        onClick={() => setDetailId(artist.id)}
                        sx={{ bgcolor: 'rgba(155,89,182,0.1)', '&:hover': { bgcolor: 'rgba(155,89,182,0.2)' } }}
                      >
                        <VisibilityIcon fontSize="small" sx={{ color: '#9B59B6' }} />
                      </IconButton>
                    </Tooltip>
                    {isPending && (
                      <>
                        <Tooltip title="Approve artist">
                          <IconButton
                            size="small"
                            onClick={() => { setApproveTarget(artist); setApproveDialogOpen(true); }}
                            disabled={isMutating}
                            sx={{ bgcolor: 'rgba(30,215,96,0.1)', '&:hover': { bgcolor: 'rgba(30,215,96,0.2)', transform: 'scale(1.1)' }, transition: 'all 0.15s' }}
                          >
                            <CheckCircleIcon fontSize="small" sx={{ color: '#1ED760' }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject artist">
                          <IconButton
                            size="small"
                            onClick={() => { setRejectTarget(artist); setRejectDialogOpen(true); }}
                            disabled={isMutating}
                            sx={{ bgcolor: 'rgba(231,76,60,0.1)', '&:hover': { bgcolor: 'rgba(231,76,60,0.2)', transform: 'scale(1.1)' }, transition: 'all 0.15s' }}
                          >
                            <CancelIcon fontSize="small" sx={{ color: '#E74C3C' }} />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Stack>
                </Box>
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* ---- Detail Dialog ---- */}
      <ArtistDetailDialog
        artistId={detailId}
        open={!!detailId}
        onClose={() => setDetailId(null)}
      />

      {/* ---- Approve Confirmation Dialog ---- */}
      <Dialog
        open={approveDialogOpen}
        onClose={() => setApproveDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 3, border: '1px solid', borderColor: 'divider', minWidth: 380 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleIcon sx={{ color: '#1ED760' }} />
          Approve Artist
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to verify <strong>"{approveTarget?.stage_name}"</strong>?
            This will upgrade their account from Listener to Artist and allow them to upload music.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ pb: 2, px: 3, gap: 1 }}>
          <Button onClick={() => setApproveDialogOpen(false)} variant="outlined" sx={{ px: 3 }}>
            Cancel
          </Button>
          <Button
            onClick={handleApprove}
            variant="contained"
            color="success"
            disabled={isMutating}
            startIcon={isMutating ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
            sx={{ px: 3 }}
          >
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---- Reject Dialog ---- */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 3, border: '1px solid', borderColor: 'divider', minWidth: 400 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CancelIcon sx={{ color: '#E74C3C' }} />
          Reject Application
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Provide a reason for rejecting <strong>"{rejectTarget?.stage_name}"</strong>'s application.
            The user will see this reason and can resubmit with updated documents.
          </DialogContentText>
          <TextField
            autoFocus
            label="Rejection Reason"
            placeholder="e.g. ID document is blurry, please upload a clear photo..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            multiline
            rows={3}
            fullWidth
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </DialogContent>
        <DialogActions sx={{ pb: 2, px: 3, gap: 1 }}>
          <Button onClick={() => { setRejectDialogOpen(false); setRejectReason(''); }} variant="outlined" sx={{ px: 3 }}>
            Cancel
          </Button>
          <Button
            onClick={handleReject}
            variant="contained"
            color="error"
            disabled={isMutating || !rejectReason.trim()}
            startIcon={isMutating ? <CircularProgress size={16} color="inherit" /> : <CancelIcon />}
            sx={{ px: 3 }}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminArtistVerificationPage;
