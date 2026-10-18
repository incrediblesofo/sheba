/**
 * Sheba Sound — Admin Users Page (Premium Redesign)
 * ---------------------------------------------------
 * Searchable, filterable user table with role badges, status indicators,
 * avatar initials, and activate/deactivate actions.
 * Uses real API data from the admin dashboard backend.
 */

import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Chip, IconButton, Tooltip,
  TextField, InputAdornment, Avatar, Stack, Divider,
  Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, Button, MenuItem, Badge, Skeleton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FilterListIcon from '@mui/icons-material/FilterList';
import PeopleIcon from '@mui/icons-material/People';
import MicIcon from '@mui/icons-material/Mic';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon from '@mui/icons-material/Person';
import { useAppDispatch } from '@/app/hooks';
import { showSnackbar } from '@/features/ui/uiSlice';
import { useGetAdminUsersQuery, useUpdateAdminUserMutation } from '@/features/music/musicApi';
import { UserRole } from '@/types/models';

/* ---- Role config ---- */
type RoleColorKey = 'admin' | 'artist' | 'listener';
const roleConfig: Record<RoleColorKey, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  admin:    { color: '#E74C3C', bg: 'rgba(231,76,60,0.15)',   icon: <AdminPanelSettingsIcon sx={{ fontSize: 14 }} />, label: 'Admin'    },
  artist:   { color: '#9B59B6', bg: 'rgba(155,89,182,0.15)', icon: <MicIcon sx={{ fontSize: 14 }} />,               label: 'Artist'   },
  listener: { color: '#5B9BD5', bg: 'rgba(91,155,213,0.15)', icon: <PersonIcon sx={{ fontSize: 14 }} />,            label: 'Listener' },
};

/* ---- Stat mini card ---- */
interface MiniStatProps { label: string; value: number; color: string }
const MiniStat: React.FC<MiniStatProps> = ({ label, value, color }) => (
  <Paper sx={{ px: 3, py: 2, borderRadius: 2.5, textAlign: 'center', border: '1px solid', borderColor: 'divider', flex: 1, minWidth: 100 }}>
    <Typography variant="h5" fontWeight={800} sx={{ color }}>{value}</Typography>
    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>{label}</Typography>
  </Paper>
);

