/**
 * Sheba Sound — Payment Return Page
 * ------------------------------------
 * Landing page after Chapa/Telebirr payment redirect.
 * Reads tx_ref from URL params, polls the verify endpoint,
 * and shows success/failure status with smooth animations.
 */

import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Button,
  Fade,
  Grow,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import { useVerifyPaymentQuery } from "@/features/music/musicApi";
import { ROUTES } from "@/utils/constants";

type PaymentState = "verifying" | "success" | "pending" | "failed";

const PaymentReturnPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const txRef = searchParams.get("tx_ref") ?? "";
  const provider = searchParams.get("provider") ?? "chapa";

  const [paymentState, setPaymentState] = useState<PaymentState>("verifying");
  const [pollCount, setPollCount] = useState(0);

  const {
    data: verifyData,
    isLoading,
    refetch,
  } = useVerifyPaymentQuery(txRef, {
    skip: !txRef,
  });

  // Poll for payment status (up to 10 times, every 3s)
  useEffect(() => {
    if (!txRef) {
      setPaymentState("failed");
      return;
    }

    if (verifyData) {
      const status = verifyData.status;
      if (status === "completed") {
        setPaymentState("success");
        return;
      }
      if (status === "failed") {
        setPaymentState("failed");
        return;
      }
      // Still pending — poll again
      if (pollCount < 10) {
        const timer = setTimeout(() => {
          setPollCount((c) => c + 1);
          refetch();
        }, 3000);
        return () => clearTimeout(timer);
      }
      setPaymentState("pending");
    }
  }, [verifyData, txRef, pollCount, refetch]);

  // Show loading while first verify call is in progress
  useEffect(() => {
    if (isLoading) {
      setPaymentState("verifying");
    }
  }, [isLoading]);

  const stateConfig: Record<
    PaymentState,
    {
      icon: React.ReactNode;
      title: string;
      message: string;
      color: string;
      bgGradient: string;
    }
  > = {
    verifying: {
      icon: <CircularProgress size={64} sx={{ color: "primary.main" }} />,
      title: "Verifying Payment...",
      message: `Confirming your ${provider === "telebirr" ? "Telebirr" : "Chapa"} payment. This may take a moment.`,
      color: "primary.main",
      bgGradient: "linear-gradient(135deg, rgba(33,150,243,0.05) 0%, rgba(33,150,243,0.1) 100%)",
    },
    success: {
      icon: (
        <CheckCircleOutlineIcon
          sx={{ fontSize: 80, color: "success.main" }}
        />
      ),
      title: "Payment Successful! 🎉",
      message:
        "Welcome to Sheba Sound Premium! Enjoy ad-free listening, high-quality audio, and unlimited playlists.",
      color: "success.main",
      bgGradient: "linear-gradient(135deg, rgba(76,175,80,0.05) 0%, rgba(76,175,80,0.1) 100%)",
    },
    pending: {
      icon: (
        <HourglassTopIcon sx={{ fontSize: 80, color: "warning.main" }} />
      ),
      title: "Payment Processing",
      message:
        "Your payment is being processed. This can take a few minutes. You'll be upgraded automatically once confirmed.",
      color: "warning.main",
      bgGradient: "linear-gradient(135deg, rgba(255,152,0,0.05) 0%, rgba(255,152,0,0.1) 100%)",
    },
    failed: {
      icon: (
        <ErrorOutlineIcon sx={{ fontSize: 80, color: "error.main" }} />
      ),
      title: "Payment Failed",
      message:
        "We couldn't confirm your payment. This could be due to a cancelled transaction or a network issue. Please try again.",
      color: "error.main",
      bgGradient: "linear-gradient(135deg, rgba(244,67,54,0.05) 0%, rgba(244,67,54,0.1) 100%)",
    },
  };

  const config = stateConfig[paymentState];

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
        px: 2,
      }}
    >
      <Fade in timeout={600}>
        <Paper
          sx={{
            p: { xs: 4, sm: 6 },
            borderRadius: 4,
            textAlign: "center",
            maxWidth: 520,
            width: "100%",
            background: config.bgGradient,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Grow in timeout={800}>
            <Box sx={{ mb: 3 }}>{config.icon}</Box>
          </Grow>

          <Typography
            variant="h4"
            fontWeight={800}
            sx={{ mb: 1.5, color: config.color }}
          >
            {config.title}
          </Typography>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4, maxWidth: 400, mx: "auto" }}
          >
            {config.message}
          </Typography>

          {paymentState === "success" && (
            <Box sx={{ mb: 3 }}>
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1,
                  bgcolor: "success.main",
                  color: "white",
                  px: 3,
                  py: 1,
                  borderRadius: 8,
                  mb: 2,
                }}
              >
                <MusicNoteIcon fontSize="small" />
                <Typography variant="body2" fontWeight={700}>
                  Premium Active
                </Typography>
              </Box>
            </Box>
          )}

          {txRef && (
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ display: "block", mb: 3 }}
            >
              Transaction: {txRef}
            </Typography>
          )}

          <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
            {paymentState === "success" && (
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate(ROUTES.LISTENER_HOME)}
                sx={{ borderRadius: 3, px: 4 }}
              >
                Start Listening
              </Button>
            )}

            {paymentState === "failed" && (
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate(ROUTES.LISTENER_SUBSCRIPTION)}
                sx={{ borderRadius: 3, px: 4 }}
              >
                Try Again
              </Button>
            )}

            {paymentState === "pending" && (
              <>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setPollCount(0);
                    refetch();
                    setPaymentState("verifying");
                  }}
                  sx={{ borderRadius: 3 }}
                >
                  Check Again
                </Button>
                <Button
                  variant="contained"
                  onClick={() => navigate(ROUTES.LISTENER_HOME)}
                  sx={{ borderRadius: 3 }}
                >
                  Go to Home
                </Button>
              </>
            )}

            {(paymentState === "success" || paymentState === "failed") && (
              <Button
                variant="outlined"
                onClick={() => navigate(ROUTES.LISTENER_SUBSCRIPTION)}
                sx={{ borderRadius: 3 }}
              >
                Subscription Settings
              </Button>
            )}
          </Box>
        </Paper>
      </Fade>
    </Box>
  );
};

export default PaymentReturnPage;
