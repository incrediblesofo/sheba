/**
 * Sheba Sound — Artist Revenue Page
 * ------------------------------------
 * Earnings dashboard with monthly breakdown, total/unpaid earnings,
 * revenue share info, and withdrawal functionality.
 * Uses real API data from the backend.
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Alert,
  LinearProgress,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Snackbar,
  Fade,
  Tooltip,
  IconButton,
} from '@mui/material';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import SendIcon from '@mui/icons-material/Send';
import HistoryIcon from '@mui/icons-material/History';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CloseIcon from '@mui/icons-material/Close';
import {
  useGetArtistEarningsQuery,
  useGetArtistAnalyticsQuery,
  useRequestWithdrawalMutation,
} from '@/features/music/musicApi';
import { formatStreamCount } from '@/utils/helpers';

const PAYMENT_METHODS = [
  { value: 'telebirr', label: 'TeleBirr', desc: 'Withdraw via TeleBirr mobile money' },
  { value: 'chapa', label: 'Chapa', desc: 'Withdraw via Chapa payment gateway' },
  { value: 'bank_transfer', label: 'Bank Transfer', desc: 'Direct bank account transfer' },
] as const;

const MINIMUM_WITHDRAWAL = 50;

const ArtistRevenuePage: React.FC = () => {
  const { data: earningsData, isLoading: earningsLoading } = useGetArtistEarningsQuery();
  const { data: analytics } = useGetArtistAnalyticsQuery();
  const [requestWithdrawal, { isLoading: withdrawLoading }] = useRequestWithdrawalMutation();

  // Withdrawal modal state
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('telebirr');
  const [accountDetails, setAccountDetails] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  if (earningsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress />
      </Box>
    );
  }

  const earnings = earningsData?.earnings ?? [];
  const totalEarnings = earningsData?.total_earnings ?? 0;
  const unpaidEarnings = earningsData?.unpaid_earnings ?? 0;
  const withdrawals = earningsData?.withdrawals ?? [];
  const hasPendingWithdrawal = earningsData?.has_pending_withdrawal ?? false;
  const monthlyStreams = analytics?.monthly_streams ?? [];
  const currentMonthStreams = monthlyStreams.length > 0
    ? monthlyStreams[monthlyStreams.length - 1].streams
    : 0;

  const maxEarnings = Math.max(...earnings.map((e) => e.earnings_usd), 1);

  const canWithdraw = unpaidEarnings >= MINIMUM_WITHDRAWAL && !hasPendingWithdrawal;

  const handleOpenWithdraw = () => {
    setAmount(unpaidEarnings.toFixed(2));
    setPaymentMethod('telebirr');
    setAccountDetails('');
    setWithdrawOpen(true);
  };

  const handleWithdraw = async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < MINIMUM_WITHDRAWAL) {
      setSnackbar({ open: true, message: `Minimum withdrawal is $${MINIMUM_WITHDRAWAL}.00`, severity: 'error' });
      return;
    }
    if (parsedAmount > unpaidEarnings) {
      setSnackbar({ open: true, message: 'Amount exceeds available balance.', severity: 'error' });
      return;
    }
    if (!accountDetails.trim()) {
      setSnackbar({ open: true, message: 'Please enter your account details.', severity: 'error' });
      return;
    }

    try {
      await requestWithdrawal({
        amount: parsedAmount,
        payment_method: paymentMethod as 'telebirr' | 'chapa' | 'bank_transfer',
        account_details: accountDetails.trim(),
      }).unwrap();
      setWithdrawOpen(false);
      setSnackbar({ open: true, message: 'Withdrawal request submitted! You will be notified once it is processed.', severity: 'success' });
    } catch (err: unknown) {
      const errorData = err as { data?: { detail?: string } };
      setSnackbar({
        open: true,
        message: errorData?.data?.detail || 'Failed to submit withdrawal request. Please try again.',
        severity: 'error',
      });
    }
  };

  const getWithdrawalStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircleOutlineIcon sx={{ fontSize: 16, color: '#1ED760' }} />;
      case 'approved': return <CheckCircleOutlineIcon sx={{ fontSize: 16, color: '#3498DB' }} />;
      case 'rejected': return <CancelOutlinedIcon sx={{ fontSize: 16, color: '#E74C3C' }} />;
      default: return <HourglassBottomIcon sx={{ fontSize: 16, color: '#F39C12' }} />;
    }
  };

  const getWithdrawalStatusColor = (status: string): 'success' | 'info' | 'error' | 'warning' => {
    switch (status) {
      case 'completed': return 'success';
      case 'approved': return 'info';
      case 'rejected': return 'error';
      default: return 'warning';
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Revenue & Earnings
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Track your income from streams, subscriptions, and payouts.
      </Typography>

      {/* ---- Summary Cards ---- */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Box sx={{ bgcolor: 'success.main', borderRadius: 2, p: 1, display: 'flex' }}>
                <AttachMoneyIcon sx={{ color: 'white', fontSize: 22 }} />
              </Box>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                Total Earnings (All Time)
              </Typography>
            </Box>
            <Typography variant="h4" fontWeight={800} color="success.main">
              ${totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              position: 'relative',
              overflow: 'hidden',
              border: canWithdraw ? '1px solid' : 'none',
              borderColor: canWithdraw ? 'warning.main' : 'transparent',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Box sx={{ bgcolor: 'warning.main', borderRadius: 2, p: 1, display: 'flex' }}>
                <AccountBalanceWalletIcon sx={{ color: 'white', fontSize: 22 }} />
              </Box>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                Pending Payout
              </Typography>
            </Box>
            <Typography variant="h4" fontWeight={800} color="warning.main" sx={{ mb: 1.5 }}>
              ${unpaidEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Typography>
            <Tooltip
              title={
                hasPendingWithdrawal
                  ? 'You have a pending withdrawal being processed'
                  : unpaidEarnings < MINIMUM_WITHDRAWAL
                    ? `Minimum withdrawal is $${MINIMUM_WITHDRAWAL}.00`
                    : 'Withdraw your earnings'
              }
              arrow
            >
              <span>
                <Button
                  id="withdraw-button"
                  variant="contained"
                  size="medium"
                  startIcon={<SendIcon />}
                  disabled={!canWithdraw || withdrawLoading}
                  onClick={handleOpenWithdraw}
                  sx={{
                    borderRadius: 2.5,
                    textTransform: 'none',
                    fontWeight: 700,
                    px: 3,
                    py: 1,
                    bgcolor: '#1ED760',
                    color: '#000',
                    boxShadow: canWithdraw
                      ? '0 4px 14px rgba(30, 215, 96, 0.4)'
                      : 'none',
                    '&:hover': {
                      bgcolor: '#1DB954',
                      boxShadow: '0 6px 20px rgba(30, 215, 96, 0.5)',
                    },
                    '&.Mui-disabled': {
                      bgcolor: 'action.disabledBackground',
                      color: 'text.disabled',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  {hasPendingWithdrawal ? 'Withdrawal Pending' : 'Withdraw'}
                </Button>
              </span>
            </Tooltip>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Box sx={{ bgcolor: 'primary.main', borderRadius: 2, p: 1, display: 'flex' }}>
                <TrendingUpIcon sx={{ color: 'white', fontSize: 22 }} />
              </Box>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                This Month's Streams
              </Typography>
            </Box>
            <Typography variant="h4" fontWeight={800} color="primary.main">
              {formatStreamCount(currentMonthStreams)}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* ---- Revenue Share Info ---- */}
      <Alert
        severity="info"
        icon={<InfoOutlinedIcon />}
        sx={{ mb: 4, borderRadius: 2 }}
      >
        <Typography variant="body2" fontWeight={600} gutterBottom>
          Revenue Share Model
        </Typography>
        <Typography variant="body2">
          Artists earn <strong>$0.004 per stream</strong> from free-tier listeners and{' '}
          <strong>$0.008 per stream</strong> from Premium subscribers. Subscription
          revenue is pooled and distributed proportionally based on stream share each
          month. Payments are processed within the first 5 days of each month.
        </Typography>
      </Alert>

      {/* ---- Monthly Earnings Bar Chart ---- */}
      {earnings.length > 0 && (
        <>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
            Monthly Earnings
          </Typography>
          <Paper sx={{ p: 3, borderRadius: 3, mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 200, overflowX: 'auto' }}>
              {earnings.slice().reverse().map((e) => {
                const heightPct = (e.earnings_usd / maxEarnings) * 100;
                const monthLabel = new Date(e.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                return (
                  <Box key={e.id} sx={{ flex: '1 0 50px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                      ${(e.earnings_usd / 1000).toFixed(1)}K
                    </Typography>
                    <Box
                      sx={{
                        width: '100%',
                        maxWidth: 44,
                        height: `${heightPct}%`,
                        minHeight: 8,
                        bgcolor: e.paid_out ? 'success.main' : 'warning.main',
                        borderRadius: '6px 6px 0 0',
                        opacity: e.paid_out ? 0.9 : 1,
                        transition: 'height 0.3s ease',
                        '&:hover': { opacity: 0.8 },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      {monthLabel}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 12, bgcolor: 'success.main', borderRadius: 0.5 }} />
                <Typography variant="caption" color="text.secondary">Paid out</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 12, height: 12, bgcolor: 'warning.main', borderRadius: 0.5 }} />
                <Typography variant="caption" color="text.secondary">Pending</Typography>
              </Box>
            </Box>
          </Paper>
        </>
      )}

      {/* ---- Earnings Table ---- */}
      {earnings.length > 0 ? (
        <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700 } }}>
                <TableCell>Month</TableCell>
                <TableCell align="right">Streams</TableCell>
                <TableCell align="right">Earnings (USD)</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell>Stream Share</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {earnings.map((e) => (
                <TableRow key={e.id} hover>
                  <TableCell>
                    {new Date(e.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </TableCell>
                  <TableCell align="right">{e.streams_count.toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    ${e.earnings_usd.toFixed(2)}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={e.paid_out ? 'Paid' : 'Pending'}
                      size="small"
                      color={e.paid_out ? 'success' : 'warning'}
                    />
                  </TableCell>
                  <TableCell sx={{ minWidth: 140 }}>
                    <LinearProgress
                      variant="determinate"
                      value={(e.earnings_usd / maxEarnings) * 100}
                      sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover' }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
          <MusicNoteIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography color="text.secondary">
            No earnings data yet. Start uploading and streaming to see your revenue here.
          </Typography>
        </Paper>
      )}

      {/* ---- Withdrawal History ---- */}
      {withdrawals.length > 0 && (
        <>
          <Divider sx={{ my: 4 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <HistoryIcon sx={{ color: 'text.secondary' }} />
            <Typography variant="h5" fontWeight={700}>
              Withdrawal History
            </Typography>
          </Box>
          <TableContainer component={Paper} sx={{ borderRadius: 3, mb: 4 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700 } }}>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell>Account</TableCell>
                  <TableCell align="center">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {withdrawals.map((w) => (
                  <TableRow key={w.id} hover>
                    <TableCell>
                      {new Date(w.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      ${Number(w.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={PAYMENT_METHODS.find(m => m.value === w.payment_method)?.label ?? w.payment_method}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {w.account_details}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={w.rejection_reason || ''} arrow disableHoverListener={!w.rejection_reason}>
                        <Chip
                          icon={getWithdrawalStatusIcon(w.status)}
                          label={w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                          size="small"
                          color={getWithdrawalStatusColor(w.status)}
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Divider sx={{ my: 4 }} />

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Questions about your earnings? Contact <strong>revenue@shebasound.com</strong>
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Minimum payout threshold: <strong>$50.00</strong>. Payments are made via TeleBirr, Chapa, or bank transfer.
      </Typography>

      {/* ---- Withdrawal Modal ---- */}
      <Dialog
        open={withdrawOpen}
        onClose={() => !withdrawLoading && setWithdrawOpen(false)}
        maxWidth="sm"
        fullWidth
        TransitionComponent={Fade}
        PaperProps={{
          sx: {
            borderRadius: 3,
            backgroundImage: 'linear-gradient(135deg, rgba(30,215,96,0.04) 0%, transparent 60%)',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                bgcolor: '#1ED760',
                borderRadius: 2,
                p: 1,
                display: 'flex',
                boxShadow: '0 4px 14px rgba(30, 215, 96, 0.3)',
              }}
            >
              <SendIcon sx={{ color: '#000', fontSize: 20 }} />
            </Box>
            <Typography variant="h6" fontWeight={700}>
              Withdraw Earnings
            </Typography>
          </Box>
          <IconButton onClick={() => setWithdrawOpen(false)} disabled={withdrawLoading} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ mb: 3, mt: 1 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 2.5,
                bgcolor: 'rgba(30, 215, 96, 0.08)',
                border: '1px solid rgba(30, 215, 96, 0.2)',
              }}
            >
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                Available Balance
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ color: '#1ED760' }}>
                ${unpaidEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Typography>
            </Paper>
          </Box>

          <TextField
            id="withdraw-amount"
            label="Withdrawal Amount (USD)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            fullWidth
            slotProps={{
              input: { startAdornment: <Typography sx={{ mr: 0.5, color: 'text.secondary', fontWeight: 700 }}>$</Typography> },
              htmlInput: { min: MINIMUM_WITHDRAWAL, max: unpaidEarnings, step: '0.01' },
            }}
            sx={{ mb: 2.5 }}
            helperText={`Minimum: $${MINIMUM_WITHDRAWAL}.00`}
          />

          <TextField
            id="withdraw-payment-method"
            select
            label="Payment Method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            fullWidth
            sx={{ mb: 2.5 }}
          >
            {PAYMENT_METHODS.map((m) => (
              <MenuItem key={m.value} value={m.value}>
                <Box>
                  <Typography fontWeight={600}>{m.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {m.desc}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </TextField>

          <TextField
            id="withdraw-account-details"
            label={
              paymentMethod === 'bank_transfer'
                ? 'Bank Account Number'
                : paymentMethod === 'telebirr'
                  ? 'TeleBirr Phone Number'
                  : 'Chapa Account / Phone Number'
            }
            value={accountDetails}
            onChange={(e) => setAccountDetails(e.target.value)}
            fullWidth
            placeholder={
              paymentMethod === 'bank_transfer'
                ? 'e.g. CBE 1000XXXXXXX'
                : 'e.g. +251 9XX XXX XXXX'
            }
            helperText="This will be used to process your payout"
            sx={{ mb: 1 }}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setWithdrawOpen(false)}
            disabled={withdrawLoading}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            id="confirm-withdraw-button"
            variant="contained"
            onClick={handleWithdraw}
            disabled={withdrawLoading}
            startIcon={withdrawLoading ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              px: 3,
              borderRadius: 2.5,
              bgcolor: '#1ED760',
              color: '#000',
              '&:hover': { bgcolor: '#1DB954' },
            }}
          >
            {withdrawLoading ? 'Processing...' : 'Confirm Withdrawal'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---- Snackbar ---- */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ borderRadius: 2, fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ArtistRevenuePage;
