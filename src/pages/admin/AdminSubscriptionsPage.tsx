/**
 * Sheba Sound — Admin Subscriptions Page (Premium Redesign)
 * -----------------------------------------------------------
 * Premium subscriptions overview with summary stats, revenue gauge,
 * and styled subscription records with provider badges.
 * Uses real API data from the admin dashboard backend.
 */

import React from 'react';
import {
  Box, Typography, Paper, Grid, Chip, Avatar,
  Stack, Divider, CircularProgress,
} from '@mui/material';
import CardMembershipIcon from '@mui/icons-material/CardMembership';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useGetAdminSubscriptionsQuery } from '@/features/music/musicApi';

const providerStyle = (p: string): { color: string; bg: string; label: string } => {
  switch (p) {
    case 'telebirr': return { color: '#3498DB', bg: 'rgba(52,152,219,0.15)', label: 'Telebirr' };
    case 'chapa':    return { color: '#9B59B6', bg: 'rgba(155,89,182,0.15)', label: 'Chapa' };
    default:         return { color: '#7F8C8D', bg: 'rgba(127,140,141,0.15)', label: 'Manual' };
  }
};

/* ---- Mini stat card ---- */
interface StatProps { icon: React.ReactNode; value: string | number; label: string; color: string; gradient: string }
const StatCard: React.FC<StatProps> = ({ icon, value, label, color, gradient }) => (
  <Paper
    sx={{
      p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider',
      background: (t) => t.palette.mode === 'dark' ? 'rgba(22,22,31,0.8)' : '#fff',
      position: 'relative', overflow: 'hidden',
      transition: 'all 0.2s ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' },
    }}
  >
    <Box sx={{ position: 'absolute', top: -20, right: -20, width: 90, height: 90, borderRadius: '50%', background: gradient, opacity: 0.2, filter: 'blur(24px)', pointerEvents: 'none' }} />
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
      <Box sx={{ width: 44, height: 44, borderRadius: 2, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="h4" fontWeight={800} sx={{ color, lineHeight: 1 }}>{value}</Typography>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>{label}</Typography>
      </Box>
    </Box>
  </Paper>
);

/* ------------------------------------------------------------------ */

const AdminSubscriptionsPage: React.FC = () => {
  const { data: subscriptions = [], isLoading } = useGetAdminSubscriptionsQuery();

  const activeSubs  = subscriptions.filter((s) => s.is_active);
  const expiredSubs = subscriptions.filter((s) => !s.is_active);
  const monthlyRevenue = activeSubs.length * 149;
  const totalRevenue   = subscriptions.length * 149;

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
      <Box
        sx={{
          p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(243,156,18,0.15) 0%, rgba(18,166,74,0.08) 100%)',
          border: '1px solid rgba(243,156,18,0.25)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(243,156,18,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CardMembershipIcon sx={{ color: '#F39C12' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800}>Subscriptions</Typography>
            <Typography variant="caption" color="text.secondary">
              Manage and monitor premium subscriptions on Sheba Sound.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ---- Summary Cards ---- */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 6, sm: 4 }}>
          <StatCard icon={<CardMembershipIcon />} value={activeSubs.length}                  label="Active Subscriptions"  color="#1ED760" gradient="linear-gradient(135deg, #12A64A, #078930)" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <StatCard icon={<CancelIcon />}         value={expiredSubs.length}                 label="Expired"               color="#E74C3C" gradient="linear-gradient(135deg, #E74C3C, #C0392B)" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard icon={<AttachMoneyIcon />}    value={`${monthlyRevenue.toLocaleString()} ETB`} label="Monthly Revenue"  color="#F39C12" gradient="linear-gradient(135deg, #F39C12, #D68910)" />
        </Grid>
      </Grid>

      {/* ---- Revenue Progress ---- */}
      <Paper sx={{ p: 3, borderRadius: 3, mb: 4, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>Revenue Overview</Typography>
            <Typography variant="caption" color="text.secondary">Based on 149 ETB/month per Premium sub</Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h5" fontWeight={800} sx={{ color: '#1ED760' }}>{totalRevenue.toLocaleString()} ETB</Typography>
            <Typography variant="caption" color="text.secondary">All-time total</Typography>
          </Box>
        </Box>
        {/* Provider breakdown */}
        <Stack spacing={1.5}>
          {['telebirr', 'chapa', 'manual'].map((p) => {
            const count = subscriptions.filter((s) => s.payment_provider === p).length;
            const pct   = subscriptions.length > 0 ? Math.round((count / subscriptions.length) * 100) : 0;
            const ps    = providerStyle(p);
            return (
              <Box key={p}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" fontWeight={600} sx={{ color: ps.color, textTransform: 'capitalize' }}>{ps.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{count} users · {pct}%</Typography>
                </Box>
                <Box sx={{ height: 8, borderRadius: 99, bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                  <Box sx={{ width: `${pct}%`, height: '100%', borderRadius: 99, bgcolor: ps.color, transition: 'width 0.5s cubic-bezier(0.25,0.8,0.25,1)' }} />
                </Box>
              </Box>
            );
          })}
        </Stack>
      </Paper>

      {/* ---- Subscription Records ---- */}
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>All Records</Typography>
      <Paper sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
        {/* Header row */}
        <Box sx={{ px: 2.5, py: 1.25, bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.6rem' }}>
            User · Provider · Dates · Status
          </Typography>
        </Box>

        {subscriptions.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CardMembershipIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary" fontWeight={600}>No subscriptions yet.</Typography>
          </Box>
        ) : (
          subscriptions.map((sub, idx) => {
            const ps = providerStyle(sub.payment_provider);
            return (
              <React.Fragment key={sub.id}>
                <Box sx={{ px: { xs: 1.5, sm: 2.5 }, py: 1.5, display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, flexWrap: { xs: 'wrap', sm: 'nowrap' }, '&:hover': { bgcolor: 'action.hover' }, transition: 'background-color 0.15s' }}>
                  <Avatar
                    sx={{
                      width: 40, height: 40, flexShrink: 0,
                      bgcolor: sub.is_active ? 'rgba(18,166,74,0.15)' : 'rgba(127,140,141,0.12)',
                      color: sub.is_active ? '#1ED760' : '#7F8C8D',
                    }}
                  >
                    <CardMembershipIcon fontSize="small" />
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight={700} noWrap>User {sub.user.toString().slice(0, 8)}</Typography>
                      <Chip label="PREMIUM" size="small" sx={{ height: 16, fontSize: '0.55rem', fontWeight: 800, bgcolor: 'rgba(252,221,9,0.12)', color: '#FCDD09', letterSpacing: '0.05em' }} />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(sub.start_date).toLocaleDateString()} → {new Date(sub.end_date).toLocaleDateString()} · Ref: {sub.transaction_ref ?? 'N/A'}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                    <Box sx={{ px: 1.5, py: 0.35, borderRadius: 99, bgcolor: ps.bg, border: `1px solid ${ps.color}44` }}>
                      <Typography variant="caption" fontWeight={700} sx={{ color: ps.color }}>{ps.label}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 0.35, borderRadius: 99, bgcolor: sub.is_active ? 'rgba(18,166,74,0.12)' : 'rgba(127,140,141,0.12)' }}>
                      {sub.is_active
                        ? <CheckCircleIcon sx={{ fontSize: 12, color: '#1ED760' }} />
                        : <CancelIcon sx={{ fontSize: 12, color: '#7F8C8D' }} />
                      }
                      <Typography variant="caption" fontWeight={700} sx={{ color: sub.is_active ? '#1ED760' : '#7F8C8D' }}>
                        {sub.is_active ? 'Active' : 'Expired'}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
                {idx < subscriptions.length - 1 && <Divider sx={{ mx: 2.5 }} />}
              </React.Fragment>
            );
          })
        )}
      </Paper>
    </Box>
  );
};

export default AdminSubscriptionsPage;
