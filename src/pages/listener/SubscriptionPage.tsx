/**
 * Sheba Sound — Listener Subscription Page
 * ------------------------------------------
 * Real payment integration with Chapa Inline.js payment form.
 * Shows current plan status, upgrade flow, and subscription management.
 *
 * Payment flow:
 * 1. User clicks "Get Premium"
 * 2. Backend initializes transaction with Chapa API → gets tx_ref
 * 3. Frontend renders Chapa Inline.js form directly in a dialog
 * 4. User enters phone number, selects payment method, pays
 * 5. Chapa processes the payment inline (no redirect needed)
 * 6. On success, frontend navigates to payment return page for verification
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Alert,
  Divider,
  Skeleton,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import StarIcon from "@mui/icons-material/Star";
import PaymentIcon from "@mui/icons-material/Payment";
import AutoRenewIcon from "@mui/icons-material/Autorenew";
import EventIcon from "@mui/icons-material/Event";
import { useAppDispatch } from "@/app/hooks";
import { showSnackbar } from "@/features/ui/uiSlice";
import { ROUTES } from "@/utils/constants";
import { initChapaInline } from "@/utils/chapaCheckout";
import {
  useGetCurrentSubscriptionQuery,
  useInitiatePaymentMutation,
  useCancelSubscriptionMutation,
} from "@/features/music/musicApi";

interface PlanFeature {
  text: string;
  included: boolean;
}

const freePlanFeatures: PlanFeature[] = [
  { text: "Access to full music catalog", included: true },
  { text: "Ad-supported streaming", included: true },
  { text: "Standard audio quality", included: true },
  { text: "Create up to 3 playlists", included: true },
  { text: "Offline downloads", included: false },
  { text: "Ad-free listening", included: false },
  { text: "High-quality audio (320kbps)", included: false },
  { text: "Unlimited playlists", included: false },
];

const premiumFeatures: PlanFeature[] = [
  { text: "Access to full music catalog", included: true },
  { text: "Ad-free listening", included: true },
  { text: "High-quality audio (320kbps)", included: true },
  { text: "Unlimited playlists", included: true },
  { text: "Offline downloads", included: true },
  { text: "Early access to new releases", included: true },
  { text: "Lyrics display", included: true },
  { text: "Priority support", included: true },
];

const CHAPA_INLINE_CONTAINER_ID = "chapa-inline-form";

const SubscriptionPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [chapaDialogOpen, setChapaDialogOpen] = useState(false);
  const [chapaLoading, setChapaLoading] = useState(false);
  const chapaInitialized = useRef(false);
  const currentTxRef = useRef<string>("");
  const currentAmount = useRef<string>("");

  const MONTHLY_PRICE = 99.99;
  const YEARLY_PRICE = 1000;
  const YEARLY_MONTHLY_EQUIVALENT = MONTHLY_PRICE * 12; // 1,199.88
  const YEARLY_SAVINGS = Math.round(YEARLY_MONTHLY_EQUIVALENT - YEARLY_PRICE); // ~200
  const displayPrice = billingPeriod === "monthly" ? MONTHLY_PRICE : YEARLY_PRICE;

  // If Chapa redirects here with tx_ref params (instead of /subscription/return),
  // forward to the payment return page to properly verify the transaction.
  useEffect(() => {
    const txRef = searchParams.get("tx_ref") || searchParams.get("trx_ref");
    if (txRef) {
      const provider = searchParams.get("provider") || "chapa";
      navigate(
        `${ROUTES.LISTENER_PAYMENT_RETURN}?tx_ref=${encodeURIComponent(txRef)}&provider=${encodeURIComponent(provider)}`,
        { replace: true }
      );
    }
  }, [searchParams, navigate]);

  const {
    data: currentSub,
    isLoading: subLoading,
    refetch: refetchSub,
  } = useGetCurrentSubscriptionQuery();

  const [initiatePayment, { isLoading: initiating }] = useInitiatePaymentMutation();
  const [cancelSubscription, { isLoading: cancelling }] = useCancelSubscriptionMutation();

  const currentPlan = currentSub?.tier ?? "free";
  const subscription = currentSub?.subscription;

  const handleUpgradeClick = (period: "monthly" | "yearly"): void => {
    setBillingPeriod(period);
    setPaymentDialogOpen(true);
  };

  // Initialize Chapa inline form once the dialog is open and container is in DOM
  const initializeChapa = useCallback(async () => {
    if (chapaInitialized.current || !currentTxRef.current) return;

    const publicKey = import.meta.env.VITE_CHAPA_PUBLIC_KEY;
    if (!publicKey) {
      dispatch(
        showSnackbar({
          message: "Payment configuration error. Please contact support.",
          severity: "error",
        })
      );
      return;
    }

    const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
    const frontendUrl = window.location.origin;

    chapaInitialized.current = true;

    await initChapaInline({
      publicKey,
      amount: currentAmount.current || String(displayPrice),
      txRef: currentTxRef.current,
      callbackUrl: `${backendBaseUrl}/subscriptions/webhooks/chapa/`,
      returnUrl: `${frontendUrl}${ROUTES.LISTENER_PAYMENT_RETURN}?tx_ref=${encodeURIComponent(currentTxRef.current)}&provider=chapa`,
      containerId: CHAPA_INLINE_CONTAINER_ID,
      onSuccess: (_data, _refId) => {
        setChapaDialogOpen(false);
        chapaInitialized.current = false;
        // Navigate to verify the payment
        navigate(
          `${ROUTES.LISTENER_PAYMENT_RETURN}?tx_ref=${encodeURIComponent(currentTxRef.current)}&provider=chapa`,
        );
      },
      onFailure: (error) => {
        dispatch(
          showSnackbar({
            message: `Payment failed: ${error}`,
            severity: "error",
          })
        );
      },
      onClose: () => {
        // User closed the success popup — verify anyway
        setChapaDialogOpen(false);
        chapaInitialized.current = false;
        if (currentTxRef.current) {
          navigate(
            `${ROUTES.LISTENER_PAYMENT_RETURN}?tx_ref=${encodeURIComponent(currentTxRef.current)}&provider=chapa`,
          );
        }
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, displayPrice, navigate]);

  // When the chapa dialog opens, wait for DOM then initialize
  useEffect(() => {
    if (chapaDialogOpen && !chapaInitialized.current) {
      // Small delay to ensure the dialog DOM has rendered
      const timer = setTimeout(() => {
        initializeChapa();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [chapaDialogOpen, initializeChapa]);

  const handlePaymentConfirm = async (): Promise<void> => {
    try {
      setChapaLoading(true);
      const result = await initiatePayment({
        payment_provider: "chapa",
        tier: "premium",
        billing_period: billingPeriod,
      }).unwrap();

      setPaymentDialogOpen(false);

      if (result.tx_ref) {
        currentTxRef.current = result.tx_ref;
        currentAmount.current = result.amount || String(displayPrice);
        chapaInitialized.current = false;
        // Open the Chapa inline dialog
        setChapaDialogOpen(true);
      } else {
        dispatch(
          showSnackbar({
            message: "Payment initialization failed. Please try again.",
            severity: "error",
          })
        );
      }
    } catch (err: unknown) {
      const error = err as { data?: { error?: string } };
      dispatch(
        showSnackbar({
          message: error?.data?.error ?? "Failed to start payment. Please try again.",
          severity: "error",
        })
      );
    } finally {
      setChapaLoading(false);
    }
  };

  const handleCancelSubscription = async (): Promise<void> => {
    try {
      const result = await cancelSubscription({ confirm: true }).unwrap();
      setCancelDialogOpen(false);
      refetchSub();
      dispatch(
        showSnackbar({
          message: result.message,
          severity: "info",
        })
      );
    } catch {
      dispatch(
        showSnackbar({
          message: "Failed to cancel subscription. Please try again.",
          severity: "error",
        })
      );
    }
  };

  const handleCloseChapaDialog = () => {
    setChapaDialogOpen(false);
    chapaInitialized.current = false;
  };

  if (subLoading) {
    return (
      <Box>
        <Skeleton variant="text" width={300} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={450} height={24} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={400} sx={{ maxWidth: 1200 }} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Subscription
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
        Choose the plan that's right for you.
      </Typography>

      {/* ---- Current Plan Status ---- */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4, flexWrap: "wrap" }}>
        <Chip
          label={`Current Plan: ${currentPlan === "premium" ? "Premium" : "Free"}`}
          color={currentPlan === "premium" ? "primary" : "default"}
          sx={{ fontWeight: 600 }}
        />
        {subscription && currentPlan === "premium" && (
          <>
            <Chip
              icon={<EventIcon />}
              label={`Expires: ${new Date(subscription.end_date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}`}
              variant="outlined"
              size="small"
            />
            <Chip
              icon={<AutoRenewIcon />}
              label={subscription.auto_renew ? "Auto-renewal: On" : "Auto-renewal: Off"}
              variant="outlined"
              size="small"
              color={subscription.auto_renew ? "success" : "default"}
            />
            {subscription.days_remaining <= 7 && subscription.days_remaining > 0 && (
              <Alert severity="warning" sx={{ py: 0, px: 1.5 }}>
                {subscription.days_remaining} day{subscription.days_remaining !== 1 ? "s" : ""} remaining
              </Alert>
            )}
          </>
        )}
      </Box>

      <Grid container spacing={3} sx={{ maxWidth: 1200 }}>
        {/* ---- Free Plan ---- */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper
            sx={{
              p: { xs: 2.5, sm: 3 },
              borderRadius: 3,
              border: currentPlan === "free" ? "2px solid" : "1px solid",
              borderColor: currentPlan === "free" ? "primary.main" : "divider",
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Free
            </Typography>
            <Typography variant="h3" fontWeight={800} sx={{ mb: 0.5 }}>
              0 ETB
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              forever
            </Typography>

            <List dense sx={{ flex: 1 }}>
              {freePlanFeatures.map((f) => (
                <ListItem key={f.text} disableGutters sx={{ py: 0.3 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {f.included ? (
                      <CheckCircleIcon fontSize="small" color="success" />
                    ) : (
                      <CancelIcon fontSize="small" color="disabled" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={f.text}
                    primaryTypographyProps={{
                      variant: "body2",
                      color: f.included ? "text.primary" : "text.disabled",
                    }}
                  />
                </ListItem>
              ))}
            </List>

            <Button
              variant="outlined"
              fullWidth
              disabled={currentPlan === "free"}
              sx={{ mt: 2 }}
            >
              {currentPlan === "free" ? "Current Plan" : "Downgrade"}
            </Button>
          </Paper>
        </Grid>

        {/* ---- Premium Monthly ---- */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper
            sx={{
              p: { xs: 2.5, sm: 3 },
              borderRadius: 3,
              border: currentPlan === "premium" ? "2px solid" : "1px solid",
              borderColor:
                currentPlan === "premium" ? "primary.main" : "divider",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              overflow: "visible",
            }}
          >
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Premium Monthly
            </Typography>
            <Typography variant="h3" fontWeight={800} sx={{ mb: 0.5 }}>
              {MONTHLY_PRICE.toFixed(2)} ETB
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              per month
            </Typography>

            <List dense sx={{ flex: 1 }}>
              {premiumFeatures.map((f) => (
                <ListItem key={f.text} disableGutters sx={{ py: 0.3 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckCircleIcon fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary={f.text}
                    primaryTypographyProps={{ variant: "body2" }}
                  />
                </ListItem>
              ))}
            </List>

            {currentPlan === "premium" ? (
              <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
                <Button variant="contained" fullWidth disabled>
                  Current Plan
                </Button>
                {subscription?.auto_renew && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => setCancelDialogOpen(true)}
                    sx={{ whiteSpace: "nowrap" }}
                  >
                    Cancel
                  </Button>
                )}
              </Box>
            ) : (
              <Button
                variant="contained"
                fullWidth
                onClick={() => handleUpgradeClick("monthly")}
                sx={{ mt: 2 }}
              >
                Get Monthly Premium
              </Button>
            )}
          </Paper>
        </Grid>

        {/* ---- Premium Yearly ---- */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper
            sx={{
              p: { xs: 2.5, sm: 3 },
              borderRadius: 3,
              border: currentPlan === "premium" ? "2px solid" : "1px solid",
              borderColor:
                currentPlan === "premium" ? "primary.main" : "divider",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              overflow: "visible",
            }}
          >
            {/* Best Value badge */}
            <Chip
              icon={<StarIcon sx={{ fontSize: 16 }} />}
              label="Best Value"
              color="success"
              size="small"
              sx={{
                position: "absolute",
                top: -12,
                right: 16,
                fontWeight: 700,
              }}
            />

            <Typography variant="h5" fontWeight={700} gutterBottom>
              Premium Yearly
            </Typography>
            <Typography variant="h3" fontWeight={800} sx={{ mb: 0.5 }}>
              {YEARLY_PRICE.toLocaleString()} ETB
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              per year
            </Typography>

            {/* Discount callout */}
            <Box sx={{ mb: 2 }}>
              <Chip
                label={`Save ${YEARLY_SAVINGS} ETB`}
                color="success"
                size="small"
                sx={{ fontWeight: 700, mb: 0.5 }}
              />
              <Typography variant="caption" color="text.secondary" display="block">
                Instead of{" "}
                <Typography
                  component="span"
                  variant="caption"
                  sx={{ textDecoration: "line-through", fontWeight: 600 }}
                >
                  {YEARLY_MONTHLY_EQUIVALENT.toFixed(2)} ETB
                </Typography>
                {" "}if paid monthly
              </Typography>
            </Box>

            <List dense sx={{ flex: 1 }}>
              {premiumFeatures.map((f) => (
                <ListItem key={f.text} disableGutters sx={{ py: 0.3 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckCircleIcon fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary={f.text}
                    primaryTypographyProps={{ variant: "body2" }}
                  />
                </ListItem>
              ))}
            </List>

            {currentPlan === "premium" ? (
              <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
                <Button variant="contained" fullWidth disabled>
                  Current Plan
                </Button>
                {subscription?.auto_renew && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => setCancelDialogOpen(true)}
                    sx={{ whiteSpace: "nowrap" }}
                  >
                    Cancel
                  </Button>
                )}
              </Box>
            ) : (
              <Button
                variant="contained"
                color="success"
                fullWidth
                onClick={() => handleUpgradeClick("yearly")}
                sx={{ mt: 2 }}
              >
                Get Yearly Premium
              </Button>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* ---- Payment Methods Info ---- */}
      <Paper sx={{ p: 3, borderRadius: 3, mt: 4, maxWidth: 1200 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Payment Methods
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Sheba Sound supports <strong>Chapa</strong> for seamless Ethiopian payment processing. Your
          subscription will auto-renew based on your chosen plan. Cancel anytime from this page.
        </Typography>
      </Paper>

      {/* ---- Payment Method Selection Dialog ---- */}
      <Dialog
        open={paymentDialogOpen}
        onClose={() => !initiating && !chapaLoading && setPaymentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Choose Payment Method
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Select your preferred payment gateway to complete your Premium
            subscription ({billingPeriod === "monthly" ? `${MONTHLY_PRICE.toFixed(2)} ETB/month` : `${YEARLY_PRICE.toLocaleString()} ETB/year`}).
          </DialogContentText>

          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 1.5,
              borderRadius: 2,
              borderColor: "primary.main",
              borderWidth: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <PaymentIcon color="primary" />
              <Box>
                <Typography fontWeight={600}>Chapa</Typography>
                <Typography variant="caption" color="text.secondary">
                  Pay with Telebirr, CBEBirr, M-Pesa, or other mobile wallets
                </Typography>
              </Box>
            </Box>
          </Paper>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Premium Subscription
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
            </Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: billingPeriod === "yearly" ? 1 : 0 }}>
            <Typography variant="body2" color="text.secondary">
              Billing Period
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {billingPeriod === "monthly" ? "Monthly (30 days)" : "Yearly (365 days)"}
            </Typography>
          </Box>
          {billingPeriod === "yearly" && (
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="body2" color="success.main" fontWeight={600}>
                You save
              </Typography>
              <Typography variant="body2" color="success.main" fontWeight={700}>
                {YEARLY_SAVINGS} ETB vs monthly billing
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setPaymentDialogOpen(false)}
            disabled={initiating || chapaLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePaymentConfirm}
            variant="contained"
            disabled={initiating || chapaLoading}
            startIcon={
              (initiating || chapaLoading) ? <CircularProgress size={18} color="inherit" /> : null
            }
          >
            {(initiating || chapaLoading) ? "Preparing..." : `Pay ${displayPrice.toLocaleString()} ETB via Chapa`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---- Chapa Inline Payment Dialog ---- */}
      <Dialog
        open={chapaDialogOpen}
        onClose={handleCloseChapaDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: "visible",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          Complete Payment
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter your phone number and select your preferred payment method below.
            You'll receive a payment prompt on your phone.
          </Typography>

          <Alert severity="info" sx={{ mb: 2.5 }}>
            <strong>{displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB</strong> — Premium {billingPeriod === "monthly" ? "Monthly" : "Yearly"} Subscription
          </Alert>

          {/* Chapa Inline.js renders its form here */}
          <Box
            id={CHAPA_INLINE_CONTAINER_ID}
            sx={{
              minHeight: 200,
              "& .chapa-phone-input-wrapper": {
                borderRadius: "10px",
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseChapaDialog} color="inherit">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---- Cancel Subscription Dialog ---- */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => !cancelling && setCancelDialogOpen(false)}
      >
        <DialogTitle>Cancel Auto-Renewal?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Your premium access will remain active until{" "}
            <strong>
              {subscription
                ? new Date(subscription.end_date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : "the end of your billing cycle"}
            </strong>
            . After that, you'll be downgraded to the Free plan.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setCancelDialogOpen(false)}
            disabled={cancelling}
          >
            Keep Premium
          </Button>
          <Button
            onClick={handleCancelSubscription}
            color="error"
            variant="contained"
            disabled={cancelling}
            startIcon={
              cancelling ? <CircularProgress size={18} color="inherit" /> : null
            }
          >
            {cancelling ? "Cancelling..." : "Cancel Subscription"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SubscriptionPage;
