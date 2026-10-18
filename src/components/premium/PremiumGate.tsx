/**
 * Sheba Sound — Premium Gate Component
 * --------------------------------------
 * Wraps content that requires premium. Shows an upgrade prompt
 * with lock overlay for free users.
 */

import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import StarIcon from '@mui/icons-material/Star';
import { useNavigate } from 'react-router-dom';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { ROUTES } from '@/utils/constants';

interface PremiumGateProps {
  children: React.ReactNode;
  /** Custom message for the upgrade prompt. */
  message?: string;
  /** If true, renders nothing for free users instead of a lock overlay. */
  hideInstead?: boolean;
}

const PremiumGate: React.FC<PremiumGateProps> = ({
  children,
  message = 'Upgrade to Premium to unlock this feature',
  hideInstead = false,
}) => {
  const { isPremium } = usePremiumStatus();
  const navigate = useNavigate();

  if (isPremium) {
    return <>{children}</>;
  }

  if (hideInstead) return null;

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Blurred content preview */}
      <Box sx={{ filter: 'blur(4px)', opacity: 0.4, pointerEvents: 'none' }}>
        {children}
      </Box>

      {/* Lock overlay */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.5,
          bgcolor: (t) =>
            t.palette.mode === 'dark'
              ? 'rgba(0,0,0,0.6)'
              : 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 1,
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            bgcolor: 'rgba(243,156,18,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LockIcon sx={{ color: '#F39C12', fontSize: 28 }} />
        </Box>
        <Typography
          variant="body2"
          fontWeight={700}
          textAlign="center"
          sx={{ maxWidth: 240, px: 2 }}
        >
          {message}
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<StarIcon />}
          onClick={() => navigate(ROUTES.LISTENER_SUBSCRIPTION)}
          sx={{
            bgcolor: '#F39C12',
            color: '#000',
            fontWeight: 700,
            borderRadius: 99,
            px: 3,
            '&:hover': { bgcolor: '#E67E22' },
          }}
        >
          Upgrade
        </Button>
      </Box>
    </Box>
  );
};

export default PremiumGate;
