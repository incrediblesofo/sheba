/**
 * Sheba Sound — Logo Component
 * -----------------------------
 * Inline SVG logo — no external file dependency.
 * Compact mode: horn + wave icon only (square).
 * Full mode: horn + wave icon + "SHEBASOUND" text.
 * Used in TopBar, Sidebar, and auth pages.
 */

import React from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';

interface LogoProps {
  compact?: boolean;
  sx?: SxProps<Theme>;
}

/** Inline SVG: the traditional Ethiopian horn with sound-wave bars above it */
const HornIcon: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 120 90"
    width={size}
    height={size * (90 / 120)}
    aria-hidden="true"
  >
    {/* ── Sound-wave bars (7 bars, tallest in centre) ── */}
    <g fill="none" stroke="#8B5E2A" strokeLinecap="round" strokeWidth="3.2">
      {/* left outer */}
      <line x1="52" y1="28" x2="52" y2="42" />
      {/* left mid */}
      <line x1="59" y1="22" x2="59" y2="42" />
      {/* left inner */}
      <line x1="66" y1="17" x2="66" y2="42" />
      {/* centre (tallest) */}
      <line x1="73" y1="13" x2="73" y2="42" />
      {/* right inner */}
      <line x1="80" y1="17" x2="80" y2="42" />
      {/* right mid */}
      <line x1="87" y1="22" x2="87" y2="42" />
      {/* right outer */}
      <line x1="94" y1="28" x2="94" y2="42" />
    </g>

    {/* ── Horn body (curved arc shape) ── */}
    {/* Main curved tube — dark brown */}
    <path
      d="M 8 58
         C 10 40, 30 35, 55 48
         C 70 55, 88 62, 105 50"
      fill="none"
      stroke="#3B1E08"
      strokeWidth="6.5"
      strokeLinecap="round"
    />
    {/* Horn bell (wide open end on right) */}
    <ellipse cx="107" cy="50" rx="7" ry="10"
      fill="#5C3310" stroke="#3B1E08" strokeWidth="1.5" />
    {/* Inner shadow of bell */}
    <ellipse cx="107" cy="50" rx="4" ry="7"
      fill="#2A0F02" />

    {/* Mouthpiece / narrow end on left */}
    <line x1="4" y1="60" x2="14" y2="56"
      stroke="#2A0F02" strokeWidth="4" strokeLinecap="round" />
    <circle cx="4" cy="60" r="2.5" fill="#2A0F02" />

    {/* Cork / grip wrapping bands */}
    <g stroke="#C48A3A" strokeWidth="2.2" strokeLinecap="round">
      <line x1="38" y1="52" x2="41" y2="47" />
      <line x1="43" y1="54" x2="46" y2="49" />
      <line x1="48" y1="56" x2="51" y2="51" />
    </g>

    {/* Subtle shadow arc under the horn */}
    <path
      d="M 30 68 Q 65 78 100 65"
      fill="none"
      stroke="#C48A3A"
      strokeWidth="1.8"
      strokeLinecap="round"
      opacity="0.6"
    />
  </svg>
);

const Logo: React.FC<LogoProps> = ({ compact = false, sx }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: compact ? 0 : 1,
      userSelect: 'none',
      cursor: 'pointer',
      textDecoration: 'none',
      '&:hover .logo-icon': {
        filter: 'brightness(1.08)',
        transform: 'scale(1.04)',
      },
      '& .logo-icon': {
        transition: 'filter 0.2s ease, transform 0.2s ease',
      },
      ...sx,
    }}
  >
    {compact ? (
      /* Compact: icon only in a small rounded square */
      <Box
        className="logo-icon"
        sx={{
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #F5ECD7 0%, #E8D5B0 100%)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
        }}
      >
        <HornIcon size={30} />
      </Box>
    ) : (
      /* Full: icon + word-mark */
      <Box
        className="logo-icon"
        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
      >
        {/* Icon badge */}
        <Box
          sx={{
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #F5ECD7 0%, #E8D5B0 100%)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.20)',
            flexShrink: 0,
          }}
        >
          <HornIcon size={36} />
        </Box>

        {/* Word-mark: English + Amharic stacked */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {/* English */}
          <Box
            component="span"
            sx={{
              fontFamily: '"Georgia", "Palatino Linotype", serif',
              fontWeight: 800,
              fontSize: '1.15rem',
              letterSpacing: '0.10em',
              color: (theme) =>
                theme.palette.mode === 'dark' ? '#FFFFFF' : '#3B1E08',
              lineHeight: 1,
              whiteSpace: 'nowrap',
              textShadow: (theme) =>
                theme.palette.mode === 'dark'
                  ? '0 1px 8px rgba(0,0,0,0.6)'
                  : 'none',
            }}
          >
            SHEBASOUND
          </Box>

          {/* Amharic subtitle */}
          <Box
            component="span"
            sx={{
              fontFamily: '"Noto Serif Ethiopic", "Abyssinica SIL", serif',
              fontWeight: 500,
              fontSize: '0.72rem',
              letterSpacing: '0.04em',
              color: (theme) =>
                theme.palette.mode === 'dark' ? '#E8A040' : '#8B5E2A',
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}
          >
            ሸባ ድምፆች
          </Box>
        </Box>
      </Box>
    )}
  </Box>
);

export default Logo;