/* ---- Page ---- */
const AdminUsersPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { data: allUsers = [], isLoading } = useGetAdminUsersQuery();
  const [updateUser, { isLoading: isUpdating }] = useUpdateAdminUserMutation();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [dialogAction, setDialogAction] = useState<'activate' | 'deactivate'>('deactivate');

  const filteredUsers = useMemo(() => allUsers.filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      u.first_name.toLowerCase().includes(q) ||
      u.last_name.toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone_number || '').toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q);
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  }), [allUsers, search, roleFilter]);

  const handleToggleStatus = (id: string, name: string, isActive: boolean) => {
    setSelectedUserId(id);
    setSelectedUserName(name);
    setDialogAction(isActive ? 'deactivate' : 'activate');
    setDialogOpen(true);
  };

  const confirmAction = async () => {
    setDialogOpen(false);
    try {
      await updateUser({
        id: selectedUserId,
        data: { is_active: dialogAction === 'activate' },
      }).unwrap();
      dispatch(showSnackbar({ message: `"${selectedUserName}" ${dialogAction}d.`, severity: 'success' }));
    } catch {
      dispatch(showSnackbar({ message: `Failed to ${dialogAction} user.`, severity: 'error' }));
    }
  };

  const roleCounts = {
    all: allUsers.length,
    listener: allUsers.filter((u) => u.role === UserRole.Listener).length,
    artist: allUsers.filter((u) => u.role === UserRole.Artist).length,
    admin: allUsers.filter((u) => u.role === UserRole.Admin).length,
  };

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="rounded" height={120} sx={{ borderRadius: 3, mb: 3 }} />
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          {[1,2,3,4].map((i) => <Skeleton key={i} variant="rounded" height={80} sx={{ flex: 1, borderRadius: 2.5 }} />)}
        </Stack>
        {[1,2,3,4,5].map((i) => <Skeleton key={i} variant="rounded" height={60} sx={{ mb: 1, borderRadius: 2 }} />)}
      </Box>
    );
  }

  return (
    <Box>
      {/* ---- Header ---- */}
      <Box
        sx={{
          p: 3, mb: 3, borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(91,155,213,0.15) 0%, rgba(18,166,74,0.08) 100%)',
          border: '1px solid rgba(91,155,213,0.2)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(91,155,213,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PeopleIcon sx={{ color: '#5B9BD5' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800}>User Management</Typography>
            <Typography variant="caption" color="text.secondary">{allUsers.length} registered users across the platform</Typography>
          </Box>
        </Box>
      </Box>

      {/* ---- Mini Stats ---- */}
      <Stack direction="row" spacing={{ xs: 1, sm: 2 }} sx={{ mb: 3, flexWrap: 'wrap', gap: { xs: 1, sm: 0 } }}>
        <MiniStat label="All Users"  value={roleCounts.all}      color="text.primary" />
        <MiniStat label="Listeners"  value={roleCounts.listener} color="#5B9BD5" />
        <MiniStat label="Artists"    value={roleCounts.artist}   color="#9B59B6" />
        <MiniStat label="Admins"     value={roleCounts.admin}    color="#E74C3C" />
      </Stack>

      {/* ---- Filters ---- */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          placeholder="Search by name, email, or username…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ maxWidth: 320, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
        />
        <TextField
          select value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          size="small" label="Role"
          sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><FilterListIcon fontSize="small" /></InputAdornment> } }}
        >
          <MenuItem value="all">All Roles ({roleCounts.all})</MenuItem>
          <MenuItem value={UserRole.Listener}>Listeners ({roleCounts.listener})</MenuItem>
          <MenuItem value={UserRole.Artist}>Artists ({roleCounts.artist})</MenuItem>
          <MenuItem value={UserRole.Admin}>Admins ({roleCounts.admin})</MenuItem>
        </TextField>
      </Box>

      {/* ---- Users Table ---- */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
        {/* Table head */}
        <Box sx={{ px: 2.5, py: 1.5, display: 'grid', gridTemplateColumns: '1fr auto', bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.6rem' }}>
            User · {filteredUsers.length} result{filteredUsers.length !== 1 && 's'}
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.6rem' }}>
            Status &amp; Action
          </Typography>
        </Box>

        {filteredUsers.map((user, idx) => {
          const rc = roleConfig[(user.role as RoleColorKey) ?? 'listener'];
          const initials = `${user.first_name[0] ?? '?'}${user.last_name[0] ?? '?'}`;
          return (
            <React.Fragment key={user.id}>
              <Box sx={{ px: { xs: 1.5, sm: 2.5 }, py: 1.5, display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, flexWrap: { xs: 'wrap', sm: 'nowrap' }, '&:hover': { bgcolor: 'action.hover' }, transition: 'background-color 0.15s' }}>
                {/* Avatar */}
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  badgeContent={<Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: user.is_active ? '#12A64A' : '#7f8c8d', border: '2px solid', borderColor: 'background.paper' }} />}
                >
                  <Avatar
                    src={user.avatar_url ?? undefined}
                    sx={{ width: 42, height: 42, bgcolor: rc.bg, color: rc.color, fontWeight: 700, fontSize: '0.875rem', border: `2px solid ${rc.color}33` }}
                  >
                    {initials}
                  </Avatar>
                </Badge>

                {/* Info */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="body2" fontWeight={700} noWrap>
                      {user.first_name} {user.last_name}
                    </Typography>
                    {!user.is_verified && (
                      <Chip label="Unverified" size="small" sx={{ height: 16, fontSize: '0.55rem', fontWeight: 700, bgcolor: 'rgba(243,156,18,0.15)', color: '#F39C12' }} />
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    @{user.username} · {user.email || user.phone_number || '—'} · Joined {new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </Typography>
                </Box>

                {/* Role + Status + Action */}
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0, flexWrap: 'wrap', gap: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 0.4, borderRadius: 99, bgcolor: rc.bg, color: rc.color, border: `1px solid ${rc.color}33` }}>
                    {rc.icon}
                    <Typography variant="caption" fontWeight={700} sx={{ lineHeight: 1 }}>{rc.label}</Typography>
                  </Box>
                  <Chip
                    label={user.is_active ? 'Active' : 'Inactive'}
                    size="small"
                    sx={user.is_active
                      ? { bgcolor: 'rgba(18,166,74,0.15)', color: '#1ED760', fontWeight: 700 }
                      : { bgcolor: 'rgba(127,140,141,0.15)', color: '#7f8c8d', fontWeight: 700 }
                    }
                  />
                  <Tooltip title={user.is_active ? 'Deactivate user' : 'Activate user'}>
                    <IconButton
                      size="small"
                      onClick={() => handleToggleStatus(user.id, `${user.first_name} ${user.last_name}`, user.is_active)}
                      disabled={isUpdating}
                      sx={{ '&:hover': { bgcolor: user.is_active ? 'rgba(231,76,60,0.12)' : 'rgba(18,166,74,0.12)' } }}
                    >
                      {user.is_active
                        ? <BlockIcon fontSize="small" sx={{ color: '#E74C3C' }} />
                        : <CheckCircleIcon fontSize="small" sx={{ color: '#12A64A' }} />
                      }
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
              {idx < filteredUsers.length - 1 && <Divider sx={{ mx: 2 }} />}
            </React.Fragment>
          );
        })}

        {filteredUsers.length === 0 && (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <PeopleIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary" fontWeight={600}>No users match your filters.</Typography>
          </Box>
        )}
      </Paper>

      {/* ---- Confirmation Dialog ---- */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} PaperProps={{ sx: { borderRadius: 3, border: '1px solid', borderColor: 'divider', minWidth: 360 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {dialogAction === 'deactivate' ? '⛔ Deactivate User' : '✅ Activate User'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to {dialogAction} <strong>"{selectedUserName}"</strong>?
            {dialogAction === 'deactivate' && ' They will not be able to log in until reactivated.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ pb: 2, px: 3, gap: 1 }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined" sx={{ px: 3 }}>Cancel</Button>
          <Button
            onClick={confirmAction}
            variant="contained"
            color={dialogAction === 'deactivate' ? 'error' : 'success'}
            sx={{ px: 3 }}
          >
            {dialogAction === 'deactivate' ? 'Deactivate' : 'Activate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminUsersPage;
