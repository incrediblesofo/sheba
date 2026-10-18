/**
 * Sheba Sound — Ad Banner Component
 * -----------------------------------
 * Displays promotional banners between content sections for free users.
 * Premium users never see this component.
 */

import React from 'react';
import { Box, Typography, Button, useTheme } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import { useNavigate } from 'react-router-dom';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { ROUTES } from '@/utils/constants';

const AD_VARIANTS = [
  {
    gradient: 'linear-gradient(135deg, #1a4a2e 0%, #0d2818 100%)',
    lightGradient: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
    icon: <StarIcon sx={{ fontSize: 32 }} />,
    title: 'Go Premium',
    subtitle: 'Ad-free music, offline downloads, and high-quality audio.',
    cta: 'Upgrade Now',
    accentColor: '#F39C12',
  },
  {
    gradient: 'linear-gradient(135deg, #2a1a3e 0%, #1a0d28 100%)',
    lightGradient: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
    icon: <HeadphonesIcon sx={{ fontSize: 32 }} />,
    title: 'Listen Without Limits',
    subtitle: 'No interruptions. Just pure Ethiopian music.',
    cta: 'Try Premium',
    accentColor: '#9B59B6',
  },
  {
    gradient: 'linear-gradient(135deg, #1a2a4a 0%, #0d1828 100%)',
    lightGradient: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
    icon: <MusicNoteIcon sx={{ fontSize: 32 }} />,
    title: 'Download & Go',
    subtitle: 'Save your favorite songs offline. Premium only.',
    cta: 'Get Premium',
    accentColor: '#5B9BD5',
  },
];

interface AdBannerProps {
  /** Which ad variant to show (cycles through 3 designs). */
  variant?: number;
}

const AdBanner: React.FC<AdBannerProps> = ({ variant = 0 }) => {
  const { isPremium, isLoading } = usePremiumStatus();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Don't render for premium users or while loading
  if (isPremium || isLoading) return null;

  const ad = AD_VARIANTS[variant % AD_VARIANTS.length];

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 2,
        background: isDark ? ad.gradient : ad.lightGradient,
        display: 'flex',
        alignItems: 'center',
        gap: 2.5,
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 24px ${isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.1)'}`,
        },
      }}
      onClick={() => navigate(ROUTES.LISTENER_SUBSCRIPTION)}
    >
      {/* Decorative circle */}
      <Box
        sx={{
          position: 'absolute',
          right: -20,
          top: -20,
          width: 120,
          height: 120,
          borderRadius: '50%',
          bgcolor: `${ad.accentColor}15`,
          pointerEvents: 'none',
        }}
      />

      {/* Ad label */}
      <Typography
        variant="caption"
        sx={{
          position: 'absolute',
          top: 8,
          right: 12,
          fontSize: '0.55rem',
          color: 'text.disabled',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        Ad
      </Typography>

      {/* Icon */}
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: 2,
          bgcolor: `${ad.accentColor}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: ad.accentColor,
          flexShrink: 0,
        }}
      >
        {ad.icon}
      </Box>

      {/* Text */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.3 }}>
          {ad.title}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
          {ad.subtitle}
        </Typography>
      </Box>

      {/* CTA */}
      <Button
        variant="contained"
        size="small"
        sx={{
          bgcolor: ad.accentColor,
          color: '#000',
          fontWeight: 700,
          borderRadius: 99,
          px: 2.5,
          whiteSpace: 'nowrap',
          flexShrink: 0,
          '&:hover': { bgcolor: ad.accentColor, opacity: 0.9 },
        }}
      >
        {ad.cta}
      </Button>
    </Box>
  );
};

export default AdBanner;
