/**
 * Sheba Sound — Audio Ad Overlay (Interstitial)
 * -----------------------------------------------
 * Shown every N songs for free users as a brief interstitial.
 * Premium users never see this.
 * Auto-dismisses after a countdown or can be dismissed manually.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  LinearProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import StarIcon from "@mui/icons-material/Star";
import HeadphonesIcon from "@mui/icons-material/Headphones";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/utils/constants";

interface AudioAdOverlayProps {
  /** Whether the overlay is visible. */
  open: boolean;
  /** Called when the overlay should close (countdown finished or dismissed). */
  onClose: () => void;
  /** Countdown duration in seconds. */
  countdownSeconds?: number;
}

const AudioAdOverlay: React.FC<AudioAdOverlayProps> = ({
  open,
  onClose,
  countdownSeconds = 5,
}) => {
  const [remaining, setRemaining] = useState(countdownSeconds);
  const navigate = useNavigate();
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      setRemaining(countdownSeconds);
      return;
    }

    setRemaining(countdownSeconds);
    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onCloseRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, countdownSeconds]);

  const handleUpgrade = useCallback(() => {
    onClose();
    navigate(ROUTES.LISTENER_SUBSCRIPTION);
  }, [onClose, navigate]);

  if (!open) return null;

  const progress = ((countdownSeconds - remaining) / countdownSeconds) * 100;

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(8px)",
        animation: "fadeIn 0.3s ease",
        "@keyframes fadeIn": {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
      }}
    >
      <Box
        sx={{
          maxWidth: 400,
          width: "90%",
          bgcolor: "background.paper",
          borderRadius: 3,
          p: 4,
          textAlign: "center",
          position: "relative",
          boxShadow: "0 24px 48px rgba(0,0,0,0.3)",
        }}
      >
        {/* Close button (available immediately) */}
        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            color: "text.disabled",
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        {/* Icon */}
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            bgcolor: "rgba(243,156,18,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 2,
          }}
        >
          <HeadphonesIcon sx={{ fontSize: 36, color: "#F39C12" }} />
        </Box>

        <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>
          Enjoying Sheba Sound?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Upgrade to Premium for uninterrupted, ad-free listening with
          high-quality audio and offline downloads.
        </Typography>

        <Button
          variant="contained"
          fullWidth
          startIcon={<StarIcon />}
          onClick={handleUpgrade}
          sx={{
            bgcolor: "#F39C12",
            color: "#000",
            fontWeight: 700,
            borderRadius: 99,
            py: 1.2,
            mb: 2,
            "&:hover": { bgcolor: "#E67E22" },
          }}
        >
          Upgrade to Premium — 99.99 ETB/mo
        </Button>

        {/* Auto-dismiss countdown */}
        <Box sx={{ mb: 1 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 3,
              borderRadius: 99,
              bgcolor: "action.hover",
              "& .MuiLinearProgress-bar": {
                borderRadius: 99,
                bgcolor: "text.disabled",
              },
            }}
          />
        </Box>
        <Typography variant="caption" color="text.disabled">
          Resuming in {remaining}s...
        </Typography>
      </Box>
    </Box>
  );
};

export default AudioAdOverlay;
